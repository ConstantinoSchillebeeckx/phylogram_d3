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
- opts : obj
            tree opts, see documentation for keys

*/
function formatTree(nodes, links, yscale=null, xscale=null, height, opts) {

    /* Format links (branches) of tree
    formatLinks

    Will render the lines connecting nodes (links)
    with right angle elbows.

    Parameters:
    ===========
    - svg : svg selctor
            svg HTML element into which to render
    - links : d3.tree.links
    - opts : obj
                tree opts, see documentation for keys


    */

    // set to global!
    link = d3.select('#treeSVG').selectAll("path.link")
      .data(links)
        .enter().append("path")
        .attr("class","link")
        .style("fill","none") // setting style inline otherwise AI doesn't render properly
        .style("stroke","#aaa")
        .style("stroke-width","2px")

    d3.selectAll('.link')
        .attr("d", function(d) { return opts.tree == 'rectangular' ? elbow(d) : step(d.source.x, d.source.y, d.target.x, d.target.y); })


    /* Render and format tree nodes
    formatNodes

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
    - opts : obj
                tree opts, see documentation for keys


    */

    // set default leaf radius if not present
    if (!('sliderLeafR' in opts)) {
        opts['sliderLeafR'] = 5;
    }

    node = d3.select('#treeSVG').selectAll("g.node")
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

    d3.selectAll('.node')
            .attr("transform", function(d) {
                if (opts.treeType == 'rectangular') {
                    return "translate(" + d.y + "," + d.x + ")";
                } else if (opts.treeType == 'radial') {
                    return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                }
            })
        
    d3.selectAll('.leaf')
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)

    // node backgrounds
    node.append("rect")
      .attr('width', 0 ) // width is set when choosing background color
      .attr('height', 10 + opts.sliderLeafR * 2) 
      .attr('y', -opts.sliderLeafR - 5)
      .attr("opacity", function(d) { return d.children ? 1e-6 : 1 });

    // node circles
    node.append("circle")
        .attr("r", function(d) { 
            if (!d.children || d.depth == 0) {
                return opts.sliderLeafR;
            } else {
                return 3;
            }
        });

    d3.selectAll('.inner.node circle')
        .on("mouseover", function() { 
            d3.select(this)
                .transition()
                .duration(100)
                .attr("r",6); 
        })
        .on("mouseout", function() { 
            d3.select(this)
                .transition()
                .duration(100)
                .attr("r",3); 
        })


    // node label
    node.append("text")
        .attr("class",function(d) { return d.children ? "distanceLabel" : "leafLabel" })
        .attr("dy", function(d) { return d.children ? -6 : 3 })
        .text(function(d) { 
            if (d.children) {
                if (d.length && d.length.toFixed(2) > 0.01) {
                    return d.length.toFixed(2);
                } else {
                    return '';
                }
            } else {
                if (opts['leafText']) {
                    return d.name + ' (' + mapParse.get(opts['leafText']).get(d.name) + ')';
                } else {
                    return d.name + ' (' + d.length + ')';
                }
            }
        })
        .attr("opacity", function(d) { return opts.skipLabels ? 1e-6 : 1; });

    orientTreeLabels(); 



    /* Render and format background rules
    formatRuler

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
    - opts : obj
                tree opts, expects a key hideRuler;
                if true, rules won't be drawn. also
                expects a key treeType (rectangular/radial)

    */


    if (!opts.hideRuler && yscale != null) {

        if (opts.treeType == 'rectangular') {

            rulerG = d3.select('#rulerSVG').selectAll("g")
                    .data(yscale.ticks(10))
                  .enter().append("g")
                    .attr("class", "ruleGroup")
                  .append('svg:line')
                    .attr("class", "rule")
                    .attr('y1', 0)
                    .attr('y2', getTreeBox().height + margin.top + margin.bottom)
                    .attr('x1', yscale)
                    .attr('x2', yscale)


        } else if (opts.treeType == 'radial') {  

            rulerG = d3.select('#rulerSVG').selectAll("g")
                    .data(yscale.ticks(10))
                  .enter().append("g")
                    .attr("class", "ruleGroup")
                  .append('circle')
                    .attr("class","rule")
                    .attr('r', yscale);

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
        .attr('class','alert alert-danger lead col-sm-8 col-sm-offset-2')
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

// get the viewBox attribute of the outermost svg in
// format {x0, y0, x1, y1}
function getViewBox() {
    var vb = jQuery('svg')[0].getAttribute('viewBox');

    if (vb) {
        var arr = vb.split(' ').map(function(d) { return parseInt(d); })
        return {'x0':arr[0], 'y0':arr[1], 'x1':arr[2], 'y1':arr[3]};
    } else {
        return false;
    }
}




/*  Fit the SVG viewBox to browser size

function called by "center view" button in GUI

Will adjust the X-Y position as well as the zoom
so that the entire tree (width & height) are fit
on the screen.  It then aligns the left-most
and top-most elements with the window.

*/
function fitTree() {

    var y1 = window.innerHeight;
    var x1 = window.innerWidth;
     
    d3.select('svg').attr("viewBox", "0 0 " + parseInt(x1) + " " + parseInt(y1)); // fit viewbox

    // reset position
    d3.select('#canvasSVG')
        .attr('transform','translate(0,0) scale(1)')

    // get bounding box of content to fit
    if (treeType == 'rectangular') {
        var content = d3.select('#canvasSVG').node().getBoundingClientRect();
    } else {
        var content = d3.select('#treeSVG').node().getBoundingClientRect();
        var root = d3.select('.root').node().getBoundingClientRect();
        console.log(content, d3.select('#treeSVG').node().getBoundingClientRect())
    }

    var zoomScale = d3.min([
        (jQuery('#gui').outerWidth() - margin.left - margin.right) / content.width, 
        (y1 - jQuery('#gui').outerHeight(true) - margin.bottom - margin.top) / content.height
    ]);

    svg.call(zoom.event);

    zoom.scale(zoomScale);
    if (treeType == 'rectangular') {
        zoom.translate([margin.left,margin.top]);
    } else {
        zoom.translate([x1 / 2, (root.bottom - content.top) * zoom.scale()]);
    }

    svg.transition().duration(750).call(zoom.event);

}




// get the transform values of selection
// returns array [X,Y]
function getTransform(sel) {

    var transf = d3.select(sel).attr('transform').replace('translate(','').replace(')','');
    var tmp = transf.split(',');

    return [parseInt(tmp[0]), parseInt(tmp[1])];
}







// get BoundingClientRect of tree
function getTreeBox() {

    if (treeType == 'rectangular') {
        var tmp_height = d3.extent(nodes.map(function(d) { return d.x }));
        var tmp_width = d3.extent(nodes.map(function(d) { return d.y })); // note width will be off since it doesn't take into account the label text
        return {'height':tmp_height[1] - tmp_height[0], 'width':tmp_width[1] - tmp_width[0] };
    } else {

        return d3.select('#treeSVG').node().getBoundingClientRect();
    }


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
- opts : obj
    opts obj, same as passed to init()
    if present mapping file key present, two
    select dropdowns are generated with the columns
    of the file.  one dropdown is for coloring the
    leaf nodes, the other for the leaf backgrounds.
    The first index of the output of parseMapping()
    should be used here.
*/

function buildGUI(selector, opts) {

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
        //.html("<i class='fa fa-chevron-right'></i> Controls")
        .html('Controls')
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


    var guiRow1 = gui.append("div")
        .attr("class","row")

    var col1 = guiRow1.append("div")
        .attr("class","col-sm-2")

    var tmp = col1.append("div")
        .attr("class","btn-toolbar btn-group")
    
    tmp.append("button")
        .attr("class","btn btn-info")
        .attr("id","rectangular")
        .attr("title","Generate a rectangular layout")
        .attr("onclick","options.treeType = this.id; updateTree();")
        .html('<i class="fa fa-square-o fa-lg" aria-hidden="true"></i>')

    tmp.append("button")
        .attr("class","btn btn-warning")
        .attr("id","radial")
        .attr("title","Generate a radial layout")
        .attr("onclick","options.treeType = this.id; updateTree();")
        .html('<i class="fa fa-circle-thin fa-lg" aria-hidden="true"></i>')

    tmp.append("button")
        .attr("class","btn btn-success")
        .attr("id","reset")
        .attr("title","Reset view")
        .attr("onclick","fitTree();")
        .html('<i class="fa fa-arrows-alt" aria-hidden="true"></i>')

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
    if (mapParse && !mapParse.empty() && typeof mapParse != 'undefined') {

        // select for leaf color
        var col2 = guiRow1.append("div")
            .attr("class","col-sm-2 form-group")

        col2.append("label")
            .text("Leaf node color")
            
        var select1 = col2.append("select")
            .attr('onchange','updateTree();')
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
            .text("Leaf background color")

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


        // select for leaf text
        var col3 = guiRow1.append("div")
            .attr("class","col-sm-2 form-group")

        col3.append("label")
            .text("Leaf node label")
            
        var select3 = col3.append("select")
            .attr('onchange','updateTree();')
            .attr('id','leafText')
            .attr("class","form-control")

        select3.selectAll("option")
            .data(mapParse.keys()).enter()
            .append("option")
            .attr('value',function(d) { return d; })
            .text(function(d) { return d; })

        select3.append("option")
            .attr("selected","")
            .attr("value","distance")
            .text('Distance');
        // select for leaf text
    }
    var col4 = guiRow1.append("div")
        .attr("class","col-sm-2")

    col4.append("label")
        .text("Vertical scale")

    col4.append("div")
        .attr("id","scaleH")

    scaleHSlider = document.getElementById('scaleH')

    noUiSlider.create(scaleHSlider, {
        start: 22,
        step: 0.05,
        connect: [true, false],
        range: {
            'min': 5,
            'max': 100
        }
    });

    scaleHSlider.noUiSlider.on('slide', function(){
        updateTree();
    });

    col4.append("label")
        .text("Leaf radius")

    col4.append("div")
        .attr("id","leafR")

    leafRSlider = document.getElementById('leafR')

    noUiSlider.create(leafRSlider, {
        start: 5,
        step: 0.05,
        connect: [true, false],
        range: {
            'min': 1,
            'max': 20
        }
    });

    leafRSlider.noUiSlider.on('slide', function(){
        updateTree();
    });

    col4.append("label")
        .text("Rotation")

    col4.append("div")
        .attr("id","rotation")

    rotationSlider = document.getElementById('rotation')

    noUiSlider.create(rotationSlider, {
        start: 0,
        connect: [true, false],
        range: {
            'min': -180,
            'max': 180
        }
    });

    rotationSlider.noUiSlider.on('slide', function(){
        rotateTree();
    });
    rotationSlider.noUiSlider.on('end', function(){
        updateTree();
        orientTreeLabels();
    });

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
    if (parseFloat(value)) { // if float
        return parseFloat(value);
    } else if (parseInt(value)) { // if int
        return parseInt(value);
    }

    // ignore blank values
    if (value != '') {
        return value;
    } else {
        return null;
    }
}




/* Function for styling tooltip content

Parameters:
==========
- d : node attributes

- mapParse : obj (optional)
    optional parsed mapping file; keys are mapping file
    column headers, values are d3 map obj with key as
    node name and value as file value

Returns:
========
- formatted HTML with all node data

*/
function formatTooltip(d, mapParse) {
    var html = "<div class='tip-title'>Leaf <span class='tip-name'>" + d.name + "</span></div>";
    
    if (mapParse) {
        html += '<hr>';
        mapParse.keys().forEach(function(col) {
            html += '<p class="tip-row"><span class="tip-meta-title">- ' + col + '</span>: <span class="tip-meta-name">' + mapParse.get(col).get(d.name) + '</span><p>';
        })
    }

    return html;
}


// when called, will open a new tab with the SVG
// which can then be right-clicked and 'save as...'
function saveSVG(){

    var viewX = getViewBox().x1;
    var viewY = d3.select("#canvasSVG").node().getBoundingClientRect().height;

    d3.select('svg')
        .attr('width', viewX)
        .attr('height', viewY)
        .attr('viewBox',null);

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

    var svg = d3.select('svg'),
        img = new Image(),
        serializer = new XMLSerializer()

    // prepend style to svg
    svg.insert('defs',":first-child")
    d3.select("svg defs")
        .append('style')
        .attr('type','text/css')
        .html(style);

    // generate IMG in new tab
    var svgStr = serializer.serializeToString(svg.node());
    img.src = 'data:image/svg+xml;utf8,' +  unescape(encodeURIComponent(svgStr));
    var tab = window.open(img.src, '_blank')
    tab.document.title = 'phylogram d3';

    // reset figure
    d3.select('svg').attr("viewBox", "0 0 " + viewX + " " + viewY); // set viewbox
    d3.select('svg').attr('width', null);
    d3.select('svg').attr('height', null);

    jQuery('.collapse').collapse('show'); // open GUI since clicking the save button closes it
};







/* Generate legend

Helper function for generating a legend (floating),
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

    if (container.empty()) { // if legend doesn't already exist
        container = d3.select('svg').append("g")
            .attr("id", "legendID")
    }


    // we need a unique list of values for the legend
    // as well as the count of those unique vals
    // they will sort alphabetically or descending if integer
    var counts = d3.map(); // {legend Row: counts}
    mapVals.values().forEach(function(d) {
        if (d != '') { // ignore empty data
            var count = 1
            if (counts.has(d)) {
                var count = counts.get(d) + count;
            }
            counts.set(d,count);
        }
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

    // check if we have all numbers, ignore empty values
    if (parseInt(sorted[0])) {
        bar = true;
        scale = d3.scale.quantize().domain(range(0,10)).range(colorScale.range()); // mapping from metadata value to color
        labelScale = d3.scale.ordinal().domain(range(0,10)).rangePoints(d3.extent(sorted))
        sorted = range(0,10);
    } else {
        scale = colorScale;
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
            .attr('width', bar ? 45 : 9)
            .attr('height', bar ? 20 : 9)
            .attr('x', bar ? -4.5 : -4.5)
            .attr('y', bar ? -11 : -4.5)
            .attr('fill', function(d) {  return scale(d) } ) 
    }
        
    legendRow.append('text')
            .attr('dx', bar ? 0 : 8)
            .attr('dy', 3)
            .attr('text-anchor', 'start')
            .attr("fill", function(d) {
                if (bar) {
                    var L = d3.hsl(scale(d)).l;
                    var rgb = legendColorScale(L);
                    return d3.rgb(rgb,rgb,rgb);
                } else {
                    return 'black';
                }
            })
            .text(function(d) { 
                if (bar) {
                    return labelScale(d).toFixed(2);
                } else {
                    return '(' + counts.get(d) + ') ' + d; 
                }
            })
}



/* 

Will position the legend in the top/right corner
of window.

*/
function positionLegend() {
   
    var yPos = (margin.top + 30) / zoom.scale(); // 20 to make room for title
    var xPos = d3.select("#legendID").node().getBoundingClientRect().width;
    d3.select("#legendID").attr("transform","translate(" + (window.innerWidth - xPos - 15) + "," + yPos + ")");

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



/* Validat input data and options

Does numerous validation checks on input data; if
things don't check out, show an error message.

Parameters:
-----------
- dat : string
		filepath for input Newick tre
- options: obj
           options object with potential keys and values

*/
function validateInputs(dat, options) {
    // ensure a file was passed
    if (!dat) {
        var msg = 'Please ensure that, at a minimum, a Newick file is passed to the <code>init()</code> call!';
        displayErrMsg(msg, div);
        return false;
    }

    // ensure options is obj if not passed as such
    if (!(options !== null && typeof options === 'object')){
        options = {};
    }

    // ensure proper tree type was passed
    if ('treeType' in options) {
        if (options.treeType != 'radial' && options.treeType != 'rectangular') {
            var msg = 'Please ensure that the tree type declared in the options object is either "radial" of "rectangular"!';
            displayErrMsg(msg, div);
            return false;
        } 
    }
}






// callback for rotation slider
// paratmer: degree of rotation
function rotateTree() {
    d3.select('#treeSVG').attr('transform','rotate(' + rotationSlider.noUiSlider.get() + ')');
}





// function called when user interacts with plot to pan and zoom with mouse
function panZoom() {
    d3.select('svg g').attr("transform", "translate(" + (d3.event.translate[0] + shiftX) + "," + (d3.event.translate[1] + shiftY) + ")" + " scale(" + d3.event.scale + ")")
}




/* 
After rotating the tree, some of the radials may be oriented improperly,
this function will go through all of them and rotate those labels that are
needed 180

*/
function orientTreeLabels() {

    var deg = rotationSlider.noUiSlider.get();
    var rad = parseInt(leafRSlider.noUiSlider.get()); // leaf radius

    d3.selectAll('.node text') 
        .attr("transform", function(d) { return addAngles(deg, d.x) > 180 && treeType == 'radial' ? "rotate(180)" : "" }) 
        .attr("text-anchor", function(d) { return addAngles(d.x, deg) > 180 && treeType == 'radial' ? "end" : "start" })
        .attr("dx", function(d) { 
            if (d.children) { // if inner node
                return treeType == 'radial' && addAngles(deg, d.x) > 180 ? 20 : -20;
            } else { // if leaf node
                return treeType == 'radial' && addAngles(deg, d.x) > 180 ? -(5 + rad) : (5 + rad);
            }
        }) 


}

// given two angles, will return the sum clamped to [0, 360]
function addAngles(a,b) {

    var sum = parseFloat(a) + parseFloat(b);

    if (sum > 360) {
        return sum - 360;
    } else if (sum < 0) {
        return sum + 360;
    } else {
        return sum;
    }
}


/* Set options global

Should be called everytime the tree needs to be updated due to
changes in the GUI

*/
function getGUIoptions() {

    // set tree type if GUI was updated
    // by anything other than tree type
    // buttons
    if (!('treeType' in options)) {
        options.treeType = treeType;
    }

    // somewhere in the code, global var 'options' is
    // being emptied ({}) so we are resetting the 
    // mapping info here
    if (typeof mappingFile != 'undefined') {
        options.mapping = mapParse;
        options.colorScale = colorScales;
    }

    if (options.treeType != treeType) {
        var typeChange = true;
    } else {
        var typeChange = false;
    }
    options.typeChange = typeChange;
    treeType = options.treeType; // update current tree type


    // get checkbox state
    options.skipDistanceLabel = !jQuery('#toggle_distance').is(':checked');
    options.skipLeafLabel = !jQuery('#toggle_leaf').is(':checked');
    options.skipBranchLengthScaling = !jQuery('#scale_distance').is(':checked');

    // get slider vals
    options.sliderScaleV = parseInt(scaleHSlider.noUiSlider.get()); 
    options.sliderLeafR = parseInt(leafRSlider.noUiSlider.get());

    // get dropdown values
    var leafColor, backgroundColor;
    if ('mapping' in options && !options.mapping.empty()) {
        var e = document.getElementById("leafColor");
        options['leafColor'] = e.options[e.selectedIndex].value;
        var e = document.getElementById("leafText");
        options['leafText'] = e.options[e.selectedIndex].value;
        var e = document.getElementById("backgroundColor");
        options['backgroundColor'] = e.options[e.selectedIndex].value;
    }

}


/* Generate tree legend if needed
*/
function updateLegend() {

    // remove legend if one exists so we can update
    d3.selectAll("#legendID g").remove()

    // update leaf node
    if (options.leafColor != '') {
        var colorScale = options.colorScale.get(options.leafColor); // color scale
        var mapVals = options.mapping.get(options.leafColor); // d3.map() obj with leaf name as key

        // fill out legend
        generateLegend(options.leafColor, mapVals, colorScale, 'circle');

        // update node styling
        svg.selectAll('g.leaf.node circle')
            .transition()
            .style('fill', function(d) {
                //console.log(d.name, mapVals.get(d.name), colorScale(mapVals.get(d.name)))
                return mapVals.get(d.name) ? dimColor(colorScale(mapVals.get(d.name))) : 'white'
            })
            .style('stroke', function(d) {
                return mapVals.get(d.name) ? colorScale(mapVals.get(d.name)) : 'gray'
            })

    } else if (options.leafColor == '') {
        svg.selectAll('g.leaf.node circle')
            .transition()
            .attr("style","");
    }

    // update leaf background
    if (options.backgroundColor != '') {
        var colorScale = colorScales.get(options.backgroundColor) // color scale
        var mapVals = mapParse.get(options.backgroundColor) // d3.map() obj with leaf name as key


        // fill out legend
        var offset = 25;
        generateLegend(options.backgroundColor, mapVals, colorScale, 'rect');

        // update node background style
        svg.selectAll('g.leaf.node rect')
            .transition()
            .attr("width", function(d) {
                var name = d.name.replace(new RegExp('\\.', 'g'), '_');
                var textWidth = d3.select('#leaf_' + name + ' text').node().getComputedTextLength();
                var radius = d3.select('#leaf_' + name + ' circle').node().getBBox().height / 2.0;
                return textWidth + radius + 10; // add extra so background is wider than label
            })
            .style('fill', function(d) {
                return mapVals.get(d.name) ? colorScale(mapVals.get(d.name)) : 'none'
            })
            .style('opacity',1)
    } else if (options.backgroundColor == '') {
        svg.selectAll('g.leaf.node rect')
            .transition(2000)
            .style('opacity','1e-6')
            .attr('width','0')
    }

    if (options.backgroundColor != '' || options.leafColor != '') {
        positionLegend();
    }

     
    d3.select('svg').attr("viewBox", "0 0 " + parseInt(window.innerWidth) + " " + parseInt(window.innerHeight)); // set viewbox

}
