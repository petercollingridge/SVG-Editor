var defaultStyles = {
    "display": "inline",
    "visibility": "visible",
    "opacity": "1",
    "fill": "#000000",
    "fill-opacity": "1",
    "stroke": "none",
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
    
    var digit_strings = digit_string.split(/[\s,]+/);
    var digits = [];
    
    for (var i=0 in digit_strings) {
        if (digit_strings[i]) {
            digits.push(parseFloat(digit_strings[i]));
        }
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

var SVG_Element = function(element, element_list) {
    this.tag = element.nodeName;
    element_list.push(this.tag);
    
    // Attributes
    this.attributes = {};
    if (element.attributes) {
        for (var i=0; i<element.attributes.length; i++){
            var attr = element.attributes.item(i);
            this.attributes[attr.nodeName] = attr.nodeValue;
        }
    }
    
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
            this.children.push(new SVG_Element(child, element_list));
        }
    }
    
    this.writeTag = function(writeAttributes, dp_function) {
        // Write a tag and its attributes
        
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
    
    this.nestedOutput = function(output, dp_function) {
        // Output by adding a div to the output and write children as nested divs
        
        var element_string = this.writeTag(true, dp_function);
        var element_div = $('<div></div>');
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
};

var SVG_Tree = function(svg_string) {
    svg_string = svg_string.replace(/^[\s\n]*/, "");
    var svg_doc = $.parseXML( svg_string );
    this.tree = $(svg_doc).children()[0];
    
    this.elements = [];
    this.root = new SVG_Element(this.tree, this.elements);
    
    this.setDecimalPlaces = function (decimal_places) {
        this.dp_function = setDecimalPlaceFunction(decimal_places);
    }
    this.setDecimalPlaces(1);
    
    this.cleanStyles = function() {
        this.root.cleanStyles(this.dp_function);
    };
    
    this.nestedOutput = function(output) {
        this.root.nestedOutput(output, this.dp_function);
    };
    
};

var svg_obj;

var writeElement = function(element) {
    var children = element.children();

    if (children.length === 0) {
        return element.html().replace("&lt;", "<").replace("&gt;", ">");
    } else {
        var str = ""
        for (var i=0; i<children.length; i++) {
            str += writeElement($(children[i]));
        }
        return str;
    }
}

var displayElementAsSVG = function(evt) {
    // Write element and its children in a scaled SVG

    evt.stopPropagation();
    var svg = $('#example-svg');
    var width = svg.css('width').slice(0, -2);
    var height = svg.css('height').slice(0, -2);
    var boxes = 7
    var bx = width / boxes;
    var by = height / boxes;

    var str = '<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.0" width="' + width + '" height="' + height + '">';

    for (var x=0; x<boxes; x++) {
        for (var y=0; y<boxes; y++) {
            if ((x + y) % 2) {
                str += '<rect x="' + (x * bx) + '" y="' + (y * by) + '" width="' + bx + '" height="' + by + '" fill="#bbb" />'
            }
        }        
    }

    str += '<g id="example">';
    str += writeElement($(this));
    str += '</g>';
    str += '<script type="text/ecmascript"><![CDATA['
    str += 'var eg = document.getElementById("example");'
    str += 'var size = eg.getBBox();'
    str += 'var scale, dx, dy;'
    str += 'if (size.width > size.height) { scale = ' + (width-10) + ' / size.width; dx = -size.x; dy = -size.y + 0.5 * (size.width - size.height); }'
    str += 'else { scale = ' + (height-10) + ' / size.height; dx = -size.x + 0.5 * (size.height - size.width); dy = -size.y; }'
    str += 'var transform = "translate(5 5) scale(" + scale + ") translate(" + dx + " " + dy + ")";'
    str += 'eg.setAttributeNS(null, "transform", transform);'
    str += ']]></script>'
    str += '</svg>';

    svg.html(str);
};

var loadSVG = function() {
    svg_tree = new SVG_Tree($("#input-svg").val());
    svg_tree.cleanStyles();
    //svg_tree.setDecimalPlaces(2);
    svg_tree.nestedOutput($('#output-svg'));

    $('.svg-element-div').hover(function(evt) {
                                    $('.svg-element-div').removeClass('highlight');
                                    $(this).addClass('highlight');
                                    evt.stopPropagation();
                                },
                                function(evt) {
                                    $(this).removeClass('highlight');
                                });

    $('.svg-element-div').click(displayElementAsSVG);
};

$(document).ready(function() {
    $("#load-button").on("click", function(event) {
        loadSVG();
        $('#input-area').hide();
        $('#output-area').show();
    });
});