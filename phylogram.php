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
        function readFile(filePath) {
            var request = new XMLHttpRequest();
            request.open("GET", filePath, false);
            request.send(null);
            return request.responseText;
        }


      function load() {

        var readTre = readFile("dat/stMAT.tre");


        var newick = Newick.parse(readTre)
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
        
        
        d3.phylogram.build('#phylogram', newick, {
          width: 300,
          height: 400
        });
      }
    </script>


    </head>

    <body  onload="load();">

        <div id='phylogram'></div>

        <?php //include("../navbar.html");?>

    </body>

    <?php //include("../footer.html");?>

