# phylogram_d3

This project is an adaptation of the [GitHubGist](https://gist.github.com/) created by [kueda](https://gist.github.com/kueda/1036776).  Given a Newick formatted file as well as an OTU mapping file containing metadata for the leaves in the tree, the script is used to generate a rooted phylogenetic tree:
> A phylogenetic tree or evolutionary tree is a branching diagram or "tree" showing the inferred evolutionary relationships among various biological species or other entities—their phylogeny—based upon similarities and differences in their physical or genetic characteristics. The taxa joined together in the tree are implied to have descended from a common ancestor.

[- Wikipedia](https://en.wikipedia.org/wiki/Phylogenetic_tree#Unrooted_tree)

---
A demo.php file has been provided to render the tree; furthermore, demo data can be found in the directory `/dat`

A working demo can be found [here](http://meepmoop.com/phylogram/) which was used to generate the following:
![Render](https://rawgit.com/ConstantinoSchillebeeckx/phylogram_d3/master/tree_rect.png "Rectangular tree type")
![Render](https://rawgit.com/ConstantinoSchillebeeckx/phylogram_d3/master/tree_radial.png "Radial tree type")

## Dependencies
* [Twitter Bootstrap](https://getbootstrap.com/)

* [jQuery](https://jquery.com/)

* [Colorbrewer.js](https://bl.ocks.org/mbostock/5577023)

* [Newick.js](https://github.com/jasondavies/newick.js)

* [d3.js](https://d3js.org/)

* [D3-tip](https://github.com/emiguevara/d3-tip)

* [noUiSlider](http://refreshless.com/nouislider/)

## Usage

**in development**

Rendering the phylogram begins with the function [`init()`][1] which you can simply call in the `body` tag of your HTML page using the [onload](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onload) event handle: `<body onload="init(parameters);">`.  Currently, the function takes three parameters:

1. String indicating the location of the Newick tree used to build the phylogram.

2. String identifier for the div id into which to generate the phylogram, note that it must contain the '#' in it.  For example, if you want to render your tree in a div with the id 'phylogram' you'd pass '#phylogram' to the function and you'd need the following in your HTML: `<div id='phylogram'></div>`.

3. an **optional** object with tree parameters, this should be passed as a javascript object with the following optional keys
  * mapping_file : `(str)` location of OTU mapping file to use which associates leaves with metadata
  * mapping_dat : `(obj)` instead of passing the key *mapping_file* this key can be passed and takes the form as the output of [d3.csv.parse](https://github.com/d3/d3-3.x-api-reference/blob/master/CSV.md#parse)
  * treeType : `(str)` either rectangular or radial [default: rectangular]
  * hideRuler : `(bool)` if True, the background ruler will be hidden [default: show ruler]
  * skipBranchLengthScaling : `(bool)` if True, a [cladogram](https://en.wikipedia.org/wiki/Cladogram) will be displayed instead of a [phylogram](https://en.wikipedia.org/wiki/Phylogenetic_tree) [default: phylogram]
  * skipLabels : `(bool)` if True, all node labels will be hidden [default: show labels]


##### Notes on the OTU mapping file
The OTU mapping file is similar to a standard QIIME mapping file in that it associates additionaly metadata to the objects of interest; however in this case the objects of interest are OTUs instead of samples.  This file has the following caveats:

* must be a TSV with headers

* first column values must be the same as the leaf nodes in the Newick tree

* if providing taxonomy data, format it in the QIIME default manner (e.g. *k__bacteria_2;p__firmicutes;c__negativicutes;o__selenomonadales;f__veillonellaceae;g__megasphaera;s__elsdenii*).  If done correctly, this format will be parsed and cleaned up automatically

* if using categorical data (e.g. GroupA, GroupB) the legend will render a row for every category value

* if passing ordinal data (e.g. 0.4, 1.90) the legend will render a color bar with min/max values.  Therefore, if you have categorical data labeled with numbers (e.g. Site 1, 2, 3), ensure that you format the values with alphanumeric characters (e.g. Site1, Site2, Site3)

[1]: https://github.com/ConstantinoSchillebeeckx/phylogram_d3/blob/master/js/phylogram_d3.js#L126
