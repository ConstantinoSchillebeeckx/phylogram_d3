/*

    Helper utilities; supports tidy code organization

*/



/* Primary tree building function


/* Ensure leaf nodes are not overlapping

Finds the smallest vertical distance between leaves
and scales things to a minimum distance so that
branches don't overlap

Parameters:
===========
- nodes : d3.tree nodes
- minSeparation : int (default: 22)
                  mininum distance between leaf nodes

Returns:
========
- xscale : d3.scale
           scale for leaf height separation; given the
           svg height, it will scale properly so leaf
           nodes have minimum separation
*/
function scaleLeafSeparation(nodes, minSeparation=22) {

    var traverseTree = function(root, callback) {
        callback(root);
        if (root.children) {
            for (var i = root.children.length - 1; i >= 0; i--){
                traverseTree(root.children[i], callback)
            };
        }
    }

    // get all leaf X positions
    leafXpos = [];
    traverseTree(nodes[0], function(node) {
        if (!node.children) {
            leafXpos.push(node.x);
        }
    });

    // calculate leaf vertical distances
    leafXdist = [];
    leafXpos = leafXpos.sort(function(a, b) { return a-b });
    leafXpos.forEach( function(x,i) {
        if (i + 1 != leafXpos.length) {
            var dist = leafXpos[i + 1] - x;
            if (dist) {
                leafXdist.push(dist);
            }
        }
    })

    var xScale = d3.scaleLinear()
        .range([0, minSeparation])
        .domain([0, d3.min(leafXdist)])

    traverseTree(nodes[0], function(node) {
        node.x = xScale(node.x)
    })

    return xScale;
}


/* Scale tree width

Parameters:
===========
- nodes : d3.tree nodes
- width : int
          svg width

Returns:
========
- yscale : d3.scale
           horizontal scale for svg
*/
function scaleBranchLengths(nodes, width) {

    // Visit all nodes and adjust y pos width distance metric
    var visitPreOrder = function(root, callback) {
        callback(root)
        if (root.children) {
            for (var i = root.children.length - 1; i >= 0; i--){
                visitPreOrder(root.children[i], callback)
            };
        }
    }
    visitPreOrder(nodes[0], function(node) {
        node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length || 0)
    })
    var rootDists = nodes.map(function(n) { return n.rootDist; });

    var yscale = d3.scaleLinear()
        .domain([0, d3.max(rootDists)])
        .range([0, width]);

    visitPreOrder(nodes[0], function(node) {
        node.y = yscale(node.rootDist)
    })
    return yscale
}



/* Format links (branches) of tree

Will render the lines connecting nodes (links)
with right angle elbows.

Parameters:
===========
- svg : svg selctor
        svg HTML element into which to render
- nodes : d3.tree.nodes
- tree : d3.layout.tree()

Returns:
========
- nothing

*/
function formatLinks(svg, links) {

    var link = svg.selectAll("path.link")
          .data(links)
        .enter().append("path")
          .attr("class", "link")
          .attr("d", elbow);

    // http://bl.ocks.org/mbostock/2966094
    // draw right angle links to join nodes
    function elbow(d, i) {
      return "M" + d.source.y + "," + d.source.x
           + "H" + d.target.y + "V" + d.target.x
           + (d.target.children ? "" : "h" + margin.right);
    }
}



/* Add labels (name, distance) to tree

Parameters:
===========
- svg : svg selection
        SVG containing tree
- options : obj
            tree options, must have skipLabels=True 
            to hide labels, otherwise they will be
            drawn.
*/
function formatLabels(svg, options) {

    if (!options.skipLabels) {
        svg.selectAll('g.inner.node')
            .append("svg:text")
                .attr("dx", -6)
                .attr("dy", -6)
                .attr("text-anchor", 'end')
                .text(function(d) { return d.length; });

        svg.selectAll('g.leaf.node').append("svg:text")
            .attr("dx", 8)
            .attr("dy", 3)
            .attr("text-anchor", "start")
            .text(function(d) { return d.name + ' ('+d.length+')'; });
    }
}





/* Render and format tree nodes

Will render all tree nodes as well as format them
with color, shape, size; additionally all leaf
nodes and internal nodes will get labels by default.

Parameters:
===========
- svg : svg selctor
        svg HTML element into which to render
- nodes : d3.tree.nodes

Returns:
========
- nothing

*/
function formatNodes(svg, nodes, leafRadius=4.5) {

    var node = svg.selectAll("g.node")
          .data(nodes)
        .enter().append("g")
            .attr("class", function(n) {
                if (n.children) {
                    if (n.depth == 0) {
                        return "root node"
                    } else {
                        return "inner node"
                    }
                } else {
                    return "leaf node"
                }
            })
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
            //.on('mouseover', tip.show) TODO
            //.on('mouseout', tip.hide) TODO

    svg.selectAll('g.leaf.node')
        .append("svg:rect") // leaf background
            .attr('width', 0 ) // width is set when choosing background color
            .attr('height', 10 + leafRadius * 2) // +2 for stroke
            .attr('y', -leafRadius - 5);

    // replace . for ease of selecting when setting width of leaf background
    svg.selectAll('g.leaf.node')
        .attr("id", function(d) { return 'leaf_' + d.name.replace('.','_'); })
        .append("svg:circle")
            .attr("r", leafRadius)

    svg.selectAll('g.root.node')
        .append('svg:circle')
            .attr("r", leafRadius)
}




/* Master format tree function

Parameters:
===========
- svg : svg selctor
        svg HTML element into which to render
- nodes : d3 tree nodes
- links : d3 tree links
- yscale : quantitative scale
           horizontal scaling factor for distance
- xscale : quantitative scale
           vertical scale
- height : int
           height of svg
- options : obj
            tree options, see documentation for keys

*/
function formatTree(svg, nodes, links, yscale, xscale, height, options) {
    formatRuler(svg, yscale, xscale, height, options, function() {
        formatLinks(svg, links);
        formatNodes(svg, nodes);
        formatLabels(svg, options);
    });
}




/* Render and format background rules

Parameters:
===========
- svg : svg selctor
        svg HTML element into which to render
- yscale : quantitative scale
           horizontal scaling factor for distance
- xscale : quantitative scale
           vertical scale
- height : int
           height of svg
- options : obj
            tree options, expects a key hideRuler;
            if true, rules won't be drawn
- callback : callback function
             ruler should be formatted first so that
             all other SVG elements lay on top of it
Returns:
========
- nothing

*/
function formatRuler(svg, yscale, xscale, height, options, callback) {

    if (!options.hideRuler) {
        svg.selectAll('line.rule')
                .data(yscale.ticks(10))
            .enter().append('svg:line')
                .attr("class", "rule")
                .attr('y1', 0)
                .attr('y2', xscale(height))
                .attr('x1', yscale)
                .attr('x2', yscale)

        svg.selectAll("text.rule")
                .data(yscale.ticks(10))
            .enter().append("svg:text")
                .attr("class", "rule")
                .attr("x", yscale)
                .attr("y", 0)
                .attr("dy", -3)
                .attr("text-anchor", "middle")
                .text(function(d) { return Math.round(d*100) / 100; });
    }

    callback();
}


/* Display error message

Will display an error messages within
a bootstrap3 alert div with a message

Parameters:
==========
- msg : string
        message to display within div, formatted as html
- div : div
        div into which to render message

Returns:
=======
- nothing

*/
function displayErrMsg(msg, div) {

    showSpinner(null, false);

    d3.select(div).append('div')
        .attr('class','alert alert-danger lead col-sm-4 col-sm-offset-4')
        .style('margin-top','20px')
        .attr('role','alert')
        .html(msg);
}



/* When called, will display a div with a spinner

Parameters:
==========
- div : string
        div id (with included #) in which to generated tree
- show : bool (default true)
         optional boolean to show div, when false the spinner
         will be removed
*/

function showSpinner(div, show=true) {

    if (!show) {
        d3.select('#spinner').remove();
    } else {

        // give user a spinner for feedback
        var spinner = d3.select(div).append('div')
            .attr('id','spinner')
            .attr('class','lead alert alert-info col-sm-3 col-sm-offset-4')
            .style('margin-top','20px');

        spinner.append('i')
            .attr('class','fa fa-cog fa-spin fa-3x fa-fw')
        spinner.append('span')
            .text('Reading file...'); // TODO center vertically
    }
}




/* Parse Newick tree

Will process a Newick tree string into
a format that d3 can parse.

Parameters:
==========
- fileStr : str
            a Newick tree read in as a string

Returns:
- returns parsed Newick object
  see: https://github.com/jasondavies/newick.js

*/
function processNewick(fileStr) {

    var newick = Newick.parse(fileStr)
    var newickNodes = []
    function buildNewickNodes(node, callback) {
        newickNodes.push(node)
        if (node.branchset) {
            for (var i=0; i < node.branchset.length; i++) {
                buildNewickNodes(node.branchset[i])
            }
        }
    }

    return newick;
}








/* Process mapping file into useable format

Function responsible for parsing the TSV mapping
file which contains metadata for formatting the
tree as well as generating color scales
for use in the legend and coloring the tree.

Note that any QIIME formatted taxonomy data
found will automatically be cleaned up by removing
the family prefix and replacing ; with |

It is assumed that the first column in the mapping
file has the same values as the leaf names.

Parameters:
===========
- data: d3.tsv() parsed data
    input mapping file processed by d3.tsv; will be
    an array (where each row in the TSV is an array
    value) of objects where objects have col headers
    as keys and file values as values


Returns:
========
- array
    returns an array of length 2:
    0:  d3.map() of parsed TSV data with file column
        headers as the keys and the values are a d3.map()
        where leaf names are keys (TSV rows) and values
        are the row/column values in the file.
    1:  d3.map() as colorScales where keys are file
        column headers and values are the color scales.
        scales take as input the leaf name (file row)
*/
function parseMapping(data) {

    // get mapping file column headers
    // we assume first column is the leaf ID
    var colTSV = d3.map(data[0]).keys();
    var id = colTSV[0];
    colTSV.shift(); // remove first col (ID)


    var mapParse = d3.map(); // {colHeader: { ID1: val, ID2: val } }

    data.forEach(function(row) {
        var leafName = row[id];
        colTSV.forEach( function(col) {
            var colVal = row[col];
            if (!mapParse.has(col)) {
                var val = d3.map();
            } else {
                var val = mapParse.get(col);
            }
            val.set(leafName, colVal);
            mapParse.set(col, val);
        })
    })


    // setup color scales for mapping columns
    // keys are mapping column headers and values are scales
    // for converting column value to a color
    var colorScales = d3.map();
    mapParse.each(function(v,k) { // v is a d3.set of mapping column values, with leaf ID has key

        // check if values for mapping column are string or numbers
        // strings are turned into ordinal scales, numbers into quantitative
        // we simply check the first value in the obj
        var vals = autoSort(v.values(), true);
        var scale;
        if (typeof vals[0] === 'string' || vals[0] instanceof String) { // ordinal scale
            var tmp = d3.scaleOrdinal(d3.schemeCategory10);
            if (vals.length > 10) {
                tmp = d3.scaleOrdinal(d3.schemeCategory20);
            }
            scale = tmp.domain(vals);
        } else { // quantitative scale
            scale = d3.scaleQuantize()
                .domain(d3.extent(vals))
                .range(colorbrewer.Spectral[11]);
        }
        colorScales.set(k, scale);
    })

    return [mapParse, colorScales];
}









/* Clean-up a QIIME formatted taxa string

Will clean-up a QIIME formatted taxonomy string
by removing the class prefix and replacing the
semicolon with ' | '.  Function will check
if string is taxa data if it leads with 'k__',
otherwise it returns passed string.

Parameters:
===========
- taxa : string
    QIIME formatted string

Returns:
========
- cleaned string

*/
function cleanTaxa(taxa) {

    if ((typeof taxa === 'string' || taxa instanceof String) && taxa.slice(0, 2) == 'k_') {

        var str = taxa.replace(/.__/g, "");

        // some taxa strings end in ';' some don't,
        // remove it if it exists
        if (str.substr(str.length - 1) == ';') {
            str = str.substring(0, str.length - 1);
        }

        return str.split(";").join(" | ");

    } else {

        return taxa;

    }

}


/*

When called, will resize the SVG to fit the
inner group.

*/

function resizeSVG() {

    var g = d3.select('svg g').node().getBBox();
    d3.select('svg')
        .attr("width", g.width + margin.left + margin.right)
        .attr("height", g.height + margin.top + margin.bottom)
}







/* Generated front-end GUI controls

Build all the HTML elements that serve as GUI controls for
editing the tree format.

If a mapping file is provided, function will generate
dropdowns for the mapping file columns; one for leaf color
and one for leaf background.

Parameters:
==========
- selector : string
    div ID (with '#') into which to place GUI controls
- mapParse : d3 map obj (optioal)
    optional parsed mapping file; if present, two
    select dropdowns are generated with the columns
    of the file.  one dropdown is for coloring the
    leaf nodes, the other for the leaf backgrounds.
    The first index of the output of parseMapping()
    should be used here.
*/

function buildGUI(selector, mapParse=null) {

    var gui = d3.select(selector).append("div")
        .attr("id", "gui")
        .attr("class","row form-horizontal")
        .style("margin-top","20px");

    var col1 = gui.append("div")
        .attr("class","col-sm-2")

    var check1 = col1.append("div")
        .attr("class","checkbox")
        .append("label")
        
    check1.append("input")
        .attr("type","checkbox")
        .attr("id","toggle_distance")
        .attr("checked","")
        .attr("onclick","guiUpdate(this)")

    check1.append('text')
        .text("Toggle distance labels")

    var check2 = col1.append("div")
        .attr("class","checkbox")
        .append("label")
        
    check2.append("input")
        .attr("type","checkbox")
        .attr("id","toggle_leaf")
        .attr("checked","")
        .attr("onclick","guiUpdate(this)")

    check2.append('text')
        .text("Toggle leaf labels")

    // save button
    gui.append("button")
        .attr('class', 'btn btn-success')
        .on("click",saveSVG)
        .append('i')
        .attr('class','fa fa-floppy-o')
        .attr('title','Save image')

    // if mapping file was passed
    if (mapParse && !mapParse.empty()) {

        // select for leaf color
        var col2 = gui.append("div")
            .attr("class","col-sm-3 form-group")

        col2.append("label")
            .attr("class","col-sm-3 control-label")
            .text("Leaf node")
            
        var select1col = col2.append("div")
            .attr("class","col-sm-8")

        var select1 = select1col.append("select")
            .attr('onchange','guiUpdate(this)')
            .attr('id','leafColor')
            .attr("class","form-control")

        select1.selectAll("option")
            .data(mapParse.keys()).enter()
            .append("option")
            .attr('value',function(d) { return d; })
            .text(function(d) { return d; })

        select1.append("option")
            .attr("selected","")
            .attr("value","")
            .text('None');
        // select for leaf color


        // select for background color
        var col3 = gui.append("div")
            .attr("class","col-sm-3 form-group")

        col3.append("label")
            .attr("class","col-sm-4 control-label")
            .text("Leaf background")

        var select2col = col3.append("div")
            .attr("class", "col-sm-8")

        var select2 = select2col.append("select")
            .attr('onchange','guiUpdate(this)')
            .attr('id','backgroundColor')
            .attr("class","form-control") 

        select2.selectAll("option")
            .data(mapParse.keys()).enter()
            .append("option")
            .text(function(d) { return d; })

        select2.append("option")
            .attr("selected","")
            .attr("value","")
            .text('None');
        // select for background color
    }

}






/*  Automatically sort an array

Given an array of strings, were the string
could be a float (e.g. "1.2") or an int
(e.g. "5"), this function will convert the
array if all strings are ints or floats and
sort it (either alphabetically or numerically
ascending).

Parameters:
===========
- arr: array of strings
    an array of strings
- unique: bool
    default: false
    if true, only unique values will be returned

Returns:
- sorted, converted array, will be either
    all strings or all numbers

*/
function autoSort(arr, unique=false) {

    // get unique values of array
    // by converting to d3.set()
    if (unique) { arr = d3.set(arr).values(); }

    var vals = arr.map(filterTSVval); // convert to int or float if needed
    var sorted = (typeof vals[0] === 'string' || vals[0] instanceof String) ? vals.sort() : vals.sort(function(a,b) { return a - b; }).reverse();

    return sorted;

}










// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------




/* Function used to update existing tree

Function called from front-end everytime GUI
is changed; this will redraw the tree based
on GUI settings

Parameters:
==========
- skipDistances : bool
	option for skipDistances (don't draw distance values on tree)
- skipLabels : bool
	option for skipLabels (don't draw label on leaf)
- leafColor : string (optional)
    column in mapping file to use to color leaf node circle
- backgroundColor: string (optional)
    column in mapping file to use to color leaf node background

*/
function updateTree(skipDistanceLabel, skipLeafLabel, leafColor=null, backgroundColor=null) {

    tree = d3.select('svg');

    // toggle leaf labels
    tree.selectAll('g.leaf.node text')
        .style('fill-opacity', skipLeafLabel? 1e-6 : 1 )

    // toggle distance labels
    tree.selectAll('g.inner.node text')
        .style('fill-opacity', skipDistanceLabel? 1e-6 : 1 )

    tree.selectAll('g.leaf.node text')
        .text(function(d) { return skipDistanceLabel ? d.name : d.name + ' ('+d.length+')'; });

    // remove legend if one exists so we can update
    d3.select("#legendID").remove()

    // col for legend
    if (leafColor || backgroundColor) {

        var legend = d3.select("svg g").append("g")
            .attr("id", "legendID")
            .attr("transform","translate(" + d3.select("svg").node().getBBox().width + ",0)");

    }

    // update leaf color
    if (leafColor && leafColor != '') {
        var colorScale = colorScales.get(leafColor); // color scale
        var mapVals = mapParse.get(leafColor); // d3.map() obj with leaf name as key

        // fill out legend
        generateLegend(leafColor, mapVals, legend, colorScale, 'circle', 'translate(5,0)');

        // update node styling
        tree.selectAll('g.leaf.node circle')
            .style('fill', function(d) {
                return mapVals.get(d.name) ? colorScale(mapVals.get(d.name)) : 'greenYellow'
            })
            .style('stroke', function(d) {
                return mapVals.get(d.name) ? 'white' : 'yellowGreen'
            })
    } else if (leafColor == '') {
        tree.selectAll('g.leaf.node circle')
            .attr('style','null')
    }


    // update background color
    if (backgroundColor && backgroundColor != '') {
        var colorScale = colorScales.get(backgroundColor) // color scale
        var mapVals = mapParse.get(backgroundColor) // d3.map() obj with leaf name as key 


        // fill out legend
        var offset = 25;
        if (leafColor) {
            var offset = offset + 15 + d3.select('#legendID').node().getBBox().height
        }
        generateLegend(backgroundColor, mapVals, legend, colorScale, 'rect', 'translate(5,' + offset + ')');

        // update node background style
        tree.selectAll('g.leaf.node rect')
            .attr("width", function(d) { 
                var name = d.name.replace('.','_');
                var rectWidth = d3.select('#leaf_' + name + ' rect').node().getBBox().width;
                var gWidth;
                if (rectWidth > 0) { // remove extra that was added otherwise background width keeps growing
                    gWidth = d3.select('#leaf_' + name).node().getBBox().width - 5;
                } else {
                    gWidth = d3.select('#leaf_' + name).node().getBBox().width;
                }
                var radius = d3.select('#leaf_' + name + ' circle').node().getBBox().height / 2.0;
                return gWidth - radius + 5; // add extra so background is wider than label
            })
            .style('fill', function(d) {
                return mapVals.get(d.name) ? colorScale(mapVals.get(d.name)) : 'none'
            })
            .style('opacity',1)
    } else if (leafColor == '') {
        tree.selectAll('g.leaf.node rect')
            .attr('style','null')
    }

    resizeSVG();

}



/* Generate legend

Helper function for generating a legend,
given various inputs.  Legend consists of an overall
'g' group which contains a legend title as well as 
rows of legend elements.  Each row has the class
'legend' and is 'g' group comprised of a shape
and a text element.

Parameters:
===========
- title: string
    title for legend
- mapVals: obj
    d3.map() obj with leaf name as key
    and legend row value as value
- container: d3 selection
    selection into which to render legend,
    should be an SVG
- colorScale: d3 color scale
    color scale used with each item in 'sorted'
    generates either a circle or a rect with this
    color
- type: string
    type of colored object to render along with
    each item in 'sorted' either circle or rect
- transform: string
    transform string for outer 'g' group
*/
function generateLegend(title, mapVals, container, colorScale, type, transform) {

    // we need a unique list of values for the legend
    // as well as the count of those unique vals
    // they will sort alphabetically or descending if integer
    var counts = d3.map(); // {legend Row: counts}
    mapVals.values().forEach(function(d) {
        var count = 1
        if (counts.has(d)) {
            var count = counts.get(d) + count;
        }
        counts.set(d,count);
    });


    var legend = container.append("g")
            .attr("transform",transform)

    // if legend is to show an ordinal range, we represent it as a colorbar
    // this way we don't have a potentially gigantic legend
    // the length 11 is set by the colorbrewer scale
    var sorted = autoSort(counts.keys());
    var bar = false;
    var scale;
    if (!(typeof sorted[0] === 'string' || sorted[0] instanceof String)) {
        bar = true;

        scale = d3.scale.linear().domain([10,0]).range(d3.extent(sorted)); // map array of values into one of length 11
        colorScale.domain(range(0,11));
        sorted = range(0,11);
    }

    legend.append("text")
        .style("font-weight","bold")
        .text(type == "circle" ? "Node: " : "Background: ")
        .attr("class","lead")
    legend.append("text")
        .attr("class","lead")
        .attr("x",type == "circle" ? 70 : 140)
        .text(title);


    var legendRow = legend.selectAll('g.legend')
        .data(sorted).enter()
        .append('g')
            .attr('class', 'legend')
            .attr('transform', function(d,i) { return 'translate(5,' + (25 + i * 20) + ')'; } )
        
    if (type == 'circle' && bar === false) {
        legendRow.append(type)
            .attr('r', 4.5)
            .attr('fill', function(d) { return colorScale(d) } ) 
    } else if (type == 'rect' || bar === true) {
        legendRow.append('rect')
            .attr('width', bar ? 30 : 9)
            .attr('height', bar ? 20 : 9)
            .attr('x', bar ? 4 : -4.5)
            .attr('y', bar ? -11 : -4.5)
            .attr('fill', function(d) { return colorScale(d) } ) 
    }
        
    legendRow.append('text')
            .attr('dx', 8)
            .attr('dy', 3)
            .attr('text-anchor', 'start')
            .attr("fill", bar ? "white" : "black")
            .text(function(d) { 
                if (bar) {
                    return scale(d).toFixed(2);
                } else {
                    return '(' + counts.get(d) + ') ' + d; 
                }
            })
}


/* helper function to generate array of length

Will generate an array of specified length,
starting at specified value.

Parameters:
===========
- start : int
    starting value for return array
- len : int
    length of desired return array

Returns:
========
- array
    order array with min value 0 and max value n

*/

function range(start, len) {

    var arr = [];

    for (var i = start; i < (len + start); i++) {
        arr.push(i);
    }
    return arr;
}









/* Clean-up a QIIME formatted taxa string

Will clean-up a QIIME formatted taxonomy string
by removing the class prefix and replacing the
semicolon with ' | '.  Function will check
if string is taxa data if it leads with 'k__',
otherwise it returns passed string.

Parameters:
===========
- taxa : string
    QIIME formatted string

Returns:
========
- cleaned string

*/
function cleanTaxa(taxa) {

    if ((typeof taxa === 'string' || taxa instanceof String) && taxa.slice(0, 2) == 'k_') {

        var str = taxa.replace(/.__/g, "");

        // some taxa strings end in ';' some don't,
        // remove it if it exists
        if (str.substr(str.length - 1) == ';') {
            str = str.substring(0, str.length - 1);
        }

        return str.split(";").join(" | ");

    } else {
        
        return taxa;

    }

}







// helper function for filtering input TSV values
// will automatically detect if value is int, float or string and return
// it as such
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat
function filterTSVval(value) {
    if (/^(\-|\+)?([0-9]+(\.[0-9]+))$/.test(value)) { // if string
        return Number(value);
    } else if (/^\d+$/.test(value)) { // if int
        return parseInt(value);
    }
    return value;
}

/* Function for styling tooltip content

Parameters:
==========
- d : node attributes

- mapParse : d3 map obj (optional)
    optional parsed mapping file; keys are mapping file
    column headers, values are d3 map obj with key as
    node name and value as file value

Returns:
========
- formatted HTML with all node data

*/
function formatTooltip(d, mapParse=null) {
    var html = "<div class='tip-title'>Leaf <span class='tip-name'>" + d.name + "</span></div>";

    if (mapParse) {
        mapParse.keys().forEach(function(col) {
            html += '<p class="tip-row"><span class="tip-meta-title">- ' + col + '</span>: <span class="tip-meta-name">' + mapParse.get(col).get(d.name) + '</span><p>';
        })
    }

    return html;
}








// function called (from front-end GUI) every time
// GUI is updated by user
// calls updateTree() so that tree style can be updated
function guiUpdate() {

    // get checkbox state
    skipDistanceLabel = !$('#toggle_distance').is(':checked');
    skipLeafLabel = !$('#toggle_leaf').is(':checked');

    // get dropdown values
    var leafColor, backgroundColor;
    if (mappingFile) {
        var e = document.getElementById("leafColor");
        leafColor = e.options[e.selectedIndex].value;
        var e = document.getElementById("backgroundColor");
        backgroundColor = e.options[e.selectedIndex].value;
    }

    updateTree(skipDistanceLabel, skipLeafLabel, leafColor, backgroundColor);
}



// when called, will open a new tab with the SVG
// which can then be right-clicked and 'save as...'
function saveSVG(){

    // get styles from all required stylesheets
    // http://www.coffeegnome.net/converting-svg-to-png-with-canvg/
    var style = "\n";
    var requiredSheets = ['phylogram_d3.css', 'open_sans.css']; // list of required CSS
    for (var i=0; i<document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i];
        if (sheet.href) {
            var sheetName = sheet.href.split('/').pop();
            if (requiredSheets.indexOf(sheetName) != -1) {
                var rules = sheet.rules;
                if (rules) {
                    for (var j=0; j<rules.length; j++) {
                        style += (rules[j].cssText + '\n');
                    }
                }
            }
        }
    }

    var svg = d3.select("svg"),
        img = new Image(),
        serializer = new XMLSerializer(),
        width = svg.node().getBBox().width,
        height = svg.node().getBBox().height;

    // prepend style to svg
    svg.insert('defs',":first-child")
    d3.select("svg defs")
        .append('style')
        .attr('type','text/css')
        .html(style);


    // generate IMG in new tab
    var svgStr = serializer.serializeToString(svg.node());
    img.src = 'data:image/svg+xml;base64,'+window.btoa(unescape(encodeURIComponent(svgStr)));
    var tab = window.open()
    tab.document.write('<img src="' + img.src + '"/>');
    tab.document.title = 'phylogram d3';
};














