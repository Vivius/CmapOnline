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
        console.log(node);
        io.emit("new-node-response", node);
    });
});

http.listen(8080);