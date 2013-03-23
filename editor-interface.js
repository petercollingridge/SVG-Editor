// Show the given window and hide the others
var loadWindow = function(item) {
    var windows = ["input", "optimise", "edit", "output"];
    
    for (var i in windows) {
        var window = windows[i];
        if (item == window) {
            $('#' + window + '-area').show();
            $('#toolbar-' + window).addClass('selected');
        } else {
            $('#' + window + '-area').hide();
            $('#toolbar-' + window).removeClass('selected');
        }
    }
    
    if (item === "output") {
        $('#output-svg-code').text(svg_tree.root.toString());
    }
}

// Show element in sub-SVG window and its code in code window
// Scroll to its position in the map
var selectElement = function(id) {
    var element = svg_tree.id_to_element[id];
    var elementOnMap = $('#map-' + id);

    // Write element code
    element.displayElementInfo();

    // Scroll to code in the map
    var scrollDiff = $('#svg-tree').scrollTop() - elementOnMap.position().top;
    $('#svg-tree').animate({ scrollTop: elementOnMap.position().top }, 'fast');
    
    // Highlight code on map
    $('.svg-element-div').removeClass('selected');
    elementOnMap.addClass('selected');
    
    // Display element and get its size
    var size = drawSVG("sub-svg", [element]);
    
    // Draw red box on main SVG image
    var highlight = document.getElementById("highlight-rect");
    highlight.setAttributeNS(null, "x", size.x - 1);
    highlight.setAttributeNS(null, "y", size.y - 1);
    highlight.setAttributeNS(null, "width", size.width + 2);
    highlight.setAttributeNS(null, "height", size.height + 2);
    highlight.setAttributeNS(null, "visibility", "visible");
    
    // Refresh SVG
    var $container = $('#full-svg');
    $container.html($container.html());
};

var removeHighlight = function(evt) {
    var highlight = document.getElementById("highlight-rect");
    highlight.setAttributeNS(null, "visibility", "hidden");
};

// What to do when code for an element is clicked
var handleCodeClick = function(evt) {
    // Prevent parent elements from becoming selected
    evt.stopPropagation();
    
    // Get id of element which will be prefixed by 'map-'
    var id = $(this).attr('id').slice(4);
    selectElement(id);
};

var loadSVG = function(svg_string) {
    svg_tree = new SVG_Tree(svg_string);
    //svg_tree.cleanStyles();
    //svg_tree.removeNamespaces(["inkscape", "sodipodi"]);
    svg_tree.createMap($('#svg-tree'));

    // Draw map
    $('.svg-element-div').hover(
        function(evt) {
            $('.svg-element-div').removeClass('highlight');
            $(this).addClass('highlight');
            evt.stopPropagation();
        },
        function(evt) {
            $(this).removeClass('highlight');
        }
    );

    $('.svg-element-div').click(handleCodeClick);
    
    drawSVG("full-svg", svg_tree.root.children);
    loadWindow("edit");
    
    // Add namespaces to optimise window
    var ns_div = $('#remove-namespaces')
    ns_div.empty();
    for (var ns in svg_tree.namespaces) {
        if (ns !== 'svg') {
            ns_div.append($('<input type="checkbox" class="remove-namespace" name="' + ns + '"/>' + ns +'<br/>'));
        }
    }
    $('.remove-namespace').change(function(evt) {
        svg_tree.namespaces[this.name] = !this.checked;
    });


    // Enable options
    $('.toolbar-item').addClass("enabled");
};

var getToolbarClickFunction = function(window) {
    return function(evt) {
        if ($('#toolbar-' + window).hasClass('enabled')) {
            loadWindow(window);
        }
    };
}

$(document).ready(function() {   
    $('#load-button').on('click', function(event) {
        loadSVG($('#input-svg').val());
    });
    
    $('#load-example-button').on('click', function(event) {
        loadSVG($('#scientist-example').html());
        $('#example-svg-attribution').show();
    });
    
    // Add toolbar buttons
    var windows = ["input", "optimise", "edit", "output"];
    for (var i in windows) {
        var window = windows[i];
        $('#toolbar-' + window).on('click', getToolbarClickFunction(window));
    }
    
    // Optimise options
    $('#decimal-places').change(function() {
        svg_tree.setDecimalPlaces($('#decimal-places').val());
    });
});