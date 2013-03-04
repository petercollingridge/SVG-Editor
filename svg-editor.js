var SVG_Element = function(tag, attributes, data, children) {

};

var SVG_Tree = function(svg_string) {
    svg_string = svg_string.replace(/^[\s\n]*/, "");
    var svg_doc = $.parseXML( svg_string );
    this.tree = $(svg_doc).children()[0];
};

var svg_obj;

var outputElement = function(output, element) {
    var tag_name = element.nodeName;
    var element_string = "<" + tag_name;
    
    if (element.attributes) {
        for (var i=0; i<element.attributes.length; i++){
            var attr = element.attributes.item(i)
            element_string += ' ' + attr.nodeName;
            element_string += '="' + attr.nodeValue + '"';
        }
    }
    
    var children = [];
    // Remove any children which are just text containing whitespace
    for (var i=0; i<element.childNodes.length; i++) {
        var child = element.childNodes[i];
        if (child.data === undefined || child.data.replace(/^\s*/, "") !== "") {
            children.push(child);
        }
    }
    
    var element_div = $('<div></div>');
    element_div.addClass("svg-element-div");
    output.append(element_div);

    if (children.length === 0) {
        element_div.text(element_string + "/>");
    } else {
        // Add start tag as separate div
        element_div.append($('<div></div>').text(element_string + ">"));

        // Create div for child elements
        var child_elements = $('<div></div>').addClass("svg-child-element");
        $(children).each( function(i) {
            outputElement(child_elements, this);
        });
        element_div.append(child_elements);
        
        // Add end tag as separate div
        element_div.append($('<div></div>').text("</" + tag_name + ">"));
    }
};

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

var displayElement = function(evt) {
    // Write element and its children in a scaled SVG

    evt.stopPropagation();
    var svg = $('#example-svg');
    var width = svg.css('width').slice(0, -2);
    var height = svg.css('height').slice(0, -2);

    var str = '<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.0" width="' + width + '" height="' + height + '">';
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
    outputElement($('#output-svg'), svg_tree.tree);

    $('.svg-element-div').hover(function(evt) {
                                    $('.svg-element-div').removeClass('highlight');
                                    $(this).addClass('highlight');
                                    evt.stopPropagation();
                                },
                                function(evt) {
                                    $(this).removeClass('highlight');
                                });

    $('.svg-element-div').click(displayElement);
};

$(document).ready(function() {
    $("#load-button").on("click", function(event) {
        loadSVG();
        $('#input-area').hide();
        $('#output-area').show();
    });
});