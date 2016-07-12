/*

    Helper utilities; supports tidy code organization

*/


/* Ensure leaf nodes are not overlapping

Finds the smallest vertical distance between leaves
and scales things to a minimum distance so that
branches don't overlap.

Note that this will update the node.x positions
for all nodes found in passed var 'nodes' as well
as update the global 'links' var.

Parameters:
===========
- tree : d3.tree layout (cluster) 
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
function scaleLeafSeparation(tree, nodes, minSeparation=22) {

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

    var xScale = d3.scale.linear()
        .range([0, minSeparation])
        .domain([0, d3.min(leafXdist)])

    // update node x pos & links
    traverseTree(nodes[0], function(node) {
        node.x = xScale(node.x)
    })
    links = tree.links(nodes);

    return xScale;
}


/* Scale tree by distance metric

Will iterate through tree and set the attribute
rootDist (at each node) and will adjust the
y-pos of the tree properly

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
function scaleBranchLengths(nodes) {

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

    var yscale = d3.scale.linear()
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
- links : d3.tree.links
- options : obj
            tree options, see documentation for keys

Returns:
========
- nothing

*/
function formatLinks(id, links, options) {

    // set to global!
    link = d3.select(id).selectAll("path.link")
      .data(links)
        .enter().append("path")
        .attr("class","link")
        .attr("d", function(d) {
            if (options.treeType == 'rectangular') {
                return elbow(d);
            } else if (options.treeType == 'radial') {
                return step(d.source.x, d.source.y, d.target.x, d.target.y);
            }
        })
}

// https://bl.ocks.org/mbostock/c034d66572fd6bd6815a
// Like d3.svg.diagonal.radial, but with square corners.
function step(startAngle, startRadius, endAngle, endRadius) {
  var c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI),
      s0 = Math.sin(startAngle),
      c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI),
      s1 = Math.sin(endAngle);
  return "M" + startRadius * c0 + "," + startRadius * s0
      + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
      + "L" + endRadius * c1 + "," + endRadius * s1;
}


// http://bl.ocks.org/mbostock/2429963
// draw right angle links to join nodes
function elbow(d, i) {
  return "M" + d.source.y + "," + d.source.x
      + "V" + d.target.x + "H" + d.target.y;
}





/* Render and format tree nodes

Will render all tree nodes as well as format them
with color, shape, size; additionally all leaf
nodes and internal nodes will get labels by default.

A node is a generalized group which can contain shapes
(circle) as well as labels (text).

Parameters:
===========
- svg : svg selctor
        svg HTML element into which to render
- nodes : d3.tree.nodes
- options : obj
            tree options, see documentation for keys

Returns:
========
- nothing

*/
function formatNodes(id, nodes, options) {

    // set default leaf radius if not present
    if (!('sliderLeafR' in options)) {
        options['sliderLeafR'] = 5;
    }

    node = d3.select(id).selectAll("g.node")
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
            .attr("id", function(d) {
                if (!d.children) {
                    var name = d.name.replace(new RegExp('\\.', 'g'), '_');
                    return 'leaf_' + name;
                }
            })
            .attr("transform", function(d) {
                if (options.treeType == 'rectangular') {
                    return "translate(" + d.y + "," + d.x + ")";
                } else if (options.treeType == 'radial') {
                    return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                }
            })
            .on('mouseover', tip.show) 
            .on('mouseout', tip.hide)

    // node backgrounds
    node.append("rect")
      .attr('width', 0 ) // width is set when choosing background color
      .attr('height', 10 + options.sliderLeafR * 2) 
      .attr('y', -options.sliderLeafR - 5)
      .attr("opacity", function(d) { return d.children ? 1e-6 : 1 });

    // node circles
    node.append("circle")
        .attr("r", options.sliderLeafR)
        .attr("opacity", function(d) { 
            if (!d.children || d.depth == 0) {
                return 1;
            } else {
                return 1e-6;
            }
        });

    // node label
    node.append("text")
        .attr("class",function(d) { return d.children ? "distanceLabel" : "leafLabel" })
        .attr("dx", function(d) { 
            if (d.children) { // if inner node
                return treeType == 'radial' && d.x > 180 ? 20 : -20;
            } else { // if leaf node
                return treeType == 'radial' && d.x > 180 ? (-5 - options.sliderLeafR) : (5 + options.sliderLeafR);
            }

        }) 
        .attr("dy", function(d) { return d.children ? -6 : 3 })
        .attr("text-anchor", function(d) { return treeType == 'radial' && d.x > 180 ? "end" : "start" })
        .attr("transform", function(d) { return treeType == 'radial' && d.x > 180 ? "rotate(180)" : "" }) 
        .text(function(d) { 
            if (d.children) {
                if (d.length && d.length.toFixed(2) > 0.01) {
                    return d.length.toFixed(2);
                } else {
                    return '';
                }
            } else {
                return d.name + ' ('+d.length+')';
            }
        })
        .attr("opacity", function(d) { return options.skipLabels ? 1e-6 : 1; });
   

}




/* Master format tree function

Parameters:
===========
- nodes : d3 tree nodes
- links : d3 tree links
- yscale : quantitative scale
           horizontal scaling factor for distance
           if null, ruler is not drawn
- xscale : quantitative scale
           vertical scale
           if null, ruler is not drawn
- height : int
           height of svg
- options : obj
            tree options, see documentation for keys

*/
function formatTree(nodes, links, yscale=null, xscale=null, height, options) {
    formatRuler('#rulerSVG', yscale, xscale, height, options);
    formatLinks('#treeSVG', links, options);
    formatNodes('#treeSVG', nodes, options);
}




/* Render and format background rules

Parameters:
===========
- id : id selector
       id (with #) into which to render ruler
- yscale : quantitative scale
           horizontal scaling factor for distance
- xscale : quantitative scale
           vertical scale
- height : int
           height of svg
- options : obj
            tree options, expects a key hideRuler;
            if true, rules won't be drawn. also
            expects a key treeType (rectangular/radial)

Returns:
========
- nothing

*/
function formatRuler(id, yscale, xscale, height, options) {

    if (!options.hideRuler && yscale != null) {

        if (options.treeType == 'rectangular') {

            rulerG = d3.select(id).selectAll("g")
                    .data(yscale.ticks(10))
                  .enter().append("g")
                    .attr("class", "ruleGroup")
                  .append('svg:line')
                    .attr("class", "rule")
                    .attr('y1', 0)
                    .attr('y2', xscale(height))
                    .attr('x1', yscale)
                    .attr('x2', yscale)
/*
            ruler = rulerG.selectAll('circle.rule')
                    .data(function(d) { console.log(yscale(d)); return [lineData(yscale(d))] })
                  .enter().append('path')
                    .attr("class","rule" )
                    .attr("d",lineFunction)
/*
            ruler.selectAll("text.rule")
                    .data(yscale.ticks(10))
                .enter().append("svg:text")
                    .attr("class", "rule")
                    .attr("x", yscale)
                    .attr("y", 0)
                    .attr("dy", -3)
                    .attr("text-anchor", "middle")
                    .text(function(d) { return Math.round(d*100) / 100; });
*/
        } else if (options.treeType == 'radial') {  

            rulerG = d3.select(id).selectAll("g")
                    .data(yscale.ticks(10))
                  .enter().append("g")
                    .attr("class", "ruleGroup")
                  .append('circle')
                    .attr("class","rule")
                    .attr('r', yscale);
/*
                  .enter().append("g")
                    .attr("class", "ruleGroup")
                  .append('circle')
                    .attr("class","rule")
                    .attr('r', yscale)
                    .attr("fill","none")
                    .attr("stroke","#ddd")
*/
/* temporarily disabled
            rulerG = d3.select(id).selectAll("g")
                    .data(yscale.ticks(10))
                  .enter().append("g")
                    .attr("class", "ruleGroup")
                    .attr("transform", function(d) { return "translate(" + -circleData(yscale(d))[0].x + "," + -yscale(d) + ")"; })
                    
            ruler = rulerG.selectAll('circle.rule')
                    .data(function(d) { return [circleData(yscale(d))] })
                  .enter().append('path')
                    .attr("class","rule" )
                    .attr("d",lineFunction)
*/
        }
    }
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
found will automatically be cleaned up removing
the level prefix and splitting the taxonomy on
each level into its own metadata category.  This
allows users to color by a specific taxonomic
level.

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

    taxaDat = {};
    data.forEach(function(row) {
        var leafName = row[id];
        colTSV.forEach( function(col, i) {
            var colVal = cleanTaxa(row[col]);
            if (!mapParse.has(col)) {
                var val = d3.map();
            } else {
                var val = mapParse.get(col);
            }

            if (typeof colVal === 'object') { // if data was taxa info, it comes back as an obj
                for (var level in colVal) {
                    var taxa = colVal[level];
                    if (!mapParse.has(level)) {
                        var val = d3.map();
                    } else {
                        var val = mapParse.get(level);
                    }
                    val.set(leafName, taxa);
                    mapParse.set(level, val);
                }
            } else {
                val.set(leafName, colVal);
                mapParse.set(col, val);
            }
        })
    })

    // setup color scales for mapping columns
    // keys are mapping column headers and values are scales
    // for converting column value to a color
    var colorScales = d3.map();
    mapParse.forEach(function(k, v) { // v is a d3.set of mapping column values, with leaf ID has key

        // check if values for mapping column are string or numbers
        // strings are turned into ordinal scales, numbers into quantitative
        // we simply check the first value in the obj
        var vals = autoSort(v.values(), true);
        var scale;
        if (typeof vals[0] === 'string' || vals[0] instanceof String) { // ordinal scale
            var tmp = d3.scale.category10();
            if (vals.length > 10) {
                tmp = d3.scale.category10();;
            }
            scale = tmp.domain(vals);
        } else { // quantitative scale
            scale = d3.scale.quantize()
                .domain(d3.extent(vals))
                .range(colorbrewer.Spectral[11]);
        }
        colorScales.set(k, scale);
    })

    return [mapParse, colorScales];
}









/* Clean-up a QIIME formatted taxa string

Will clean-up a QIIME formatted taxonomy string
by removing the class prefix and returning the
original taxa string as an object split into taxonomic
levels e.g. {"Kingdom":"bacteria", ... }

NOTE: any taxa level with an assignment "unassigned" 
will be thrown out - this way the tree will not
color by this level (tree can only be colored by
defined taxa)

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

        var clean = str.split(";");

        var ret = {};

        // construct object
        var taxaLevels = ['Taxa [Kingdom]','Taxa [Phylum]','Taxa [Class]','Taxa [Order]','Taxa [Family]','Taxa [Genus]','Taxa [Species]'];
        clean.forEach(function(taxa, i) {
            if (taxa != 'unassigned') {
                ret[taxaLevels[i]] = taxa;
            }
        })

        return ret;

    } else {

        return taxa;

    }

}


/*

When called, will resize the SVG to fit the
inner g group.

*/
function resizeSVG() {

    //findTreeCenter()

    var g = d3.select('svg g').node().getBBox();

    // scale SVG
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

    var collapse = d3.select(selector).append('div')
        .attr("class","panel panel-default")
        .attr("id", "gui")
        .style("margin-top","20px");
      
    collapse.append("div")
        .attr("class","panel-heading")
        .style("overflow","auto")
        .attr("role","tab")
      .append("h4")
        .attr("class","panel-title")
      .append("a")
        .attr("role","button")
        .attr("data-toggle","collapse")
        .attr("data-parent","#accordion")
        .attr("href","#collapseGUI")
        .attr("aria-expanded","true")
        .attr("aria-controls","collapseGUI")
        .html("<i class='fa fa-chevron-right'></i> Controls")
      .append("button")
        .attr('class', 'btn btn-success pull-right btn')
        .style('padding','1px 7px')
        .on("click",saveSVG)
        .append('i')
        .attr('class','fa fa-floppy-o')
        .attr('title','Save image')

    var gui = collapse.append("div")
        .attr("id","collapseGUI")
        .attr("class","panel-collapse collapse in")
        .attr("role","tabpanel")
        .attr("aria-labelledby","headingOne")
      .append("div")
        .attr("class","panel-body")

    //$('#collapseGUI').collapse('toggle'); // strange drag and slide behavior


    var guiRow1 = gui.append("div")
        .attr("class","row")

    var col1 = guiRow1.append("div")
        .attr("class","col-sm-2")

    var tmp = col1.append("div")
        .attr("class","btn-toolbar")
    
    tmp.append("button")
        .attr("class","btn btn-info")
        .attr("id","rectangular")
        .attr("title","Generate a rectangular layout")
        .attr("onclick","updateTree({'treeType':this.id})")
        .html('<i class="fa fa-square-o fa-lg" aria-hidden="true"></i>')

    tmp.append("button")
        .attr("class","btn btn-info")
        .attr("id","radial")
        .attr("title","Generate a radial layout")
        .attr("onclick","updateTree({'treeType':this.id})")
        .html('<i class="fa fa-circle-thin fa-lg" aria-hidden="true"></i>')

    var check1 = col1.append("div")
        .attr("class","checkbox")
        .append("label")
        
    check1.append("input")
        .attr("type","checkbox")
        .attr("id","toggle_distance")
        .attr("checked","")
        .attr("onclick","updateTree()")

    check1.append('text')
        .text("Toggle distance labels")

    var check2 = col1.append("div")
        .attr("class","checkbox")
        .append("label")
        
    check2.append("input")
        .attr("type","checkbox")
        .attr("id","toggle_leaf")
        .attr("checked","")
        .attr("onclick","updateTree()")

    check2.append('text')
        .text("Toggle leaf labels")

    var check3 = col1.append("div")
        .attr("class","checkbox")
        .append("label")
        
    check3.append("input")
        .attr("type","checkbox")
        .attr("id","scale_distance")
        .attr("checked","")
        .attr("onclick","updateTree()")

    check3.append('text')
        .text("Scale by distance")


    // if mapping file was passed
    if (mapParse && !mapParse.empty()) {

        // select for leaf color
        var col2 = guiRow1.append("div")
            .attr("class","col-sm-2 form-group")

        col2.append("label")
            .text("Leaf node")
            
        var select1 = col2.append("select")
            .attr('onchange','updateTree()')
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
        col2.append("label")
            .text("Leaf background")

        var select2 = col2.append("select")
            .attr('onchange','updateTree()')
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
    var col3 = guiRow1.append("div")
        .attr("class","col-sm-2")

    col3.append("label")
        .text("Vertical scale")

    col3.append("div")
        .attr("id","scaleH")

    scaleHSlider = d3.slider().min(22).max(100).step(1).on("slide", function(evt, value) { updateTree(); });
    d3.select('#scaleH').call(scaleHSlider);

    col3.append("label")
        .text("Leaf radius")

    col3.append("div")
        .attr("id","leafR")

    leafRSlider = d3.slider().min(5).max(20).on("slide", function(evt, value) { updateTree(); });
    d3.select("#leafR").call(leafRSlider);
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
    var html = "<div class='tip-title'>Leaf <span class='tip-name'>" + d.name + "</span></div><hr>";

    if (mapParse) {
        mapParse.keys().forEach(function(col) {
            html += '<p class="tip-row"><span class="tip-meta-title">- ' + col + '</span>: <span class="tip-meta-name">' + mapParse.get(col).get(d.name) + '</span><p>';
        })
    }

    return html;
}


// when called, will open a new tab with the SVG
// which can then be right-clicked and 'save as...'
function saveSVG(){

    // get styles from all stylesheets
    // http://www.coffeegnome.net/converting-svg-to-png-with-canvg/
    var style = "\n";
    for (var i=0; i<document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i];
        if (sheet.href) {
            var sheetName = sheet.href.split('/').pop();
            var rules = sheet.rules;
            if (rules) {
                for (var j=0; j<rules.length; j++) {
                    style += (rules[j].cssText + '\n');
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
- colorScale: d3 color scale
    color scale used with each item in mapVals;
    generates either a circle or a rect with this
    color
- type: string
    type of colored object to render along with
    each item in mapVals; either 'circle' or 'rect'
*/
function generateLegend(title, mapVals, colorScale, type) {

    // generate containing group if necessarry
    var container = d3.select("#legendID")
    var box = d3.select("#treeSVG").node().getBBox()
    if (container.empty()) { // if legend doesn't already exist
        container = d3.select('svg g').append("g")
            .attr("id", "legendID")
    }
    container.attr("transform","translate(" + (box.width + margin.right + margin.left) + ",0)");



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


    if (container.select("#legendID g").empty()) {
        var transform = 'translate(5,0)';
    } else {
        var offset = 15 + d3.select('#legendID').node().getBBox().height;
        var transform = 'translate(5,' + offset + ')';
    }
    var legend = container.append("g")
            .attr("transform",transform)
            .attr("id", type == "circle" ? "node_legend" : "background_legend")

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
            .attr('transform', function(d,i) { return 'translate(11,' + (25 + i * 20) + ')'; } )
        
    if (type == 'circle' && bar === false) {
        legendRow.append(type)
            .attr('r', 4.5)
            .attr('fill', function(d) { return dimColor(colorScale(d)) } ) 
            .attr('stroke', function(d) { return colorScale(d) } ) 
            .attr("stroke-width",2);
    } else if (type == 'rect' || bar === true) {
        legendRow.append('rect')
            .attr('width', bar ? 30 : 9)
            .attr('height', bar ? 20 : 9)
            .attr('x', bar ? -4.5 : -4.5)
            .attr('y', bar ? -11 : -4.5)
            .attr('fill', function(d) { return colorScale(d) } ) 
    }
        
    legendRow.append('text')
            .attr('dx', bar ? 0 : 8)
            .attr('dy', 3)
            .attr('text-anchor', 'start')
            .attr("fill", function(d) {
                if (bar) {
                    var L = d3.hsl(colorScale(d)).l;
                    var rgb = legendColorScale(L);
                    return d3.rgb(rgb,rgb,rgb);
                } else {
                    return 'black';
                }
            })
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


/* Ligten a color

Utility for generating a lighter version
of the given color

Parameters:
===========
- colorName : str
    html color name (http://html-color-codes.info/color-names/)

Returns:
========
- RGB of the input color that has been lightened by 20% (in HSL)


*/

function dimColor(colorName) {

    var c = d3.hsl(colorName);
    c.l += 0.20;
    c + "";
    return c;

}



function findTreeCenter() {

    var tree = d3.select("#treeSVG").node().getBoundingClientRect();
    var root = d3.select("g.root.node").node().getBoundingClientRect();

    console.log(tree)
    console.log(root)

    var dX = (root.top - tree.top)
    var dY = (root.left - tree.left)

    console.log(dX,dY)
    return [dX, dY];

}






















