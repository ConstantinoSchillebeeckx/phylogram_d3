/*

    TODO

*/


/* initialize tree

This functino is meant to be used with q2_phylogram
since QIIME2 does not allow cross-origin loading of
data.  This function must be loaded after the initial
init() defined in js/phylogram.js

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
        if ('mapping_file' in options) {
            mappingFile = options.mapping_file;
            d3.tsv(mappingFile, function(error, data) {
                options.mapping_dat = data;
                buildTree(renderDiv, newick, options, function() { resizeSVG(); });
            });
        } else {
            buildTree(renderDiv, newick, options, function() { resizeSVG(); });
        }
    });
}

