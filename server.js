var express = require('express');
var bodyParser = require('body-parser');
var mongo = require("mongodb").MongoClient;
var objectID = require("mongodb").ObjectID;
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

/**
 * Permet de convertir un noeud venant de la base pour l'envoyer au client.
 * Sert principalement à modifier le nom de l'attribut représentant l'identifiant.
 * @param node
 */
function convertNodeforClient(node) {
    if(node._id) {
        node.id = node._id;
        delete node._id;
    }
    return node;
}

/**
 * Permet de transformer correctement un noeud avant de l'ajouter en base.
 * Procède principalement à des transtypages.
 */
function convertNodeForDatabase(node) {
    if(node.id) {
        node._id = node.id;
        delete node.id;
    }
    node.y = parseInt(node.y);
    node.x = parseInt(node.x);
    node.fixed = node.fixed === "true"; // Cast en booléen.
    return node;
}

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
app.post('/connect', function (req) {
    mongo.connect(DB, function(error, db) {
        db.collection("users").find(req.user);
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
 * Permet de créer un nouveau graphe.
 */
app.get("/graph/create", function () {
    // TODO : retourn un nouveau graphe après l'avoir ajouté en base.
});

/**
 * Création d'un nouveau noeud (carte) en base.
 */
app.post("/node/create", function (req, res) {
    mongo.connect(DB, function(error, db) {
        db.collection("nodes").insert(convertNodeForDatabase(req.body), null, function (error, results) {
            res.json(convertNodeforClient(results.ops[0]));
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
    // Ajout d'un noeud pour tous les clients.
    socket.on("node/add", function (node) {
        console.log("ADD NODE : " + node.id);
        io.emit("node/added", convertNodeforClient(node));
    });
    // Suppression d'un noeud pour tous les clients.
    socket.on("node/remove", function (node) {
        console.log("REMOVE NODE : " + node.id);
        io.emit("node/removed", node);
    });
});

http.listen(8181);