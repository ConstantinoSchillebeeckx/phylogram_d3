/*

    TODO

*/

// GLOBALS
// --------------
var mapParse, colorScales, mappingFile;
// use margin convention
// https://bl.ocks.org/mbostock/3019563
// width and height are initially set and then
// automatically scalled to fit tree
var margin = {top: 30, right: 0, bottom: 20, left: 50};
var startW = 800, startH = 600;
var tree, nodes, links;
var width, height;
var treeType = ''; // rectangular or circular
var newick;
// tooltip 
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return formatTooltip(d, mapParse);
    })
var outerRadius = 960 / 2,
    innerRadius = outerRadius - 170;
var renderDiv; // svg is rendered here
// --------------
// GLOBALS




/* initialize tree

Function called from front-end with all user-defined
options to format the tree.  Will validate input
Newick tree, show a loading spinner, and then
render the tree

Parameters:
==========
- dat : string
		filepath for input Newick tre
- div : string
		div id (with included #) in which to generated tree
- mapp : string (optional)
		filepath to TSV mapping file (formats trees), expects
        first column to be labels for leafs
*/
function init(dat, div, mapp=null) {

    renderDiv = div;

    // show loading spinner
    showSpinner(renderDiv, true)

    // ensure file exists and can be read
    var fileStr = false;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status != 404) {
                fileStr = xhr.responseText.split("'").join(''); // remove the extra ' surrounding strings
            } else {
                var msg = 'Input file <code>' + dat + '</code> could not be parsed, ensure it is a proper Newick tree file!';
                displayErrMsg(msg, renderDiv);
                return false;
            }
        }
    }

    xhr.open("GET", dat, false);
    xhr.send();


    // process Newick tree
    newick = processNewick(fileStr);


    // render tree
    if (mapp) {
        d3.tsv(mapp, function(error, data) {
            if (error) throw error;

            var parsed = parseMapping(data);
            mapParse = parsed[0];
            colorScales = parsed[1];

            var options = {
                mapping: mapParse,
                colorScale: colorScales,
            }

            buildTree(renderDiv, newick, options);
        });
    } else {
        buildTree(renderDiv, newick, {});
    }
}



/* Primary tree building function


Parameters:
===========
- div : string
        div id (with included #) in which to generated tree
- newick : Newick obj
           return of function processNewick()
- options: obj
           options object with potential keys and values

Options obj:
- mapping: index 0 of the array output of parseMapping()
- colorScale: index 1 of the array output of parseMapping()
- hideRuler: (bool) if true, background distance ruler is not rendered
- skipBranchLengthScaling: (bool) if true, tree will not be scaled by distance
- skipLabels
TODO

Retrurns:
=========
- nothing

*/

function buildTree(div, newick, options) {

    // add bootstrap container class
    d3.select(div)
        .attr("class","container-fluid render")

    // build GUI
    var gui = buildGUI(div, options.mapping);


    updateTree(options);

    showSpinner(null, false); // hide spinner

}






/* Function used to update existing tree

Function called from front-end everytime GUI
is changed; this will redraw the tree based
on GUI settings.

Assumes globals (nodes, links) exist

*/
function updateTree(options={}) {

    // GET GUI VALUES
    // get tree type
    var radio = $("input[type='radio']:checked").val();
    options['treeType'] = radio;

    // get checkbox state
    skipDistanceLabel = !$('#toggle_distance').is(':checked');
    skipLeafLabel = !$('#toggle_leaf').is(':checked');

    // get slider vals
    var sliderScaleH = scaleHSlider.value(); 
    var sliderLeafR = leafRSlider.value();

    // get dropdown values
    var leafColor, backgroundColor;
    if (!mapParse.empty()) {
        var e = document.getElementById("leafColor");
        leafColor = e.options[e.selectedIndex].value;
        var e = document.getElementById("backgroundColor");
        backgroundColor = e.options[e.selectedIndex].value;
    }



    var svg = d3.select('svg g');
    // this will do the intial generation of all SVG objects
    // we don't call this on every GUI update in case of
    // very large tree - all we care about is reformatting
    // the tree (instead of generating new objects)
    if (radio != treeType) { // if tree type change

        d3.select('#canvas').remove(); // remove any existing canvas area

        // setup SVG and divs
        width = startW - margin.left - margin.right;
        height = startH - margin.top - margin.bottom;

        var tmp = d3.select(renderDiv).append("div")
                .attr("class","row")
                .attr("id","canvas")

        // NOTE: size of SVG and SVG g are set in resizeSVG()
        var svg = tmp.append("div")
                .attr("class", "col-sm-12")
                .attr("id","tree")
            .append("svg:svg")
                .attr("preserveAspectRatio","xMinYMin meet")
                .attr("xmlns","http://www.w3.org/2000/svg")
            .append("svg:g")

        if (radio == 'rectangular') {
            // setup rectangular tree
            tree = d3.layout.cluster()
                .sort(function(node) { return node.children ? node.children.length : -1; })
                .children(function(node) {
                    return node.branchset
                })
                .size([height, width]);

            nodes = tree.nodes(newick);
            links = tree.links(nodes);

            // scale tree
            // note y is horizontal direction
            // x is vertical direction
            if (options.skipBranchLengthScaling) {
                var yscale = d3.scale.linear()
                    .domain([0, width])
                    .range([0, width]);
                var xscale = d3.scale.linear()
                    .domain([0, height])
                    .range([0, height]);
            } else {
                var yscale = scaleBranchLengths(nodes, width);
                var xscale = scaleLeafSeparation(tree, nodes);
            }

            // initial format of tree (nodes, links, labels, ruler)
            formatTree(svg, nodes, links, yscale, xscale, height, options);
        } else if (radio == 'radial') {

            tree = d3.layout.cluster()
                .size([360, innerRadius])
                .children(function(d) { return d.branchset; })
                .value(function(d) { return 1; })
                .sort(function(a, b) { return (a.value - b.value) || d3.ascending(a.length, b.length); })
                .separation(function(a, b) { return 1; });

            nodes = tree.nodes(newick);
            links = tree.links(nodes);

            // initial format of tree (nodes, links, labels, ruler)
            formatTree(svg, nodes, links, yscale, xscale, height, options);
        }

        treeType = radio;
    }



    if (radio == 'rectangular') {
        scaleLeafSeparation(tree, nodes, sliderScaleH); // this will update x-pos

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
        .attr("r",sliderLeafR);
    svg.selectAll("g.leaf text")
        .attr("dx", sliderLeafR+3);


    // toggle leaf labels
    svg.selectAll('g.leaf.node text')
        .style('fill-opacity', skipLeafLabel? 1e-6 : 1 )

    // toggle distance labels
    svg.selectAll('g.inner.node text')
        .style('fill-opacity', skipDistanceLabel? 1e-6 : 1 )

    svg.selectAll('g.leaf.node text')
        .text(function(d) { return skipDistanceLabel ? d.name : d.name + ' ('+d.length+')'; });

    // remove legend if one exists so we can update
    d3.select("#legendID").remove()

    // col for legend
    if (leafColor || backgroundColor) {
        var legend = d3.select("svg g").append("g")
            .attr("id", "legendID")
            .attr("transform","translate(" + d3.select("svg").node().getBBox().width + ",0)");
    }


    // update leaf node
    if (leafColor && leafColor != '') {
        var colorScale = colorScales.get(leafColor); // color scale
        var mapVals = mapParse.get(leafColor); // d3.map() obj with leaf name as key

        // fill out legend
        generateLegend(leafColor, mapVals, legend, colorScale, 'circle', 'translate(5,0)');

        // update node styling
        svg.selectAll('g.leaf.node circle')
            .transition()
            .style('fill', function(d) {
                return mapVals.get(d.name) ? colorScale(mapVals.get(d.name)) : 'greenYellow'
            })
            .style('stroke', function(d) {
                return mapVals.get(d.name) ? 'gray' : 'yellowGreen'
            })
    } else if (leafColor == '') {
        svg.selectAll('g.leaf.node circle')
            .transition()
            .style('fill','greenYellow')
            .style('stroke','yellowGreen');
    }


    // update leaf background
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
        svg.selectAll('g.leaf.node rect')
            .transition()
            .attr("width", function(d) {
                var name = d.name.replace('.','_');
                var textWidth = d3.select('#leaf_' + name + ' text').node().getComputedTextLength();
                var radius = d3.select('#leaf_' + name + ' circle').node().getBBox().height / 2.0;
                return textWidth + radius + 10; // add extra so background is wider than label
            })
            .style('fill', function(d) {
                return mapVals.get(d.name) ? colorScale(mapVals.get(d.name)) : 'none'
            })
            .style('opacity',1)
    } else if (leafColor == '') {
        svg.selectAll('g.leaf.node rect')
            .transition(2000)
            .style('opacity','1e-6')
            .attr('width','0')
    }

    svg.call(tip);
    resizeSVG();

}




