var Express = require('express');
var BodyParser = require('body-parser');
var Mongo = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID;
var Session = require('express-session');
var MongoStore = require('connect-mongo')(Session);
var Bcrypt = require('bcrypt-nodejs');
var favicon = require('serve-favicon');

var DB = "mongodb://localhost/cmap";

// Test de onnection à MongoDB.
Mongo.connect(DB, function(error, db) {
    if(error) {
        console.log("ERREUR - Impossible de se conencter à MongoDB");
        throw error;
    }
    console.log("Connecté à la base de données 'cmap'");
});

// Configuration du framework express.
var app = Express();
app.use("/css",Express.static(__dirname + '/css'));
app.use("/images",Express.static(__dirname + '/images'));
app.use("/js",Express.static(__dirname + '/js'));
app.use("/html",Express.static(__dirname + '/html'));
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));
app.use(favicon(__dirname + '/images/favicon/favicon.ico'));

// Initialisation de la session.
app.use(Session({
    secret: 'moijecomprendspasacounamatata',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    store: new MongoStore({ url: DB})
}));

// Middleware authentification
app.use(function (req, res, next) {
    if(!req.session.user && req.path !== "/" && req.path !== "/login" && req.path !== "/signup") {
        return res.redirect('/');
    }
    next();
});

//------------------------------------------------------------
// HELPERSS
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
 * Login
 */
app.post("/login", function (req,res) {
    Mongo.connect(DB, function (error, db) {
        db.collection("users").find({mail: req.body.mail}).toArray(function(err, documents) {
            if(documents[0] != null && Bcrypt.compareSync(req.body.password, documents[0].password)) {
                req.session.user = documents[0];
                res.json(true);
            } else
                res.json(false);
        });
    });
});

/**
 * Logout
 */
app.post("/logout", function (req,res) {
    req.session.destroy();
    res.redirect('/');
});

/**
 * Insertion d'un utilisateur
 */
app.post("/signup", function (req,res) {
    Mongo.connect(DB, function (error, db){
        db.collection("users").find({mail: req.body.mail}).toArray(function(err, documents) {
            if(typeof documents[0] != 'undefined') res.json(false);
            else {
                var salt = Bcrypt.genSaltSync(10);
                var hash = Bcrypt.hashSync(req.body.password, salt);
                req.body.password = hash;
                db.collection("users").insert(req.body, null, function (err, results) {
                    req.session.user = results.ops[0];
                    res.json(true);
                });
            }
        });
    });
});

/**
 * Récupérer l'utilisateur courant
 */
app.get('/user/current' , function(req, res) {
    res.json(req.session.user);
});

/**
 * Retourne les access du graph
 */
app.post("/graph/getAccess", function (req, res) {
    Mongo.connect(DB, function(error, db) {
        var query = {_id: new ObjectId(req.body['_id'])};
        var projection = {read:1, write:1, owner:1, _id:0};
        var cursor = db.collection('graphs').find(query).project(projection);
        cursor.toArray(function(err, documents) {
            res.json(documents);
        });
    })
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
 * Affichage de la page de lecture du graphe spécifié.
 */
app.get("/view/:id", function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(__dirname + '/html/editor.html');
});

/**
 * Retourne un graphe entier grâce à son identifiant.
 * TODO : aller chercher en base le graphe demandé avec l'ensemble des ses liens et noeuds.
 */
app.get("/graph/get/:id", function (req, res) {
    var id = req.params["id"];
    Mongo.connect(DB, function (error, db) {
       db.collection("nodes").find({graph_id: id}).toArray(function (err, nodes) {
           db.collection("links").find({graph_id: id}).toArray(function (err, links) {
               res.json({nodes: nodes, links: links});
           });
       });
    });
});


/**
 * Retourne la liste de tous les graphes.  {_id: new ObjectId(graph['owner'])}
 */
app.get("/graph/getAll", function (req, res) {
    return Mongo.connect(DB).then(function(db) {

        var graphs = new Promise(function(resolve){
            var usr = req.session.user;
            var query = {$or: [{owner: usr._id}, {read:{id: usr._id}}, {write:{id: usr._id}}] };
            resolve(db.collection("graphs").find(query).toArray());
        });

        var users = new Promise(function(resolve){
            resolve(db.collection("users").find().toArray());
        });

        Promise.all([graphs, users]).then(function(data)  {
            graphs = data[0];
            users = data[1];
            for (var i = 0; i < graphs.length; i++) {
                for (var j = 0; j < users.length; j++) {
                    if(graphs[i]['owner'] ==  users [j]['_id']){
                        graphs[i]['owner'] = users [j];
                    }
                }
            }
            res.json(graphs);
        });
    });
});


/**
 * Permet de créer un nouveau graphe.
 */
app.post("/graph/create", function (req,res) {
    req.body["date"] =  Date.now();
    Mongo.connect(DB, function(error, db) {
        db.collection("graphs").insert(req.body, null, function (error, results) {
            res.json(results.ops[0]);
        });
    })
});


/**
 * Permet de créer un nouveau graphe.
 */
app.post("/graph/addAccess", function (req,res) {
    Mongo.connect(DB, function (error, db) {
        db.collection('graphs', {}, function (err, graphs) {
            console.log(req.body);
            var query = {_id: new ObjectId(req.body['graphID'])} ;

            if(req.body['access'] == 'read'){
                graphs.update(query,{$push: { "read":{ "id": req.body['userID']} } });
                res.end();
            }
            else{
                graphs.update(query,{$push: { "write":{ "id": req.body['userID']} } });
                res.end();
            }
        });
    })
});

/**
 * Supprimer un graphe grâce à son id
 */
app.post("/graph/deleteOne", function (req,res) {
    Mongo.connect(DB, function (error, db) {
        db.collection('graphs', {}, function (err, graphs) {
            var usr = req.session.user;
            var query = {$and: [{_id: new ObjectId(req.body['_id'])}, {owner: usr._id}] };
            graphs.remove(query, function (err, result) {
                res.end();
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
        Mongo.connect(DB, function(error, db) {
            db.collection("nodes").insert(node, function (error, results) {
                fn(results.ops[0]);
                io.emit("node/added", results.ops[0]);
                console.log("NODE " + results.ops[0]._id + " ADDED");
            });
        });
    });
    // Met à jour un noeud
    socket.on("node/update", function (node, fn) {
        Mongo.connect(DB, function (error, db) {
            db.collection('nodes').update({_id: new ObjectId(node._id)},
                {$set: {name: node.name, type: node.type, comment: node.comment, x: node.x, y: node.y, fixed: node.fixed}},
                function (error, results) {
                    io.emit("node/updated", node);
                    console.log("NODE " + node._id + " UPDATED");
                });
        });
    });
    // Suppression d'un noeud
    socket.on("node/remove", function (node, fn) {
        Mongo.connect(DB, function (error, db) {
            db.collection('nodes').remove({_id: new ObjectId(node._id)}, function (error, results) {
                io.emit("node/removed", node);
                console.log("NODE " + node._id + " REMOVED");
            });
        });
    });
    // Ajout d'un lien.
    socket.on("link/add", function (link, fn) {
        Mongo.connect(DB, function(error, db) {
            db.collection("links").insert(link, function (error, results) {
                fn(results.ops[0]);
                io.emit("link/added", results.ops[0]);
                console.log("LINK " + results.ops[0]._id + " ADDED");
            });
        });
    });
    // Suppression d'un lien
    socket.on("link/remove", function (link, fn) {
        Mongo.connect(DB, function (error, db) {
            db.collection('links').remove({_id: new ObjectId(link._id)}, function (error, results) {
                io.emit("link/removed", link);
                console.log("LINK " + link._id + " REMOVED");
            });
        });
    });
});

http.listen(8080);