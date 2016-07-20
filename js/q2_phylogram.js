/*

    TODO

*/


/* initialize tree

This function is meant to be used with q2_phylogram
since QIIME2 does not allow cross-origin loading of
data.  This function must be loaded after the initial
init() defined in js/phylogram.js and will thus replace
it.

It is expected then, that the Newick file contents are
wrapped in the d3.jsonp.readNewick() callback.  Furthemore,
the contents of the mapping file will be stored in the var
options.mapping_dat.

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

    renderDiv = div;

    // show loading spinner
    showSpinner(renderDiv, true)

    //d3.text(dat, function(error, fileStr) {
    d3.jsonp(dat + '?callback=d3.jsonp.readNewick', function(fileStr) {

        if (fileStr == '' || fileStr == null) {
            var msg = 'Input file <code><a href="' + dat + '">' + dat + '</a></code> could not be parsed, ensure it is a proper Newick tree file!';
            displayErrMsg(msg, renderDiv);
        }

        // process Newick tree
        newick = processNewick(fileStr);


        // render tree
        buildTree(renderDiv, newick, options, function() { resizeSVG(); });
    });
}

