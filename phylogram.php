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
    </script>

    </head>

    <body onload="init('dat/stMAT.tre', '#phylogram', 'dat/mapping.txt');">


        <!-- div for tree -->
        <div id='phylogram'></div>

        <?php //include("../navbar.html");?>

    </body>

    <?php //include("../footer.html");?>

