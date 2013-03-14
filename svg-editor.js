var defaultStyles = {
    "display": "inline",
    "visibility": "visible",  // Should remove hidden elements or those with opacity 0
    "opacity": "1",
    "fill": "#000000",      // or black or #000
    "fill-opacity": "1",
    "marker": "none",
    "marker-start": "none",
    "marker-mid": "none",
    "marker-end": "none",
    "stroke": "none",       // or 0
    "stroke-width": "1",
    "stroke-opacity": "1",
    "stroke-miterlimit": "4",
    "stroke-linecap": "butt",
    "stroke-linejoin": "miter",
    "stroke-dasharray": "none",
    "stroke-dashoffset": "0",
    "font-anchor": "start",
    "font-style": "normal",
    "font-weight": "normal",
    "font-stretch": "normal",
    "font-variant": "normal"
};

var setDecimalPlaceFunction = function(decimal_places) {
    var scale = Math.pow(10, decimal_places);
    return function(x) {
        if (isNaN(parseFloat(x))) {
            return x; 
        } else {
            return "" + Math.round(parseFloat(x) * scale) / scale;
        }
    };
};

var parseStyle = function(style_string, dp_function) {
    old_styles = style_string.split(/\s*;\s*/);
    new_styles = {};
    
    for (var s in old_styles) {
        var attr = old_styles[s].split(/\s*:\s*/);
        var defaultStyle = defaultStyles[attr[0]]
        
        // Round numerical values to given number of decimal places
        if (defaultStyle !== undefined) {
            attr[1] = dp_function(attr[1]);
            defaultStyle = dp_function(defaultStyle);
        }
        
        // Only add values that are not the default after rounding
        if (attr[1] !== defaultStyle) {
            new_styles[attr[0]] = attr[1];
        }
        
        // TODO
        // If stroke or fill === none or opacity === 0,
        // then remove all other stroke/fill styles
    }
    
    return new_styles;
}

var extractDigits = function(digit_string) {
    //Convert a string of digits to an array of floats
    
    if (!digit_string) {return;}
    
    var re_digits = /([-+]?[\d\.]+)([eE][-+]?[\d\.]+)?/g;
    var digits = [];
    
    while(digit = re_digits.exec(digit_string)){
        digits.push(parseFloat(digit));
    }
    return digits;
};

var parsePath = function(coord_string) {
    // Split a string from a path "d" attribute into a list of letters and values

    var re_commands = /([ACHLMQSTVZ])([-\+\d\.\s,e]*)/gi
    var command_letters = [];
    var command_values = [];

    while(commands = re_commands.exec(coord_string)){
        command_letters.push(commands[1]);
        command_values.push(extractDigits(commands[2]));
    }

    return [command_letters, command_values];
}

var SVG_Element = function(element, element_hash) {
    this.tag = element.nodeName;
    
    // Attributes
    this.attributes = {};
    this.id;
    
    if (element.attributes) {
        for (var i=0; i<element.attributes.length; i++){
            var attr = element.attributes.item(i);
            this.attributes[attr.nodeName] = attr.nodeValue;
        }
        this.id = this.attributes.id;
    }
    
    // If no id, then generatate a new one for look-up
    if (!this.id) {
        var n = 0;
        while (element_hash['id' + n]) { n++; }
        this.id = 'id' + n;
    }
    element_hash[this.id] = this;
    
    // Parse path coordinates
    if (this.tag === "path") {
        var commands = parsePath(this.attributes.d);
        this.command_letters = commands[0];
        this.command_values = commands[1];
    }
    
    // Add children
    this.children = [];
    for (var i=0; i<element.childNodes.length; i++) {
        var child = element.childNodes[i];
        if (child.data === undefined || child.data.replace(/^\s*/, "") !== "") {
            this.children.push(new SVG_Element(child, element_hash));
        }
    }
    
    // Write a tag and its attributes
    this.writeTag = function(writeAttributes, dp_function) {        
        var tag = '<' + this.tag;
        
        if (writeAttributes) {
            for (var attr in this.attributes){
                tag += ' ' + attr + '="';
                tag += this.tag === "path" && attr === "d" ? this.writePath(dp_function) : dp_function(this.attributes[attr]);
                tag += '"';
            }
        }
        tag += this.children.length === 0 ? '/>' : '>';
        return tag;
    };
    
    this.writePath = function(dp_function) {
        var coord_string = "";
        
        for (var i=0; i<this.command_letters.length; i++) {
            coord_string += this.command_letters[i];
            
            if (this.command_values[i]) {
                for (var j=0; j<this.command_values[i].length; j++) {
                    if (j > 0) coord_string += " ";
                    coord_string += dp_function(this.command_values[i][j]);
                }
            }
        }
        return coord_string;
    };
    
    this.toString = function(dp_function) {
        var str = '\n' + this.writeTag(true, dp_function);
        
        $(this.children).each( function(i) {
            str += this.toString(dp_function);
        });
        
        if (this.children.length !== 0) { str += "\n</" + this.tag + ">"; }
        return str;
    };
    
    this.toJQueryObject = function(parent) {
        var $element = $('<' + this.tag + '></' + this.tag + '>');
        parent.append($element);
        $element.attr(this.attributes);
        
        $(this.children).each( function(i) {
            $element.append(this.toJQueryObject($element));
        });
    }
    
    this.nestedOutput = function(output, dp_function) {
        // Output by adding a div to the output and write children as nested divs
        
        var element_string = this.writeTag(false, dp_function);
        var element_div = $('<div></div>');
        element_div.attr({id: this.id});
        element_div.addClass("svg-element-div");
        output.append(element_div);        
        
        if (this.children.length === 0) {
            element_div.text(element_string);
        } else {
            // Add start tag as separate div
            element_div.append($('<div></div>').text(element_string));
            
            // Create div for child elements
            var child_elements = $('<div></div>').addClass("svg-child-element");
            $(this.children).each( function(i) {
                this.nestedOutput(child_elements, dp_function);
            });
            element_div.append(child_elements);
            
            // Add end tag as separate div
            element_div.append($('<div></div>').text("</" + this.tag + ">"));
        }
    };
    
    this.cleanStyles = function(dp_function) {
        if (this.attributes.style) {
            new_styles = parseStyle(this.attributes.style, dp_function);
            delete this.attributes.style;
            for (var style in new_styles) {
                this.attributes[style] = new_styles[style];
            }
        }
        for (var child in this.children) {
            this.children[child].cleanStyles(dp_function);
        }
    }
    
    this.removeNamespaces = function(namespaces) {
        for (ns in namespaces) {
            for (attr in this.attributes) {
                var attr_split = attr.split(':');
                if (attr_split.length === 2 && attr_split[0] === namespaces[ns]) {
                    delete this.attributes[attr];
                }
            }
        }
        
        for (var child in this.children) {
            this.children[child].removeNamespaces(namespaces);
        }
    };
};

var SVG_Tree = function(svg_string) {
    // Wrapper for tree of elements within the SVG
    svg_string = svg_string.replace(/^[\s\n]*/, "");
    var svg_doc = $.parseXML( svg_string );
    this.tree = $(svg_doc).children()[0];
    
    this.elements = {};
    this.root = new SVG_Element(this.tree, this.elements);
    
    this.setDecimalPlaces = function (decimal_places) {
        this.dp_function = setDecimalPlaceFunction(decimal_places);
    }
    this.setDecimalPlaces(1);
    
    this.cleanStyles = function() {
        this.root.cleanStyles(this.dp_function);
    };
    
    this.removeNamespaces = function(namespaces) {
        this.root.removeNamespaces(namespaces);
    };
    
    this.nestedOutput = function(output) {
        this.root.nestedOutput(output, this.dp_function);
    };
    
};

var svg_tree;

var removeHighlight = function(evt) {
    console.log("A");
    var highlight = document.getElementById("highlight-rect");
    highlight.setAttributeNS(null, "visibility", "hidden");
};

var handleCodeClick = function(evt) {
    evt.stopPropagation();
    var id = $(this).attr('id');
    var element = svg_tree.elements[id];
    var size = drawSVG("sub-svg", [element]);
    
    var highlight = document.getElementById("highlight-rect");
    highlight.setAttributeNS(null, "x", size.x);
    highlight.setAttributeNS(null, "y", size.y);
    highlight.setAttributeNS(null, "width", size.width);
    highlight.setAttributeNS(null, "height", size.height);
    highlight.setAttributeNS(null, "visibility", "visible");
    
    /*
    var $highlight = $('<rect />');
    $highlight.attr({x: size.x,
                     y: size.y,
                     width: size.width, 
                     height: size.height,
                     fill: "none",
                     "stroke-width": 4,
                     stroke: '#f00'});
    console.log($highlight[0].outerHTML);
    $('#full-svg-wrapper').append($highlight[0].outerHTML);
    */
    
    var $container = $('#full-svg');
    $container.html($container.html());
};

var drawSVG = function(container, elements) {
    var container_id = "#" + container;
    var $container = $(container_id);
    var $svg_wrapper = $(container_id + "-wrapper");
    var width = $container.css('width').slice(0, -2);
    
    $svg_wrapper.empty();
    $(elements).each( function(i) {
        this.toJQueryObject($svg_wrapper);
    });
    
    // Hack to reload the SVG
    $container.html($container.html());
    
    var resize = function() {
        var size = $(container_id + "-wrapper")[0].getBBox();
        if (size.width > 0) {
            var scale, dx, dy;
            if (size.width > size.height) {
                scale = (width - 10) / size.width;
                dx = -size.x;
                dy = -size.y + 0.5 * (size.width - size.height);
            } else {
                scale = (width - 10) / size.height;
                dx = -size.x + 0.5 * (size.height - size.width);
                dy = -size.y;
            }
            var transform = "translate(5 5) scale(" + scale + ") translate(" + dx + " " + dy + ")";
            document.getElementById(container + "-transform").setAttributeNS(null, "transform", transform);
        }
    };
    
    // Need to wait a bit to ensure elements drawn
    var size = window.setTimeout(resize, 100);
    //$(window).ready(resize);
    return $(container_id + "-wrapper")[0].getBBox();;
};

var loadSVG = function(svg_string) {
    svg_tree = new SVG_Tree(svg_string);
    svg_tree.cleanStyles();
    svg_tree.removeNamespaces(["inkscape", "sodipodi"]);
    //svg_tree.setDecimalPlaces(2);
    svg_tree.nestedOutput($('#output-svg-tree'));

    $('.svg-element-div').hover(function(evt) {
                                    $('.svg-element-div').removeClass('highlight');
                                    $(this).addClass('highlight');
                                    evt.stopPropagation();
                                },
                                function(evt) {
                                    $(this).removeClass('highlight');
                                });

    $('.svg-element-div').click(handleCodeClick);
    
    drawSVG("full-svg", svg_tree.root.children);
};

$(document).ready(function() {
    $('#scientist-example').hide();
    
    $('#load-button').on('click', function(event) {
        loadSVG($('#input-svg').val());
        $('#input-area').hide();
        $('#output-area').show();
    });
    
    $('#load-example-button').on('click', function(event) {
        loadSVG($('#scientist-example').html());
        $('#input-area').hide();
        $('#example-svg-attribution').show();
        $('#output-area').show();
    });
    
    $('#full-svg').click(removeHighlight);
    
});