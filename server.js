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

var MongoClient = require("mongodb").MongoClient;
MongoClient.connect("mongodb://localhost/CmapDb", function(error, db) {
    if (error) return funcCallback(error);
    console.log("Connecté à la base de données 'CmapDb' \n");


    db.collection("nodes").find().toArray(function (error, results) {
        if (error) throw error;

        results.forEach(function(obj) {
            console.log(
                "ID_Object : "  + obj._id.toString() + "\n"+
                "Nom : " + obj.name + "\n"+
                "Type : " + obj.type + "\n"
            );
        });
    });
});

io.on('connection', function(socket){

});




http.listen(8080);