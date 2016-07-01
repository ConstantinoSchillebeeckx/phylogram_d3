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

// tooltip 
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return formatTooltip(d, mapParse);
    })


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

    // show loading spinner
    showSpinner(div, true)

    // ensure file exists and can be read
    var fileStr = false;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status != 404) {
                fileStr = xhr.responseText.split("'").join(''); // remove the extra ' surrounding strings
            } else {
                var msg = 'Input file <code>' + dat + '</code> could not be parsed, ensure it is a proper Newick tree file!';
                displayErrMsg(msg, div);
                return false;
            }
        }
    }

    xhr.open("GET", dat, false);
    xhr.send();


    // process Newick tree
    var newick = processNewick(fileStr);


    // render tree
    if (mapp) {
        d3.tsv(mapp, function(error, data) {
            if (error) throw error;

            var parsed = parseMapping(data);
            mapParse = parsed[0];
            colorScales = parsed[1];

            options = {
                mapping: mapParse,
                colorScale: colorScales,
            }

            buildTree(div, newick, options);
        });
    } else {
        buildTree(div, newick, {});
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

    // setup SVG and divs
    var width = startW - margin.left - margin.right,
        height = startH - margin.top - margin.bottom;

    var tmp = d3.select(div).append("div")
            .attr("class","row")
            .attr("id","canvas")

    var svg = tmp.append("div")
            .attr("class", "col-sm-12")
            .attr("id","tree")
        .append("svg:svg")
            .attr("preserveAspectRatio","xMinYMin meet")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .attr("xmlns","http://www.w3.org/2000/svg")
        .append("svg:g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    // setup tree
    var tree = d3.layout.cluster()
        .sort(function(node) { return node.children ? node.children.length : -1; })
        .children(function(node) {
            return node.branchset
        })
        .size([height, width]);

    var nodes = tree.nodes(newick);
    var links = tree.links(nodes);

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
        var xscale = scaleLeafSeparation(nodes);
    }

    // format tree (ndes, links, labels, ruler)
    formatTree(svg, nodes, links, yscale, xscale, height, options);


    resizeSVG();
    showSpinner(null, false); // hide spinner

}










