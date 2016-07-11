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
var width = startW - margin.left - margin.right;
var height = startH - margin.top - margin.bottom;
var nodes, links, node, link;
var newick;

// tree defaults
var treeType = 'rectangular'; // rectangular or circular [currently rendered treeType]
var scale = true; // if true, tree will be scaled by distance metric

// tooltip 
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return formatTooltip(d, mapParse);
    })
var outerRadius = startW / 2,
    innerRadius = outerRadius - 170;
var renderDiv; // svg is rendered here

var tree; // will be set to one of the following tree types
// TODO can consolidate tree types into a single one
// setup radial tree
var radialTree = d3.layout.cluster()
    .size([360, innerRadius])
    .children(function(d) { return d.branchset; })

// setup rectangular tree
var rectTree = d3.layout.cluster()
    //.sort(function(node) { return node.children ? node.children.length : -1; })
    .children(function(node) {
        return node.branchset
    })
    .size([height, width]);

var duration = 1000;


// https://jsfiddle.net/chrisJamesC/3MShS/
var numberOfPoints = 30;
var lineLength = startH;

function circleData(r) { 
    var points = [];
    $.map(Array(numberOfPoints), function (d, i) {
        var imag = lineLength / 2 + r * Math.sin(2 * i * Math.PI / (numberOfPoints - 1))
        var real = r - r * Math.cos(2 * i * Math.PI / (numberOfPoints - 1))
        points.push({x: imag, y: real})
    }) 
    return points;
}

function lineData(y) {
    var points = [];
    $.map(Array(numberOfPoints), function (d, i) {
        var x = i * lineLength / (numberOfPoints - 1)
        points.push({ x: y, y: x})
    }).reverse()
    return points;
}

var lineFunction = d3.svg.line()
    .x(function (d) {return d.x;})
    .y(function (d) {return d.y;})
    .interpolate("cardinal");

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
- options: obj
           options object with potential keys and values

Options obj:
- mapping_file: path to OTU mapping file (if there is one)
- hideRuler: (bool) if true, background distance ruler is not rendered TODO
- skipBranchLengthScaling: (bool) if true, tree will not be scaled by distance TODO
- skipLabels: (bool) if true, leaves will not be labeled by name or distance
- treeType: either rectangular or radial
TODO

*/
function init(dat, div, options={}) {

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
    if ('mapping_file' in options) {
        d3.tsv(options.mapping_file, function(error, data) {
            if (error) throw error;

            var parsed = parseMapping(data);
            mapParse = parsed[0];
            colorScales = parsed[1];

            options['mapping'] = mapParse;
            options['colorScale'] = colorScales;

            buildTree(renderDiv, newick, options);
        });
    } else {
        buildTree(renderDiv, newick, options);
    }
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
- options: obj
           options object with potential keys and values


Retrurns:
=========
- nothing

*/

function buildTree(div, newick, options) {

    // check options, if not set, set to default
    if (!('treeType' in options)) { 
        options['treeType'] = treeType;
    } else {
        treeType = options.treeType;
    }
    if (!('skipBranchLengthScaling' in options)) { 
        options['skipBranchLengthScaling'] = !scale;
    } else {
        scale = options.skipBranchLengthScaling;
    }

    // add bootstrap container class
    d3.select(div)
        .attr("class","container-fluid render")

    // build GUI
    if ('mapping' in options) {
        var gui = buildGUI(div, options.mapping);
    }

    var tmp = d3.select(renderDiv).append("div")
            .attr("class","row")
            .attr("id","canvas")

    // NOTE: size of SVG and SVG g are updated in resizeSVG()
    svg = tmp.append("div")
            .attr("class", "col-sm-12")
            .attr("id","tree")
        .append("svg:svg")
            .attr("preserveAspectRatio","xMinYMin meet")
            .attr("xmlns","http://www.w3.org/2000/svg")
            .attr("width",startW)
            .attr("height",startH)
        .append("g") // svg g group is translated in updateTree()
            .attr("id",'canvasSVG')

    svg.append("g")
            .attr("id","rulerSVG")
    svg.append("g")
            .attr("id","treeSVG")


    // generate intial layout and all tree elements
    if (options.treeType == 'rectangular') {
        d3.select("#canvasSVG").attr("transform","translate(" + margin.left + "," + margin.top + ")")
        tree = rectTree;
    } else if (options.treeType == 'radial') {
        d3.select("#canvasSVG").attr("transform","translate(" + (innerRadius + margin.left) + "," + (innerRadius + margin.top) + ")")
        tree = radialTree;
    }

    // initial format of tree (nodes, links, labels, ruler)
    nodes = tree.nodes(newick);
    if (!options.skipBranchLengthScaling) { var yscale = scaleBranchLengths(nodes); }
    if (options.treeType == 'rectangular') { var xscale = scaleLeafSeparation(tree, nodes); }
    links = tree.links(nodes);
    formatTree(nodes, links, yscale, xscale, height, options);

    svg.call(tip);
    resizeSVG();

    showSpinner(null, false); // hide spinner

}






/* Function used to update existing tree

Function called from front-end everytime GUI
is changed; this will redraw the tree based
on GUI settings.

Assumes globals (nodes, links) exist

*/
function updateTree(options={}) {

    // set tree type if GUI was updated
    // by anything other than tree type
    // buttons
    if (!('treeType' in options)) {
        options['treeType'] = treeType;
    }

    // get checkbox state
    options['skipDistanceLabel'] = !$('#toggle_distance').is(':checked');
    options['skipLeafLabel'] = !$('#toggle_leaf').is(':checked');
    options['skipBranchLengthScaling'] = !$('#scale_distance').is(':checked');

    // get slider vals
    options['sliderScaleH'] = scaleHSlider.value(); 
    options['sliderLeafR'] = leafRSlider.value();

    // get dropdown values
    var leafColor, backgroundColor;
    if (!mapParse.empty()) {
        var e = document.getElementById("leafColor");
        options['leafColor'] = e.options[e.selectedIndex].value;
        var e = document.getElementById("backgroundColor");
        options['backgroundColor'] = e.options[e.selectedIndex].value;
    }


    // adjust physical positioning
    if (options.treeType != treeType || options.skipBranchLengthScaling != scale) {

        if (options.treeType == 'rectangular') {

            if (options.treeType != treeType) {
                d3.select("#canvasSVG")
                    //.transition()
                    //.duration(duration)
                    .attr("transform","translate(" + margin.left + "," + margin.top + ")")
            }

            nodes = rectTree.nodes(newick);
            var xscale = scaleLeafSeparation(tree, nodes, options.sliderScaleH);
            if (!options.skipBranchLengthScaling) { 
                var yscale = scaleBranchLengths(nodes); 
                d3.selectAll("g.ruleGroup").remove()
                formatRuler('#rulerSVG', yscale, xscale, height, options);
            }
            links = rectTree.links(nodes)

            node.data(nodes)
                //.transition()
                //.duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + d.y + "," + d.x + ")";
                });

            link.data(links)
                //.transition()
                //.duration(duration)
                .attr("d", elbow)

            /*
            rulerG.data(function(d) { return [lineData(yscale(d))] })
                    .transition()
                    .duration(duration)
                    .attr("d",lineFunction)
            */


        } else if (options.treeType == 'radial') {

            if (options.treeType != treeType) {
                d3.select("#canvasSVG")
                    //.transition()
                    //.duration(duration)
                    .attr("transform","translate(" + (outerRadius + margin.left) + "," + (outerRadius + margin.top) + ")")
            }

            nodes = radialTree.nodes(newick);
            if (!options.skipBranchLengthScaling) { 
                var yscale = scaleBranchLengths(nodes); 
                d3.selectAll("g.ruleGroup").remove()
                formatRuler('#rulerSVG', yscale, null, height, options);
            }
            links = radialTree.links(nodes)

            node.data(nodes)
                //.transition()
                //.duration(duration)
                .attr("transform", function(d) {
                    return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                });


            link.data(links)
                //.transition()
                //duration.duration(duration)
                .attr("d", function(d) { return step(d.source.x, d.source.y, d.target.x, d.target.y); })

            /*
            rulerG.data(function(d) { return [circleData(yscale(d))] })
                    .transition()
                    .duration(duration)
                    .attr("d",lineFunction)
            */
        }

        // if tree type changes
        // adjust some label positioning
        if (options.treeType != treeType) {
            d3.selectAll("g.node text")
                .attr("text-anchor", function(d) { return options.treeType == 'radial' && d.x > 180 ? "end" : "start" })
                .attr("transform", function(d) { return options.treeType == 'radial' && d.x > 180 ? "rotate(180)" : "" })

            d3.selectAll("g.inner text")
                .attr("dx", function(d) { return options.treeType == 'radial' && d.x > 180 ? 20 : -20 })
        }

        treeType = options.treeType; // update current tree type
        scale = options.skipBranchLengthScaling;


    }

    if (options.treeType == 'rectangular') {
        scaleLeafSeparation(tree, nodes, options.sliderScaleH); // this will update x-pos

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
    svg.selectAll("g.leaf text")
        .attr("dx", function(d) { return options.treeType == 'radial' && d.x > 180 ? -8 - options.sliderLeafR : options.sliderLeafR + 8 });


    // toggle leaf labels
    svg.selectAll('g.leaf.node text')
        .style('fill-opacity', options.skipLeafLabel? 1e-6 : 1 )

    // toggle distance labels
    svg.selectAll('g.inner.node text')
        .style('fill-opacity', options.skipDistanceLabel? 1e-6 : 1 )

    svg.selectAll('g.leaf.node text')
        .text(function(d) { return options.skipDistanceLabel ? d.name : d.name + ' ('+d.length+')'; });

    // remove legend if one exists so we can update
    d3.selectAll("#legendID g").remove()

    // update leaf node
    if (options.leafColor != '') {
        var colorScale = colorScales.get(options.leafColor); // color scale
        var mapVals = mapParse.get(options.leafColor); // d3.map() obj with leaf name as key

        // fill out legend
        generateLegend(options.leafColor, mapVals, colorScale, 'circle');

        // update node styling
        svg.selectAll('g.leaf.node circle')
            .transition()
            .style('fill', function(d) {
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
                var name = d.name.replace('.','_');
                var textWidth = d3.select('#leaf_' + name + ' text').node().getComputedTextLength();
                var radius = d3.select('#leaf_' + name + ' circle').node().getBBox().height / 2.0;
                return textWidth + radius + 10; // add extra so background is wider than label
            })
            .style('fill', function(d) {
                return mapVals.get(d.name) ? colorScale(mapVals.get(d.name)) : 'none'
            })
            .style('opacity',1)
    } else if (options.leafColor == '') {
        svg.selectAll('g.leaf.node rect')
            .transition(2000)
            .style('opacity','1e-6')
            .attr('width','0')
    }


    resizeSVG();
}




