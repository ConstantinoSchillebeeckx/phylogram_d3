<!doctype html>

<html lang="en">

    <head>

        <!-- CSS -->
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
        <link href="css/bootstrap.min.css" rel="stylesheet">
        <link href="css/open_sans.css" rel="stylesheet">
        <link href="css/phylogram_d3.css" rel="stylesheet">

        <!-- JS -->
        <script type="text/javascript" src="js/jquery.min.js"></script>
        <script type="text/javascript" src="js/bootstrap.min.js"></script>
        <script type="text/javascript" src="js/colorbrewer.min.js"></script>
        <script type="text/javascript" src="js/newick.js"></script>
        <script src="https://d3js.org/d3.v4.min.js"></script>
        <!-- <script src="http://labratrevenge.com/d3-tip/javascripts/d3.tip.v0.6.3.js"></script> -->
        <script type="text/javascript" src="js/phylogram_d3.js"></script>
        <script type="text/javascript" src="js/utils.js"></script>


        <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>

    <body onload="init('dat/tree.tre', '#phylogram', 'dat/mapping.txt');">

        <!-- div for tree -->
        <div id='phylogram'></div>

    </body>

