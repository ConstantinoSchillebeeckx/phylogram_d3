    <?php // include("../head.html");?>


    <head>

    <!-- CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
    <link href="css/open_sans.css" rel="stylesheet">
    <link href="css/phylogram_d3.css" rel="stylesheet">

    <!-- JS -->
    <script type="text/javascript" src="js/jquery.min.js"></script>
    <script type="text/javascript" src="js/d3.min.js"></script>
    <script type="text/javascript" src="js/phylogram_d3.js"></script>
    <script type="text/javascript" src="js/newick.js"></script>

    <script>
        // function called when GUI is updated by user
        // calls updateTree() so that tree can be updated
        function guiUpdate() {

            skipDistanceLabel = !$('#toggle_distance').is(':checked');
            skipLeafLabel = !$('#toggle_leaf').is(':checked');

            updateTree(skipDistanceLabel, skipLeafLabel);
        }
    </script>

    </head>

    <body onload="init('dat/stMAT.tre', '#phylogram');">

        <!-- controls for tree -->
        <input type="checkbox" id="toggle_distance" value="toggle_distance" checked onclick="guiUpdate(this)" /> 
        Toggle distance labels
        <input type="checkbox" id="toggle_leaf" value="toggle_leaf" checked onclick="guiUpdate(this)" /> 
        Toggle leaf labels

        <!-- div for tree -->
        <div id='phylogram'></div>

        <?php //include("../navbar.html");?>

    </body>

    <?php //include("../footer.html");?>

