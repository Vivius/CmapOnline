var express = require('express');

var app = express();
app.use("/css",express.static(__dirname + '/css'));
app.use("/images",express.static(__dirname + '/images'));
app.use("/js",express.static(__dirname + '/js'));
app.use("/html",express.static(__dirname + '/html'));

//------------------------------------------------------------
// ROUTES
//------------------------------------------------------------
app.get('/', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(__dirname + '/index.html');
});

app.get("/getGraph/:id", function (req, res) {
    console.log(req.params["id"]);
    res.json({ graph: { nodes: {}, links: {} } });
});

//------------------------------------------------------------
// ERRORS
//------------------------------------------------------------
app.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
});

//------------------------------------------------------------
// SOCKET.IO
//------------------------------------------------------------

var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', function(socket){
    socket.on("new-node", function (node) {
        console.log("ADD NODE : " + node.id);
        io.emit("new-node-response", node);
    });
    socket.on("remove-node", function (node) {
        console.log("REMOVE NODE : " + node.id);
        io.emit("remove-node-response", node);
    })
});

http.listen(8080);