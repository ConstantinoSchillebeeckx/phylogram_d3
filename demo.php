<!doctype html>

<html lang="en">

    <head>

        <!-- CSS -->
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
        <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet">
		<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Open+Sans" />
        <link href="https://cdn.rawgit.com/MasterMaps/d3-slider/master/d3.slider.css" rel="stylesheet">
        <link href="css/phylogram_d3.css" rel="stylesheet">

        <!-- JS -->
        <script type="text/javascript" src="https://code.jquery.com/jquery-2.2.4.min.js"></script>
        <script type="text/javascript" src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>
        <script type="text/javascript" src="https://cdn.rawgit.com/mbostock/5577023/raw/5ee09dca6afdbef864de89d4d6caa3296f926f00/colorbrewer.min.js	"></script>
        <script type="text/javascript" src="https://cdn.rawgit.com/jasondavies/newick.js/master/src/newick.js"></script>
        <script src="https://d3js.org/d3.v3.min.js"></script>
        <script src="http://labratrevenge.com/d3-tip/javascripts/d3.tip.v0.6.3.js"></script>
        <script type="text/javascript" src="https://cdn.rawgit.com/MasterMaps/d3-slider/master/d3.slider.js"></script>
        <script type="text/javascript" src="js/phylogram_d3.js"></script>
        <script type="text/javascript" src="js/utils.js"></script>

        <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>

    <body onload="init('dat/tree.tre', '#phylogram', 'dat/mapping.txt');">

        <!-- div for tree -->
        <div id='phylogram'></div>

    </body>
