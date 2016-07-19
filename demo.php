<!doctype html>

<html lang="en">

    <head>

        <!-- CSS -->
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
        <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet">
	<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Open+Sans:400,300,700,800" />
	<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Montserrat:400,300,700,800" />
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

        <script>
            var meow = "((((62937:0.03385,New.ReferenceOTU2008:0.22333)0.784:0.00054,(30514:0.32839,6133:0.30268)0.245:0.02773)0.794:0.04966,(((((1297:0.20715,19844:0.03332)0.916:0.16792,(11230:0.09016,17804:0.06286)0.758:0.21143)0.981:0.02059,2806:0.21023)0.408:0.02782,25985:0.76686)0.906:0.01434,(50643:0.36686,((30656:0.18711,6304:0.05099)0.974:0.01475,(7476:0.03728,61094:0.00823)0.465:0.09453)0.704:0.03715)0.790:0.1054)0.893:0.03426)0.877:0.00799,(63148:0.01987,22820:0.14762)0.923:0.03811);";
        </script>

    </head>

    <script> 
        var treeOptions = {
            'mapping_file': 'dat/mapping.txt',
            'treeType': 'rectangular',
            'hideRuler': false,
            'skipBranchLengthScaling': false,
            'skipLabels': false,
        }
    </script>
    <body onload="init(meow, '#phylogram', treeOptions);">

        <!-- div for tree -->
        <div id='phylogram'></div>

    </body>
