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
			width
				Width of the vis, will attempt to set a default based on the width of
				the container.
			height
				Height of the vis, will attempt to set a default based on the height
				of the container.
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
                .attr('width', 200) // XXX what width do we want?
                .attr('height',2 + leafRadius * 2) // +2 for stroke
                .attr('y',-leafRadius - 1) // -1 for stroke

		vis.selectAll('g.leaf.node')
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

	// main tree building function
	d3.phylogram.build = function(selector, nodes, options) {
		options = options || {}

        // build GUI
        var gui = buildGUI(selector, options.mapping);


		var w = options.width || d3.select(selector).style('width') || d3.select(selector).attr('width'),
				h = options.height || d3.select(selector).style('height') || d3.select(selector).attr('height'),
				w = parseInt(w),
				h = parseInt(h);
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
                .attr("class","col-sm-8")
                .attr("id","tree")
            .append("svg:svg")
                .attr("preserveAspectRatio","xMidYMid meet")
                .attr("viewBox", '0 0 ' + (w + 300) + ' ' + (h + 300))
			.append("svg:g")
				.attr("transform", "translate(20, 20)");


		var nodes = tree(nodes);

		if (options.skipBranchLengthScaling) {
			var yscale = d3.scale.linear()
				.domain([0, w])
				.range([0, w]);
		} else {
			var yscale = scaleBranchLengths(nodes, w)
		}



		if (!options.skipTicks) {
			vis.selectAll('line.rule')
					.data(yscale.ticks(10))
				.enter().append('svg:line')
                    .attr("class", "rule")
					.attr('y1', 0)
					.attr('y2', h)
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

		var link = vis.selectAll("path.link")
				.data(tree.links(nodes))
			.enter().append("svg:path")
				.attr("class", "link")
				.attr("d", diagonal)

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

		d3.phylogram.styleTreeNodes(vis, options.leafRadius)

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

		return {tree: tree, vis: vis}
	}

	d3.phylogram.buildRadial = function(selector, nodes, options) {
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



/* Function used to update existing tree

Function called from front-end everytime GUI
is changed; this will redraw the tree based
on GUI settings

Parameters:
==========
- dat : string
		filepath for input Newick tre
- div : string
		div id (with included #) in which to generated tree
- skipDistances : bool
		option for skipDistances (don't draw distance values on tree)
- skipLabels : bool
		option for skipLabels (don't draw label on leaf)
TODO

*/
function updateTree(skipDistanceLabel, skipLeafLabel, leafColor, backgroundColor) {

    tree = d3.select('svg');

    // toggle leaf labels
    tree.selectAll('g.leaf.node text')
        .style('fill-opacity', skipLeafLabel? 1e-6 : 1 )

    // toggle distance labels
    tree.selectAll('g.inner.node text')
        .style('fill-opacity', skipDistanceLabel? 1e-6 : 1 )

    // col for legend
    if (leafColor || backgroundColor) {

        d3.select("#legendID").remove()

        var legend = d3.select("#canvas").append("div")
            .attr("class","col-sm-4")
            .attr("id", "legendID")
            .append("svg")
                .attr("preserveAspectRatio","xMidYMid meet")
                .attr("viewBox", '0 0 ' + 600 + ' ' + ((d3.select('#tree svg').node().getBBox().height) + 300))
    }


    // update leaf color
    if (leafColor) {
        var colorScale = colorScales.get(leafColor); // color scale
        var mapVals = mapParse.get(leafColor); // d3.map() obj with leaf name as key

        // get unique values for chosen category and sort
        // alphabetically or descending if integer
        var uniqueVals = d3.set(mapVals.values()).values().map(filterTSVval);
        var sorted = (typeof uniqueVals[0] === 'string' || uniqueVals[0] instanceof String) ? uniqueVals.sort() : uniqueVals.sort().reverse();

        // fill out legend
        generateLegend(leafColor, sorted, legend, colorScale, 'circle', 'translate(5,25)');

        // update node styling
        tree.selectAll('g.leaf.node circle')
            .style('fill', function(d) {
                return colorScale(mapVals.get(d.name))
            })
            .style('stroke', 'white')
    }


    // update background color
    if (backgroundColor) {
        var colorScale = colorScales.get(backgroundColor) // color scale
        var mapVals = mapParse.get(backgroundColor) // d3.map() obj with leaf name as key 

        // get unique values for chosen category and sort
        // alphabetically or descending if integer
        var uniqueVals = d3.set(mapVals.values()).values().map(filterTSVval);
        var sorted = (typeof uniqueVals[0] === 'string' || uniqueVals[0] instanceof String) ? uniqueVals.sort() : uniqueVals.sort().reverse();


        // fill out legend
        var offset = 25;
        if (leafColor) {
            var offset = offset + 10 + d3.select('#legendID svg g').node().getBBox().height
        }
        generateLegend(backgroundColor, sorted, legend, colorScale, 'rect', 'translate(5,' + offset + ')');

        // update node background style
        tree.selectAll('g.leaf.node rect')
            .style('fill', function(d) {
                return colorScale(mapVals.get(d.name))
            })
            .style('opacity',1)
    }


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
- sorted: array
    array of items to populate legend with
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
function generateLegend(title, sorted, container, colorScale, type, transform) {

    var legend = container.append("g")
            .attr("transform",transform)

    legend.append("text")
        .attr("class","lead")
        .text(title);

    var legendRow = legend.selectAll('g.legend')
        .data(sorted).enter()
        .append('g')
            .attr('class', 'legend')
            .attr('transform', function(d,i) { return 'translate(5,' + (25 + i * 20) + ')'; } )
        
    if (type == 'circle') {
        legendRow.append(type)
            .attr('r', 4.5)
            .attr('fill', function(d) { return colorScale(d) } ) 
    } else if (type == 'rect') {
        legendRow.append(type)
            .attr('width', 9)
            .attr('height', 9)
            .attr('x', -4.5)
            .attr('y', -4.5)
            .attr('fill', function(d) { return colorScale(d) } ) 
    }
        
    legendRow.append('text')
            .attr('dx', 8)
            .attr('dy', 3)
            .attr('text-anchor', 'start')
            .text(function(d) { return d })
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
    } else if (/^(\-|\+)?([0-9])$/.test(value)) { // if int
        return parseInt(value);
    }
    return value;
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
- mappingFile : string
		filepath to TSV mapping file (formats trees), expects
        first column to be labels for leafs

Calls d3.phylogram.build to generate tree

*/
function init(dat, div, mappingFile=null) {
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
		buildNewickNodes(newick)


		// mapping file for formatting tree, expected to be a TSV
        if (mappingFile) {
            d3.tsv(mappingFile, function(error, data) {
                if (error) throw error;

                // get name of index column in mapping
                for (var index in data[0]) break;

                // convert to d3 map where key is 'index' col
                var mapObj = d3.map({})
                data.forEach(function(row) { 
                    var key = row[index];
                    delete row[index]
                    mapObj.set(key,row)
                })

                d3.phylogram.build(div, newick, {
                        width: 800,
                        height: 600,
                        mapping: mapObj,
                });
            });
        } else {
            d3.phylogram.build(div, newick, {
                    width: 800,
                    height: 600,
            });
        }
}





// function called (from front-end GUI) every time
// GUI is updated by user
// calls updateTree() so that tree style can be updated
function guiUpdate() {

    // get checkbox state
    skipDistanceLabel = !$('#toggle_distance').is(':checked');
    skipLeafLabel = !$('#toggle_leaf').is(':checked');

    // get dropdown values
    var e = document.getElementById("leafColor");
    var leafColor = e.options[e.selectedIndex].text;
    var e = document.getElementById("backgroundColor");
    var backgroundColor = e.options[e.selectedIndex].text;


    updateTree(skipDistanceLabel, skipLeafLabel, leafColor, backgroundColor);
}


/* Generated front-end GUI controls

Build all the HTML elements that serve as GUI controls for
editing the tree format.

TODO


Parameters:
==========
- selector : string
    div ID (with '#') into which to place GUI controls
- mapping : d3 map obj
    optional parsed mapping file; if present, two
    select dropdowns are generated with the columns
    of the file.  one dropdown is for coloring the
    leaf nodes, the other for the leaf backgrounds

*/

// parsed mapping file object
// keys will be mapping column headers, values will be d3.map()
// with leaf names as keys and mapping file values as the value
var mapParse = d3.map();
// keys are mapping column headers and values are scales 
// for converting column value to a color
var colorScales = d3.map();
function buildGUI(selector, mapping) {

    // add bootstrap container class
    d3.select(selector)
        .attr("class","container-fluid")

    var gui = d3.select(selector).append("div")
        .attr("id", "gui")
        .attr("class","form-inline")

    gui.append("div")
        .attr("class","checkbox")
        .append("label")
        .append("input")
        .attr("type","checkbox")
        .attr("id","toggle_distance")
        .attr("checked","")
        .attr("onclick","guiUpdate(this)")
        .text("Toggle distance labels")


    gui.append("div")
        .attr("class","checkbox")
        .append("label")
        .append("input")
        .attr("type","checkbox")
        .attr("id","toggle_leaf")
        .attr("checked","")
        .attr("onclick","guiUpdate(this)")
        .text("Toggle leaf labels")


    if (!mapping.empty()) {


        // parse mapping file a bit so we can use it with
        // dropdown boxes and for defining color functions
        mapping.forEach(function(leaf,cols) {
            for (col in cols) {
                var colVal = cols[col];
                if (!mapParse.has(col)) {
                    var val = d3.map()
                } else {
                    var val = mapParse.get(col);
                }
                val.set(leaf,colVal);
                mapParse.set(col, val);
            }
        });

        // setup color scales for mapping columns
        mapParse.forEach(function(k,v) { // v is a d3.set of mapping column values

            // check if values for mapping column are string or numbers
            // strings are turned into ordinal scales, numbers into quantitative
            // we simple check the first value in the obj
            var val = filterTSVval(v.values()[0])
            if (typeof val === 'string' || val instanceof String) { // ordinal scale
                colorScales.set(k, d3.scale.category20c().domain(v.values()))
            } else { // quantitative scale
                colorScales.set(k,d3.scale.ordinal()
                    .domain(v.values())
                    .range(colorbrewer.RdBu[4]));
            }
        })

        // select for leaf color
        var leafSelect = gui.append("div")
            .attr("class","form-group")

        leafSelect.append("label")
            .text("Leaf node color")

        var select1 = leafSelect.append("select")
            .attr('onchange','guiUpdate(this)')
            .attr('id','leafColor')
            .attr("class","form-control")

        select1.selectAll("option")
            .data(mapParse.keys()).enter()
            .append("option")
            .text(function(d) { return d; })

        select1.append("option")
            .attr("selected","")
            .attr("disabled","")
            .attr("hidden","")
            .style("display","none")
            .attr("value","")
        // select for leaf color


        // select for background color
        var backgroundSelect = gui.append("div")
            .attr("class","form-group")

        backgroundSelect.append("label")
            .text("Leaf background color")

        var select2 = backgroundSelect.append("select")
            .attr('onchange','guiUpdate(this)')
            .attr('id','backgroundColor')
            .attr("class","form-control")

        select2.selectAll("option")
            .data(mapParse.keys()).enter()
            .append("option")
            .text(function(d) { return d; })

        select2.append("option")
            .attr("selected","")
            .attr("disabled","")
            .attr("hidden","")
            .style("display","none")
            .attr("value","")
        // select for background color
    }

}

















