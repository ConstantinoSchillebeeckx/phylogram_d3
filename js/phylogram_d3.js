/*

    TODO

*/

// GLOBALS
// --------------
var options = {};
var mapParse, colorScales, mappingFile;

// use margin convention
// https://bl.ocks.org/mbostock/3019563
var margin = {top: 0, right: 10, bottom: 10, left: 10};
var startW = 800, startH = 600;
var width = startW - margin.left - margin.right;
var height = startH - margin.top - margin.bottom;
var nodes, links, node, link;
var newick;
var shiftX = 0;
var shiftY = 0;
var zoom = d3.behavior.zoom()
// tree defaults
var treeType = 'rectangular'; // rectangular or circular [currently rendered treeType]
var scale = true; // if true, tree will be scaled by distance metric

// scale for adjusting legend
// text color based on background
// [background HSL -> L value]
// domain is L (0,1)
// range is RBG
var legendColorScale = d3.scale.linear().domain([0.5,1]).range([255,0])

// tooltip 
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([0,20])
    .html(function(d) {
        return formatTooltip(d, options.mapping);
    })
var outerRadius = startW / 2,
    innerRadius = outerRadius - 170;

// setup radial tree
var radialTree = d3.layout.cluster()
    .size([360, innerRadius])
    .children(function(d) { return d.branchset; })

// setup rectangular tree
var rectTree = d3.layout.cluster()
    .children(function(node) {
        return node.branchset
    })
    .size([height, width]);

var duration = 1000;




// --------------
// GLOBALS







/* initialize tree

Function called from front-end with all user-defined
opts to format the tree.  Will validate input
Newick tree, show a loading spinner, and then
render the tree

Parameters:
==========
- dat : string
		filepath for input Newick tre
- div : string
		div id (with included #) in which to generated tree
- options: obj
           options object with potential keys and values

options obj:
- mapping_file: path to OTU mapping file (if there is one)
- hideRuler: (bool) if true, background distance ruler is not rendered TODO
- skipBranchLengthScaling: (bool) if true, tree will not be scaled by distance TODO
- skipLabels: (bool) if true, leaves will not be labeled by name or distance
- treeType: either rectangular or radial
TODO

*/


function init(dat, div, options) {

    // show loading spinner
    showSpinner(div, true)

    validateInputs(dat, options);

    d3.text(dat, function(error, fileStr) {
        if (error) {
            var msg = 'Input file <code><a href="' + dat + '">' + dat + '</a></code> could not be parsed, ensure it is a proper Newick tree file!';
            displayErrMsg(msg, div);
            return;
          }

        // process Newick tree
        newick = processNewick(fileStr);

        // render tree
        if ('mapping_file' in options) {
            mappingFile = options.mapping_file;
            d3.tsv(mappingFile, function(error, data) {
                options.mapping_dat = data;
                buildTree(div, newick, options, function() { updateTree(); });
            });
        } else {
            buildTree(div, newick, options, function() { updateTree(); });
        }
    });
}



/* Primary tree building function

Will do an initial render of all SVG elements
including the GUI and the initial layout of
the tree.  Subsequent updating in both style
and format of the tree is done through updateTree()


Parameters:
===========
- div : string
        div id (with included #) in which to generated tree
- newick : Newick obj
           return of function processNewick()
- opts: obj
           opts object with potential keys and values


Retrurns:
=========
- nothing

*/

function buildTree(div, newick, opts, callback) {

    if ('mapping_dat' in opts) {
        var parsed = parseMapping(opts.mapping_dat);
        mapParse = parsed[0];
        colorScales = parsed[1];
        options.mapping = mapParse;
        options.colorScale = colorScales;
    }

    // check opts, if not set, set to default
    if (!('treeType' in opts)) { 
        opts['treeType'] = treeType;
    } else {
        treeType = opts.treeType;
    }
    if (!('skipBranchLengthScaling' in opts)) { 
        opts['skipBranchLengthScaling'] = !scale;
    } else {
        scale = opts.skipBranchLengthScaling;
    }

    // add bootstrap container class
    d3.select(div)
        .attr("class","container-fluid render")

    // build GUI
    var gui = buildGUI(div, opts);

    var tmp = d3.select(div).append("div")
            .attr("class","row")
            .attr("id","canvas")

    // NOTE: size of SVG and SVG g are updated in fitTree()
    svg = tmp.append("div")
            .attr("class", "col-sm-12")
            .attr("id","tree")
        .append("svg:svg")
            .attr("xmlns","http://www.w3.org/2000/svg")
            .attr("id","SVGtree")
            .call(zoom.on("zoom", panZoom))
        .append("g") // svg g group is translated by fitTree()
            .attr("id",'canvasSVG')
            .attr("transform","translate(" + margin.left + "," + margin.top + ")")

    svg.append("g")
            .attr("id","rulerSVG")
    svg.append("g")
            .attr("id","treeSVG")


    // generate intial layout and all tree elements
    d3.select("#canvasSVG")
    if (opts.treeType == 'rectangular') {
        layoutTree(rectTree, newick, opts);
    } else if (opts.treeType == 'radial') {
        layoutTree(radialTree, newick, opts);
    }

    svg.call(tip);
    showSpinner(null, false); // hide spinner
    callback(); // calls updateTree

}

/* will layout tree elements including nodes and links

Assumes globals (nodes, links) exist

Parameters:
-----------
- tree : d3.tree layout
- newick : Newick obj
           return of function processNewick()
- opts: obj
           opts object with potential keys and values

*/
function layoutTree(tree, newick, opts) {
    d3.selectAll("g.ruleGroup").remove() // remove ruler

    nodes = tree.nodes(newick);
    if (!opts.skipBranchLengthScaling) { var yscale = scaleBranchLengths(nodes); }
    if (opts.treeType == 'rectangular') { var xscale = scaleLeafSeparation(tree, nodes); }
    links = tree.links(nodes);

    formatTree(nodes, links, yscale, xscale, height, opts);
}



/* Function used to update existing tree

Function called from front-end everytime GUI
is changed; this will redraw the tree based
on GUI settings.

*/
function updateTree() {


    getGUIoptions(); // set our globals
    


    // adjust physical positioning
    if (options.typeChange || options.skipBranchLengthScaling != scale) {

        layoutTree( options.treeType == 'rectangular' ? rectTree : radialTree, newick, options);

        // reset rotation to 0 (rect) or to previous pos (radial)
        d3.select('#treeSVG').attr('transform', function(d) {
            if (options.treeType == 'rectangular') {
                return 'rotate(0)';
            } else {
                return 'rotate(' + rotationSlider.noUiSlider.get() + ')';
            }
        })

        scale = options.skipBranchLengthScaling;
    }

    // enable/disable sliders
    if (treeType == 'radial') {
        rotationSlider.removeAttribute('disabled');
        scaleHSlider.setAttribute('disabled',true);
    } else {
        rotationSlider.setAttribute('disabled', true);
        scaleHSlider.removeAttribute('disabled');
    }


    // if leaf radius becomes too large, adjust vertical scale
    if (options.sliderLeafR * 2 > options.sliderScaleV && treeType == 'rectangular') { scaleHSlider.noUiSlider.set( 2 * options.sliderLeafR ); }

    // adjust vertical scale
    if (options.treeType == 'rectangular') {
        var xscale = scaleLeafSeparation(rectTree, nodes, options.sliderScaleV); // this will update x-pos

        // update ruler length
        var treeH = getTreeBox().height + 32; // +32 extends rulers outside treeSVG
        d3.selectAll(".ruleGroup line")
            .attr("y2", treeH + margin.top + margin.bottom) // TODO doesn't work quite right with large scale


        // scale vertical pos
        svg.selectAll("g.node")
            .data(nodes)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
        svg.selectAll("path.link")
            .data(links)
            .attr("d", elbow);
    }

    // scale leaf radius
    svg.selectAll("g.leaf circle")
        .attr("r", options.sliderLeafR);
    orientTreeLabels();


    // toggle leaf labels
    svg.selectAll('g.leaf.node text')
        .style('fill-opacity', options.skipLeafLabel? 1e-6 : 1 )

    // toggle distance labels
    svg.selectAll('g.inner.node text')
        .style('fill-opacity', options.skipDistanceLabel? 1e-6 : 1 )

    svg.selectAll('g.leaf.node text')
        .text(function(d) { 
            if (options.skipDistanceLabel) {
                return d.name;
            } else {
                if (options.leafText == 'distance' || !mapParse) {
                    return d.name + ' ('+d.length+')'; 
                } else {
                    return d.name + ' (' + mapParse.get(options.leafText).get(d.name) + ')';
                }
            }
        });


    if ('mapping' in options) { 
        updateLegend();  // will reposition legend as well
    } else {
        d3.select('svg').attr("viewBox", "0 0 " + parseInt(window.innerWidth) + " " + parseInt(window.innerHeight)); // set viewbox
    }

}




