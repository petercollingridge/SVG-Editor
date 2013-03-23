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

var SVG_Element = function(element, tree, parents) {
    this.tree = tree;
    this.tag = element.nodeName;
    this.attributes = {};
    this.children = [];
    this.parents = parents;
    this.id;
    
    // Keep track of the number of each type of element
    if (!this.tree.element_counts[this.tag]) { this.tree.element_counts[this.tag] = 1; }
    else { this.tree.element_counts[this.tag]++; }
    this.count = this.tree.element_counts[this.tag];
    
    // Attributes
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
        while (this.tree.id_to_element['id' + n]) { n++; }
        this.id = 'id' + n;
    }
    this.tree.id_to_element[this.id] = this;
    
    // Parse path coordinates
    if (this.tag === "path") {
        var commands = parsePath(this.attributes.d);
        this.command_letters = commands[0];
        this.command_values = commands[1];
    }
    
    // Add children
    for (var i=0; i<element.childNodes.length; i++) {
        var child = element.childNodes[i];
        if (child.data === undefined || child.data.replace(/^\s*/, "") !== "") {
            var parent_of_children = this.parents.slice();
            parent_of_children.push(this);
            this.children.push(new SVG_Element(child, tree, parent_of_children));
        }
    }
    
    // Show information for element
    this.displayElementInfo = function() {
    
        // Create breadcrumbs
        var breadcrumbs = $('#breadcrumbs');
        breadcrumbs.empty();
        
        for (var i in this.parents) {
            breadcrumbs.append($('<span>' + this.parents[i].writeLabel() + '</span>'))
        }
        breadcrumbs.append($('<span class="selected">' + this.writeLabel() + '</span>'))
    
        var attributes_name_div = $('#element-attributes');
        attributes_name_div.empty();
        
        var attributes_title = $('<h3></h3>');
        attributes_name_div.append(attributes_title);
        
        var attribute_count = 0
        if (this.attributes) {
            var table = $('<table></table>');
            
            for (var attr in this.attributes){
                attribute_count++;
                var row = $('<tr></tr>');
                row.append($('<td>' + attr + '</td>'));
                var value = (this.tag === "path" && attr === "d") ? this.writePath(this.tree.dp_function) : this.tree.dp_function(this.attributes[attr]);
                row.append($('<td>' + value + '</td>'));
                table.append(row); 
            }   
            attributes_name_div.append(table);
        }
        
        attributes_title.text('Attributes (' + attribute_count + ')');
        
    };
    
    // Write a tag and its attributes
    this.writeTag = function() {
        var tag = '<' + this.tag;

        for (var attr in this.attributes) {
            if (attr.indexOf(':') !== -1 && this.tree.namespaces[attr.split(':')[0]] === false) {
                continue;
            }

            tag += ' ' + attr + '="';
            tag += (this.tag === "path" && attr === "d") ? this.writePath(this.tree.dp_function) : this.tree.dp_function(this.attributes[attr]);
            tag += '"';
        }

        tag += this.children.length === 0 ? '/>' : '>';
        return tag;
    };
    
    // Write element name and number (if > 1)
    this.writeLabel = function() {
        var label = this.tag;
        if (this.tree.element_counts[this.tag] > 1) { label += " " + this.count;}
        return label
    }
    
    this.writePath = function() {
        var coord_string = "";
        
        for (var i=0; i<this.command_letters.length; i++) {
            coord_string += this.command_letters[i];
            
            if (this.command_values[i]) {
                for (var j=0; j<this.command_values[i].length; j++) {
                    if (j > 0) coord_string += " ";
                    coord_string += this.tree.dp_function(this.command_values[i][j]);
                }
            }
        }
        return coord_string;
    };
    
    this.toString = function(depth) {
        var depth = depth | 0;
        var indent = new Array( depth + 1 ).join('  ');
        var str = indent + this.writeTag();
        
        if (this.children.length > 0) {
            str += '\n';
            $(this.children).each( function(i) {
                str += this.toString(depth + 1);
            });
            str += indent + '</' + this.tag + '>';
        }
        return str + '\n';
    };
    
    // For creating SVG images of the element
    this.toJQueryObject = function(parent) {
        var $element = $('<' + this.tag + '></' + this.tag + '>');
        $element.attr(this.attributes);
        $element.attr({'onmouseup': 'sendClickToParentDocument(evt)'})
        
        $(this.children).each( function(i) {
            $element.append(this.toJQueryObject($element));
        });
        
        parent.append($element);
    };
    
    // For creating the element map
    // Output by adding a div to the output and write children as nested divs
    this.createMap = function(output) {    
        var element_div = $('<div></div>');

        element_div.attr({id: "map-" + this.id});
        element_div.addClass("svg-element-div");
        output.append(element_div);        
        
        var label = this.writeLabel();
        
        if (this.children.length === 0) {
            element_div.text(label);
        } else {
            // Add start tag as separate div
            element_div.append($('<div></div>').text(label));
            
            // Create div for child elements
            var child_elements = $('<div></div>').addClass("svg-child-element");
            $(this.children).each( function(i) {
                this.createMap(child_elements);
            });
            element_div.append(child_elements);
        }
    };
    
    this.cleanStyles = function() {
        if (this.attributes.style) {
            new_styles = parseStyle(this.attributes.style, this.tree.dp_function);
            delete this.attributes.style;
            for (var style in new_styles) {
                this.attributes[style] = new_styles[style];
            }
        }
        for (var child in this.children) {
            this.children[child].cleanStyles();
        }
    };

};

// Wrapper for tree of elements within the SVG
var SVG_Tree = function(svg_string) {
    svg_string = svg_string.replace(/^[\s\n]*/, "");
    var svg_doc = $.parseXML( svg_string );
    this.tree = $(svg_doc).children()[0];
    
    this.id_to_element = {};
    this.element_counts = {};
    this.namespaces = {};
    this.root = new SVG_Element(this.tree, this, []);
    
    this.findNamespaces = function() {
        for (attr in this.root.attributes) {
            if (attr.slice(0,6) === 'xmlns:') {
                var ns = attr.split(':')[1];
                this.namespaces[ns] = true;
            }
        }
    };
    this.findNamespaces();

    this.setDecimalPlaces = function(decimal_places) {
        if (!isNaN(parseInt(decimal_places))) {
            var scale = Math.pow(10, decimal_places);
            this.dp_function = function(x) {
                if (isNaN(parseFloat(x))) {
                    return x; 
                } else {
                    return "" + Math.round(parseFloat(x) * scale) / scale;
                }
            };
        } else {
            this.dp_function = function(x) { return x; };
        }
    };
    
    this.setDecimalPlaces('null');
    
    this.cleanStyles = function() {
        this.root.cleanStyles();
    };
    
    this.removeNamespaces = function(namespaces) {
        this.root.removeNamespaces(namespaces);
    };
    
    this.createMap = function(output) {
        output.empty();
        this.root.createMap(output);
    };
};

var svg_tree;

// Render the elements of an SVG in the named container
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