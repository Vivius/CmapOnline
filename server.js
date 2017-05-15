var Express = require('express');
var BodyParser = require('body-parser');
var Mongo = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID;
var Session = require('express-session');
var MongoStore = require('connect-mongo')(Session);
var Bcrypt = require('bcrypt-nodejs');
var Favicon = require('serve-favicon');
var SharedSession = require("express-socket.io-session");

var DB = "mongodb://localhost/cmap";

// Test de onnection à MongoDB.
Mongo.connect(DB, function (error) {
    if (error) {
        console.log("ERREUR - Impossible de se conencter à MongoDB");
        throw error;
    }
    console.log("Connecté à la base de données 'cmap'");
});

//------------------------------------------------------------
// CONFIGURATION DU FRAMEWORK
//------------------------------------------------------------

var app = Express();
app.use("/css", Express.static(__dirname + '/css'));
app.use("/images", Express.static(__dirname + '/images'));
app.use("/js", Express.static(__dirname + '/js'));
app.use("/html", Express.static(__dirname + '/html'));
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({extended: true}));
app.use(Favicon(__dirname + '/images/favicon/favicon.ico'));

// Initialisation de la session.
var session = Session({
    secret: 'moijecomprendspasacounamatata',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: new Date(Date.now() + (24 * 60 * 60 * 1000))
    },
    store: new MongoStore({url: DB})
});

// Utilisation des sessions dans express.
app.use(session);

// Middleware d'authentification
app.use(function (req, res, next) {
    if (!req.session.user && req.path !== "/" && req.path !== "/login" && req.path !== "/signup") {
        return res.redirect('/');
    }
    next();
});

//------------------------------------------------------------
// ROUTES
//------------------------------------------------------------

//------------------------------------------------------------
// VIEWS
//------------------------------------------------------------

/**
 * Affichage de la page login
 */
app.get('/', function (req, res) {
    if (typeof req.session.user != 'undefined')
        res.redirect('/home');
    else {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(__dirname + '/html/login.html');
    }
});

/**
 * Affichage de la homepage.
 */
app.get('/home', function (req, res) {
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

//------------------------------------------------------------
// ACTIONS
//------------------------------------------------------------

/**
 * Login
 */
app.post("/login", function (req, res) {
    Mongo.connect(DB, function (error, db) {
        db.collection("users").find({mail: req.body.mail}).toArray(function (err, documents) {
            if (documents[0] != null && Bcrypt.compareSync(req.body.password, documents[0].password)) {
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
app.post("/logout", function (req, res) {
    req.session.destroy();
    res.redirect('/');
});

/**
 * Insertion d'un utilisateur
 */
app.post("/signup", function (req, res) {
    Mongo.connect(DB, function (error, db) {
        db.collection("users").find({mail: req.body.mail}).toArray(function (err, documents) {
            if (typeof documents[0] != 'undefined') res.json(false);
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
app.get('/user/current', function (req, res) {
    res.json(req.session.user);
});

/**
 * Retourne les access du graph
 */
app.post("/graph/getAccess", function (req, res) {
    Mongo.connect(DB).then(function (db) {
        // Préparation de la requête permettant de récupérer un graph
        // Les paramètres de la requêtes sont l'id du graphe et le owner
        // Le owner est utilisé car il permet de savoir si l'utilisateur connecté est bien le owner
        // et q'il est donc le seul à pouvoir modifier les droits
        // Projection récupère seulement les attributs 'read' and 'write'

        var graph = new Promise(function (resolve) {
            var usr = req.session.user;
            var query = {$and: [{_id: new ObjectId(req.body['_id'])}, {owner: usr._id}]};
            var projection = {read: 1, write: 1, _id: 0};
            var cursor = db.collection('graphs').find(query).project(projection);
            cursor.toArray(function (err, documents) {
                resolve(documents);
            });
        });

        // Préparaton de la requête permettant de récupérer tous les utilisateurs
        var users = new Promise(function (resolve) {
            resolve(db.collection("users").find().toArray());
        });

        Promise.all([graph, users]).then(function (data) {
            graph = data[0][0]; // Attributs 'read' and 'write' : { read: [], write: []}
            users = data[1]; // Données de tous les utilisateurs

            // Parcours les tableaux json 'write' and 'read' qui contiennent les id des utilisateurs
            // pour les remplacer par leurs données corrrespondantes (mail, nom, prenom)
            if (graph.read.length != 0) {
                for (var i = 0; i < graph.read.length; i++) {
                    for (var j = 0; j < users.length; j++) {
                        if (graph.read[i].id == users[j]._id) {
                            graph.read[i] = users[j];
                        }
                    }
                }
            }
            if (graph.write.length != 0) {
                for (i = 0; i < graph.write.length; i++) {
                    for (j = 0; j < users.length; j++) {
                        if (graph.write[i].id == users[j]._id) {
                            graph.write[i] = users[j];
                        }
                    }
                }
            }
            res.json(graph);
        });
    });
});

/**
 * Retourne la liste de tous les graphes.
 */
app.get("/users/getAll", function (req, res) {
    Mongo.connect(DB).then(function (db) {
        var usrID = req.session.user._id;
        db.collection("users").find( {_id: {$ne: new ObjectId(usrID)}}).toArray(function (err, users) {
            res.json(users);
        });
    });
});

/**
 * Retourne un graphe entier grâce à son identifiant.
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
 * Parse un graphe au format voulu pour l'export
 */
app.get("/graph/parse/:id", function (req, res) {
    var id = req.params["id"];
    Mongo.connect(DB, function (error, db) {
        db.collection("nodes").find({graph_id: id}).toArray(function (err, nodes) {
            db.collection("links").find({graph_id: id}).toArray(function (err, links) {
                db.collection("graphs").find({_id: new ObjectId(id)}).toArray(function (err, graph) {
                    // Format désiré du graphe pour l'export
                    var format = {
                        graph: {
                            name: graph[0].name,
                            description: "",
                            directed: true,
                            nodes: nodes,
                            links: links
                        }
                    };

                    // Suppression des données inutiles dans les nodes
                    format.graph.nodes.forEach(function (node) {
                        node.id = node._id;
                        node.label = node.name;
                        if (node.type == "object") node.type = "instance";
                        delete node._id;
                        delete node.name;
                        delete node.comment;
                        delete node.fixed;
                        delete node.graph_id;
                        delete node.x;
                        delete node.y;
                    });

                    // Suppression des données inutiles dans les links
                    format.graph.links.forEach(function (link) {
                        if (link.type == "ako" || link.type == "association") link.type = "subconcept-of";
                        if (link.type == "instance of") {
                            link.type = "instance-of";
                            link.label = "io";
                        }

                        delete link._id;
                        delete link.graph_id;
                    });

                    res.json(format);
                });
            });
        });
    });
});

/**
 * Retourne la liste de tous les graphes.
 */
app.get("/graph/getAll", function (req, res) {
    Mongo.connect(DB).then(function (db) {

        var graphs = new Promise(function (resolve) {
            var usr = req.session.user;
            var query = {$or: [{owner: usr._id}, {read: {id: usr._id}}, {write: {id: usr._id}}]};
            resolve(db.collection("graphs").find(query).toArray());
        });

        var users = new Promise(function (resolve) {
            resolve(db.collection("users").find().toArray());
        });

        Promise.all([graphs, users]).then(function (data) {
            graphs = data[0];
            users = data[1];
            for (var i = 0; i < graphs.length; i++) {
                for (var j = 0; j < users.length; j++) {
                    if (graphs[i].owner == users [j]._id) {
                        graphs[i].owner = users [j];
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
app.post("/graph/create", function (req, res) {
    req.body["date"] = Date.now();
    Mongo.connect(DB, function (error, db) {
        db.collection("graphs").insert(req.body, null, function (error, results) {
            res.json(results.ops[0]);
        });
    })
});

/**
 * Permet d'ajouter un acces en écriture ou en lecture à un utilisateur (ID)
 */
app.post("/graph/addAccess", function (req, res) {
    var userID = req.body['user']['_id'];
    Mongo.connect(DB, function (error, db) {
        db.collection('graphs', {}, function (err, graphs) {
            var query = {
                $and: [
                    {_id: new ObjectId(req.body['graphID'])},
                    {
                        $nor: [
                            {read: {id: userID}},
                            {write: {id: userID}}
                        ]
                    }
                ]
            };

            if (req.body['access'] == 'read') {
                graphs.update(query, {$push: {read: {id: userID}}}, {upsert: true});
            } else {
                graphs.update(query, {$push: {write: {id: userID}}}, {upsert: true});
            }
            res.end();
        });
    })
});

/**
 * Permet de changer un acces d'écriture en lecture ou de lecture en écriture
 */
app.post("/graph/changeAccess", function (req, res) {
    Mongo.connect(DB, function (error, db) {
        db.collection('graphs', {}, function (err, graphs) {
            var usr = req.session.user;
            var query = {$and: [{_id: new ObjectId(req.body['graphID'])}, {owner: usr._id}]};

            if (req.body['typeAccess'] == 'read') {
                graphs.update(query, {$pull: {write: {id: req.body['userID']}}}), function (error, results) {
                    graphs.update(query, {$push: {read: {id: req.body['userID']}}});
                }
            }
            else {
                graphs.update(query, {$pull: {read: {id: req.body['userID']}}}), function (error, results) {
                    graphs.update(query, {$push: {write: {id: req.body['userID']}}});
                }
            }
            res.end();
        });
    })
});

/**
 * Permet de supprimer un acces en écriture ou en lecture à un utilisateur (ID)
 */
app.post("/graph/deleteAccess", function (req, res) {
    Mongo.connect(DB, function (error, db) {
        db.collection('graphs', {}, function (err, graphs) {
            var usr = req.session.user;
            var query = {$and: [{_id: new ObjectId(req.body['graphID'])}, {owner: usr._id}]};

            if (req.body['typeAccess'] == 'read') {
                graphs.update(query, {$pull: {read: {id: req.body['userID']}}});
            } else {
                graphs.update(query, {$pull: {write: {id: req.body['userID']}}});
            }
            res.end();
        });
    })
});


/**
 * Supprimer un graphe grâce à son id
 */
app.post("/graph/deleteOne", function (req, res) {
    Mongo.connect(DB, function (error, db) {
        db.collection('graphs', {}, function (err, graphs) {
            var usr = req.session.user;
            var query = {$and: [{_id: new ObjectId(req.body['_id'])}, {owner: usr._id}]};
            graphs.remove(query, function () {
                res.end();
            });
        });
    });
});

//------------------------------------------------------------
// ERRORS
//------------------------------------------------------------

app.use(function (req, res) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
});

//------------------------------------------------------------
// SOCKET.IO
//------------------------------------------------------------

var http = require('http').Server(app);
var io = require('socket.io')(http);

// Utilisation des sessions (partage).
io.use(SharedSession(session, {
    autoSave: true
}));

io.on('connection', function (socket) {
    // Ajout d'un nouveau noeud.
    socket.on("node/add", function (node, fn) {
        Mongo.connect(DB, function (error, db) {
            db.collection("nodes").insert(node, function (error, results) {
                fn(results.ops[0]);
                io.emit("node/added", results.ops[0]);
                console.log("NODE " + results.ops[0]._id + " ADDED");
            });
        });
    });
    // Met à jour un noeud
    socket.on("node/update", function (node) {
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
    socket.on("node/remove", function (node) {
        Mongo.connect(DB, function (error, db) {
            db.collection('nodes').remove({_id: new ObjectId(node._id)}, function () {
                io.emit("node/removed", node);
                console.log("NODE " + node._id + " REMOVED");
            });
        });
    });
    // Ajout d'un lien.
    socket.on("link/add", function (link, fn) {
        Mongo.connect(DB, function (error, db) {
            db.collection("links").insert(link, function (error, results) {
                fn(results.ops[0]);
                io.emit("link/added", results.ops[0]);
                console.log("LINK " + results.ops[0]._id + " ADDED");
            });
        });
    });
    // Suppression d'un lien
    socket.on("link/remove", function (link) {
        Mongo.connect(DB, function (error, db) {
            db.collection('links').remove({_id: new ObjectId(link._id)}, function () {
                io.emit("link/removed", link);
                console.log("LINK " + link._id + " REMOVED");
            });
        });
    });
    // On détecte quand un client se connecte.
    socket.on("user/connection", function (data) {
        console.log("Connexion");
        io.emit("user/connected", data);
    });
    socket.on("user/confirm", function (data) {
        console.log("Confirmation");
        io.emit("user/confirmed", data);
    });
    // On détecte quand un client se déconnecte d'un graphe.
    socket.on("disconnect", function () {
        console.log("Déconnexion");
        var session = socket.handshake.session;
        io.emit("user/disconnected", session.user);
    });
});

http.listen(8080);