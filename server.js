var express = require('express');
var bodyParser = require('body-parser');
var mongo = require("mongodb").MongoClient;
var objectID = require("mongodb").ObjectID;
var session = require('express-session');
var DB = "mongodb://localhost/cmap";

// Test de onnection à MongoDB.
mongo.connect(DB, function(error, db) {
    if(error) {
        console.log("ERREUR - Impossible de se conencter à MongoDB");
        throw error;
    }
    console.log("Connecté à la base de données 'cmap'");
});

// Configuration du framework express.
var app = express();
app.use("/css",express.static(__dirname + '/css'));
app.use("/images",express.static(__dirname + '/images'));
app.use("/js",express.static(__dirname + '/js'));
app.use("/html",express.static(__dirname + '/html'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//------------------------------------------------------------
// HELPERS
//------------------------------------------------------------

//------------------------------------------------------------
// ROUTES
//------------------------------------------------------------

/**
 * Affichage de la page login
 */
app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(__dirname + '/html/login.html');
});

/**
 * Recherche un utilisateur en base
 */
app.post('/connect', function (req, res) {
    mongo.connect(DB, function(error, db) {
        res.json(db.collection("users").find(req) != null);
        console.log(req);
    });
});

/**
 * Affichage de la homepage.
 */
app.get('/home', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(__dirname + '/html/home.html');
});

/**
 * Affichage de la page d'édition du graphe spécifié.
 */
app.get("/edit/:id", function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(__dirname + '/html/editor.html');
});

/**
 * Retourne un graphe entier grâce à son identifiant.
 * TODO : aller chercher en base le graphe demandé avec l'ensemble des ses liens et noeuds.
 */
app.get("/graph/get/:id", function (req, res) {
    console.log(req.params["id"]);
    res.json({ nodes: {}, links: {} });
});

/**
 * Retourne la liste de tous les graphes.
 */
app.get("/graph/getAll", function (req, res) {
    mongo.connect(DB, function(error, db) {
        db.collection("graphs").find().toArray(function(err, documents) {
            res.json(documents);
        });
    })
});

/**
 * Permet de créer un nouveau graphe.
 */
app.post("/graph/create", function (req,res) {
    req.body["date"] =  Date.now();
    mongo.connect(DB, function(error, db) {
        db.collection("graphs").insert(req.body, null, function (error, results) {
            res.json(results.ops[0]);
        });
    })
});

/**
 * Supprimer un graphe grâce à son id
 */
app.post("/graph/deleteOne", function (req,res) {
    mongo.connect(DB, function (error, db) {
        db.collection('graphs', {}, function (err, graphs) {
                graphs.remove({_id: new objectID(req.body['_id'])}, function (err, result) {
            });
        });
    });
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

io.on('connection', function(socket) {
    // Ajout d'un nouveau noeud.
    socket.on("node/add", function (node, fn) {
        mongo.connect(DB, function(error, db) {
            db.collection("nodes").insert(node, function (error, results) {
                fn(results.ops[0]);
                io.emit("node/added", results.ops[0]);
                console.log("NODE " + results.ops[0]._id + " ADDED");
            });
        });
    });
    // Met à jour un noeud
    socket.on("node/update", function (node, fn) {
        mongo.connect(DB, function (error, db) {
            db.collection('nodes').update({_id: new objectID(node._id)},
                {$set: {name: node.name, type: node.type, comment: node.comment, x: node.x, y: node.y, fixed: node.fixed}},
                function (error, results) {
                    io.emit("node/updated", node);
                    console.log("NODE " + node._id + " UPDATED");
            });
        });
    });
    // Suppression d'un noeud
    socket.on("node/remove", function (node, fn) {
        mongo.connect(DB, function (error, db) {
            db.collection('nodes').remove(node, function (error, results) {
                io.emit("node/removed", node);
                console.log("NODE " + node._id + " REMOVED");
            });
        });
    });
    // Ajout d'un lien.
    socket.on("link/add", function (link, fn) {
        mongo.connect(DB, function(error, db) {
            db.collection("links").insert(link, function (error, results) {
                fn(results.ops[0]);
                io.emit("link/added", results.ops[0]);
                console.log("LINK " + results.ops[0]._id + " ADDED");
            });
        });
    });
    // Suppression d'un lien
    socket.on("link/remove", function (link, fn) {
        mongo.connect(DB, function (error, db) {
            db.collection('links').remove(link, function (error, results) {
                io.emit("link/removed", link);
                console.log("LINK " + link._id + " REMOVED");
            });
        });
    });
});

http.listen(8080);