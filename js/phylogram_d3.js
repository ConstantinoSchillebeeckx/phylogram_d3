/*
	d3.phylogram.js
	Wrapper around a d3-based phylogram (tree where branch lengths are scaled)
	Also includes a radial dendrogram visualization (branch lengths not scaled)
	along with some helper methods for building angled-branch trees.

	Copyright (c) 2013, Ken-ichi Ueda

	All rights reserved.

	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions are met:

	Redistributions of source code must retain the above copyright notice, this
	list of conditions and the following disclaimer. Redistributions in binary
	form must reproduce the above copyright notice, this list of conditions and
	the following disclaimer in the documentation and/or other materials
	provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
	AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
	ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
	LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
	CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
	SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
	INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
	CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
	ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
	POSSIBILITY OF SUCH DAMAGE.

	DOCUEMENTATION

	d3.phylogram.build(selector, nodes, options)
		Creates a phylogram.
		Arguments:
			selector: selector of an element that will contain the SVG
			nodes: JS object of nodes
		Options:
			vis
				Pre-constructed d3 vis.
			tree
				Pre-constructed d3 tree layout.
			children
				Function for retrieving an array of children given a node. Default is
				to assume each node has an attribute called "branchset"
			diagonal
				Function that creates the d attribute for an svg:path. Defaults to a
				right-angle diagonal.
			skipTicks
				Skip the tick rule.
			skipBranchLengthScaling
				Make a dendrogram instead of a phylogram.
			skipLabels
				Don't add labels to leaf nodes
            leafRadius
                Radius (int) of leaf circles
            mapping
                Parsed mapping file object, see output of parseMapping[0]
            colorScales
                Color scales used to color legend and parts of tree, see output of parseMapping[1]

            TODO

	d3.phylogram.buildRadial(selector, nodes, options)
		Creates a radial dendrogram.
		Options: same as build, but without diagonal, skipTicks, and
			skipBranchLengthScaling

	d3.phylogram.rightAngleDiagonal()
		Similar to d3.diagonal except it create an orthogonal crook instead of a
		smapParseth Bezier curve.

	d3.phylogram.radialRightAngleDiagonal()
		d3.phylogram.rightAngleDiagonal for radial layouts.
*/

// GLOBALS
// --------------
var mapParse, colorScales, mappingFile;

// use margin convention
// https://bl.ocks.org/mbostock/3019563
var margin = {top: 30, right: 0, bottom: 20, left: 50};
var startW = 800, startH = 600; // initial dimensions of SVG

// tooltip
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return formatTooltip(d, mapParse);
    })

// --------------
// GLOBALS








if (!d3) { throw "d3 wasn't included!"};
(function() {
	d3.phylogram = {}
	d3.phylogram.rightAngleDiagonal = function() {
		var projection = function(d) { return [d.y, d.x]; }

		var path = function(pathData) {
			return "M" + pathData[0] + ' ' + pathData[1] + " " + pathData[2];
		}

		function diagonal(diagonalPath, i) {
			var source = diagonalPath.source,
					target = diagonalPath.target,
					midpointX = (source.x + target.x) / 2,
					midpointY = (source.y + target.y) / 2,
					pathData = [source, {x: target.x, y: source.y}, target];
			pathData = pathData.map(projection);
			return path(pathData)
		}

		diagonal.projection = function(x) {
			if (!arguments.length) return projection;
			projection = x;
			return diagonal;
		};

		diagonal.path = function(x) {
			if (!arguments.length) return path;
			path = x;
			return diagonal;
		};

		return diagonal;
	}

	d3.phylogram.radialRightAngleDiagonal = function() {
		return d3.phylogram.rightAngleDiagonal()
			.path(function(pathData) {
				var src = pathData[0],
						mid = pathData[1],
						dst = pathData[2],
						radius = Math.sqrt(src[0]*src[0] + src[1]*src[1]),
						srcAngle = d3.phylogram.coordinateToAngle(src, radius),
						midAngle = d3.phylogram.coordinateToAngle(mid, radius),
						clockwise = Math.abs(midAngle - srcAngle) > Math.PI ? midAngle <= srcAngle : midAngle > srcAngle,
						rotation = 0,
						largeArc = 0,
						sweep = clockwise ? 0 : 1;
				return 'M' + src + ' ' +
					"A" + [radius,radius] + ' ' + rotation + ' ' + largeArc+','+sweep + ' ' + mid +
					'L' + dst;
			})
			.projection(function(d) {
				var r = d.y, a = (d.x - 90) / 180 * Math.PI;
				return [r * Math.cos(a), r * Math.sin(a)];
			})
	}

	// Convert XY and radius to angle of a circle centered at 0,0
	d3.phylogram.coordinateToAngle = function(coord, radius) {
		var wholeAngle = 2 * Math.PI,
				quarterAngle = wholeAngle / 4

		var coordQuad = coord[0] >= 0 ? (coord[1] >= 0 ? 1 : 2) : (coord[1] >= 0 ? 4 : 3),
				coordBaseAngle = Math.abs(Math.asin(coord[1] / radius))

		// Since this is just based on the angle of the right triangle formed
		// by the coordinate and the origin, each quad will have different
		// offsets
		switch (coordQuad) {
			case 1:
				coordAngle = quarterAngle - coordBaseAngle
				break
			case 2:
				coordAngle = quarterAngle + coordBaseAngle
				break
			case 3:
				coordAngle = 2*quarterAngle + quarterAngle - coordBaseAngle
				break
			case 4:
				coordAngle = 3*quarterAngle + coordBaseAngle
		}
		return coordAngle
	}

	d3.phylogram.styleTreeNodes = function(vis, leafRadius=4.5) {
		vis.selectAll('g.leaf.node')
			.append("svg:rect") // leaf background
                .attr('width', 0 ) // width is set when choosing background color
                .attr('height', 10 + leafRadius * 2) // +2 for stroke
                .attr('y', -leafRadius - 5);

        // replace . for ease of selecting when setting width of leaf background
		vis.selectAll('g.leaf.node')
            .attr("id", function(d) { return 'leaf_' + d.name.replace('.','_'); })
			.append("svg:circle")
				.attr("r", leafRadius)

		vis.selectAll('g.root.node')
			.append('svg:circle')
				.attr("r", leafRadius)
	}

	function scaleBranchLengths(nodes, w) {
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
			.range([0, w]);
		visitPreOrder(nodes[0], function(node) {
			node.y = yscale(node.rootDist)
		})
		return yscale
	}


    // finds the smallest vertical distance between leaves
    // and scales things to a minimum distance so that
    // branched don't overlap
    function scaleLeafHeight(nodes, h) {

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
        leafXpos = leafXpos.sort(function(a, b){return a-b});
        leafXpos.forEach(function(x,i) {
            if (i + 1 != leafXpos.length) {
                leafXdist.push(leafXpos[i + 1] - x);
            }
        })
        var minSeparation = 22; // minimum separation between leaves
        var xScale = d3.scale.linear()
            .range([0, minSeparation])
            .domain([0, d3.min(leafXdist)])

		traverseTree(nodes[0], function(node) {
			node.x = xScale(node.x)
		})

        return xScale;
    }

	// main tree building function
	d3.phylogram.build = function(selector, nodes, options) {

        // add bootstrap container class
        d3.select(selector)
            .attr("class","container-fluid render")

		options = options || {}


        // set initial w/h which are later updated once we know size of tree
        var w = startW - margin.right - margin.left;
        var h = startH - margin.top - margin.bottom;

        // build GUI
        var gui = buildGUI(selector, options.mapping);


		var tree = options.tree || d3.layout.cluster()
			.size([h, w])
			.sort(function(node) { return node.children ? node.children.length : -1; })
			.children(options.children || function(node) {
				return node.branchset
			});
		var diagonal = options.diagonal || d3.phylogram.rightAngleDiagonal();

		var tmp = options.vis || d3.select(selector).append("div")
                .attr("class","row")
                .attr("id","canvas")
       
        var vis = tmp.append("div")
                .attr("class", "col-sm-12")
                .attr("id","tree")
            .append("svg:svg")
                .attr("preserveAspectRatio","xMinYMin meet")
                .attr("width",w + margin.right + margin.left)
                .attr("height",h + margin.top + margin.bottom)
                .attr("xmlns","http://www.w3.org/2000/svg")
			.append("svg:g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        vis.call(tip);

		var nodes = tree(nodes);

        // scale tree 
		if (options.skipBranchLengthScaling) {
			var yscale = d3.scale.linear()
				.domain([0, w])
				.range([0, w]);
		} else {
			var yscale = scaleBranchLengths(nodes, w);
            var xscale = scaleLeafHeight(nodes, h);
		}

        // background ruler
		if (!options.skipTicks) {
			vis.selectAll('line.rule')
					.data(yscale.ticks(10))
				.enter().append('svg:line')
                    .attr("class", "rule")
					.attr('y1', 0)
					.attr('y2', xscale(h))
					.attr('x1', yscale)
					.attr('x2', yscale)

			vis.selectAll("text.rule")
					.data(yscale.ticks(10))
				.enter().append("svg:text")
					.attr("class", "rule")
					.attr("x", yscale)
					.attr("y", 0)
					.attr("dy", -3)
					.attr("text-anchor", "middle")
					.text(function(d) { return Math.round(d*100) / 100; });
		}

        // tree branches
		var link = vis.selectAll("path.link")
				.data(tree.links(nodes))
			.enter().append("svg:path")
				.attr("class", "link")
				.attr("d", diagonal)

        // tree node groups
		var node = vis.selectAll("g.node")
				.data(nodes)
			.enter().append("svg:g")
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
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)

        // tree nodes
		d3.phylogram.styleTreeNodes(vis, options.leafRadius)

        // node labels
		if (!options.skipLabels) {
			vis.selectAll('g.inner.node')
				.append("svg:text")
					.attr("dx", -6)
					.attr("dy", -6)
					.attr("text-anchor", 'end')
					.text(function(d) { return d.length; });

			vis.selectAll('g.leaf.node').append("svg:text")
				.attr("dx", 8)
				.attr("dy", 3)
				.attr("text-anchor", "start")
				.text(function(d) { return d.name + ' ('+d.length+')'; });
		}

        // now that the tree size has been generated,
        // set the container SVG to that size
        resizeSVG();

        d3.select('#spinner').remove()

		return {tree: tree, vis: vis}
	}

    // MAIN RADIAL TREE BUILD FUNCTION
	d3.phylogram.buildRadial = function(selector, nodes, options) {
        
        // TODO
        d3.select(selector).append("text")
            .attr("class","lead")
            .text("Not yet implemented")
        return
        // TODO

		options = options || {}
		var w = options.width || d3.select(selector).style('width') || d3.select(selector).attr('width'),
				r = w / 2,
				labelWidth = options.skipLabels ? 10 : options.labelWidth || 120;

		var vis = d3.select(selector)
            .append("div")
                .attr("class","row")
                .attr("id","tree")
            .append("div")
                .attr("class","col-sm-12")
            .append("svg:svg")
				.attr("width", r * 2)
				.attr("height", r * 2)
			.append("svg:g")
				.attr("transform", "translate(" + r + "," + r + ")");

		var tree = d3.layout.tree()
			.size([360, r - labelWidth])
			.sort(function(node) { return node.children ? node.children.length : -1; })
			.children(options.children || function(node) {
				return node.branchset
			})
			.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

		var phylogram = d3.phylogram.build(selector, nodes, {
			vis: vis,
			tree: tree,
			skipBranchLengthScaling: true,
			skipTicks: true,
			skipLabels: options.skipLabels,
			diagonal: d3.phylogram.radialRightAngleDiagonal()
		})
		vis.selectAll('g.node')
			.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

		if (!options.skipLabels) {
			vis.selectAll('g.leaf.node text')
				.attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
				.attr("dy", ".31em")
				.attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
				.attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
				.text(function(d) { return d.data.name; });

			vis.selectAll('g.inner.node text')
				.attr("dx", function(d) { return d.x < 180 ? -6 : 6; })
				.attr("text-anchor", function(d) { return d.x < 180 ? "end" : "start"; })
				.attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; });
		}

		return {tree: tree, vis: vis}
	}
}());


//d3.select(window).on('resize', resizeSVG);


function resizeSVG() {

    var g = d3.select('svg g').node().getBBox();
    var aspectRatio = g.width / g.height;
    var col = d3.select('#tree').node();
    /*if (col.offsetWidth < g.width) {
        w = col.offsetWidth
        h = col.offsetWidth / aspectRatio
    } else {
        w = g.width + margin.left + margin.right;
        h = g.height + margin.top + margin.bottom;
    }*/
    w = g.width + margin.left + margin.right;
    h = g.height + margin.top + margin.bottom;
    d3.select('svg')
        .attr("width", w)
        .attr("height", h)
        //.attr("viewBox", '0 0 ' + (w) + ' ' + (h)) // set viewbox so that SVG fits to containing column
        //.attr("class","img-responsive")
}



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






// given a local file path to a file, this will return
// the file contents as a string
function readFile(filePath) {
		var request = new XMLHttpRequest();
		request.open("GET", filePath, false);
		request.send(null);
		return request.responseText.split("'").join(''); // remove the extra ' surrounding strings
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




/* initialize tree

Function called from front-end with all user-defined
options to format the tree.

Parameters:
==========
- dat : string
		filepath for input Newick tre
- div : string
		div id (with included #) in which to generated tree
- map : string
		filepath to TSV mapping file (formats trees), expects
        first column to be labels for leafs

Calls d3.phylogram.build to generate tree

*/
function init(dat, div, mapp=null) {

        // check input
        if (dat == '') {
            d3.select(div).append('div')
                .attr('class','alert alert-danger lead col-sm-4 col-sm-offset-4')
                .style('margin-top','20px')
                .attr('role','alert')
                .html('Ensure a valid Newick tree file was passed to the <code>init()</code> function!')
           return; 
        }

        // give user a spinner for feedback
        var spinner = d3.select(div).append('div')
            .attr('id','spinner')
            .attr('class','lead alert alert-info col-sm-3 col-sm-offset-4')
            .style('margin-top','20px');

        spinner.append('i')
            .attr('class','fa fa-cog fa-spin fa-3x fa-fw')
        spinner.append('span')
            .text('Generating...');

        // process Newick tree
		var newick = Newick.parse(readFile(dat))
		var newickNodes = []
		function buildNewickNodes(node, callback) {
				newickNodes.push(node)
				if (node.branchset) {
						for (var i=0; i < node.branchset.length; i++) {
								buildNewickNodes(node.branchset[i])
						}
				}
		}


		// mapping file for formatting tree, expected to be a TSV
        // used to populate dropdowns
        mappingFile = mapp;
        if (mappingFile) {
            d3.tsv(mappingFile, function(error, data) {
                if (error) throw error;

                var parsed = parseMapping(data);
                mapParse = parsed[0];
                colorScales = parsed[1];

                d3.phylogram.build(div, newick, {
                        mapping: mapParse,
                        colorScale: colorScales,
                });
            });
        } else {
            d3.phylogram.build(div, newick, {
            });
        }
}




/* Process mapping file into useable format

Function responsible for parsing the TSV mapping
file which contains metadata for formatting the
tree leaves.  The TSV is reformatted into a more
useful form, also the color scales are created
for use in the legend and coloring the tree.

It is assumed that the first column in the mapping
file has the same values as the leaf names.

Parameters:
===========
- data: d3.tsv() data
    input mapping file processed by d3.tsv


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
    // get name of index column in mapping
    for (var index in data[0]) break;

    // convert to d3 map where key is 'index' col
    var mapObj = d3.map({})
    data.forEach(function(row) { 
        var key = row[index];
        delete row[index]
        mapObj.set(key,row)
    })


    // parse mapping file a bit so we can use it with
    // dropdown boxes and for defining color functions
    var mapParse = d3.map();
    // keys will be mapping column headers, values will be d3.map()
    // with leaf names as keys and mapping file values as the value
    mapObj.forEach(function(leaf,cols) {
        for (col in cols) {
            var colVal = cleanTaxa(cols[col]);
            if (!mapParse.has(col)) {
                var val = d3.map();
            } else {
                var val = mapParse.get(col);
            }
            val.set(leaf,colVal);
            mapParse.set(col, val);
        }
    });

    // setup color scales for mapping columns
    // keys are mapping column headers and values are scales 
    // for converting column value to a color
    var colorScales = d3.map();
    mapParse.forEach(function(k,v) { // v is a d3.set of mapping column values

        // check if values for mapping column are string or numbers
        // strings are turned into ordinal scales, numbers into quantitative
        // we simply check the first value in the obj
        var vals = autoSort(v.values(), true);
        var scale;
        if (typeof vals[0] === 'string' || vals[0] instanceof String) { // ordinal scale
            var tmp = d3.scale.category10();
            if (vals.length > 10) {
                tmp = d3.scale.category20();
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
            .attr("class","form-control") // input-xs

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














