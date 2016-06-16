    <?php // include("../head.html");?>


    <head>

    <!-- CSS -->
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
    <link href="css/open_sans.css" rel="stylesheet">
    <link href="css/phylogram_d3.css" rel="stylesheet">

    <!-- JS -->
    <script type="text/javascript" src="js/jquery.min.js"></script>
    <script type="text/javascript" src="js/bootstrap.min.js"></script>
    <script type="text/javascript" src="js/colorbrewer.min.js"></script>
    <script type="text/javascript" src="js/newick.js"></script>
    <script type="text/javascript" src="js/d3.min.js"></script>
    <script type="text/javascript" src="js/phylogram_d3.js"></script>

    <script>
    </script>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>

    <body onload="init('dat/stMAT.tre', '#phylogram', 'dat/mapping.txt');">



        <!-- div for tree -->
        <div id='phylogram'></div>

        <?php //include("../navbar.html");?>

    </body>

    <?php //include("../footer.html");?>

