/**
 * Module de gestion des accès réseau.
 */

import * as Graph from "./graph";
import * as Controller from "./controller";
import * as Editor from "./editor";

var serverUrl = "http://localhost:8080";
var socket = require('socket.io-client')(serverUrl);

/******************************************************************
 *** ENVOI                                                      ***
 ******************************************************************/

/**
 * Envoie un noeud au serveur pour l'ajouter en BDD et renvoie le noeud ajouté en paramètre dans la callback donnée.
 * @param node object
 * @param callback function
 */
function addNode(node, callback) {
    if(Editor.writeAccess) {
        socket.emit("node/add", node, function (data) {
            callback(data);
        });
    }
}

/**
 * Demande au serveur de supprimer en BDD le noeud passé.
 * @param node object
 */
function removeNode(node) {
    if(Editor.writeAccess) socket.emit("node/remove", node);
}

/**
 * Met à jour un noeud en BDD.
 * @param node
 */
function updateNode(node) {
    if(Editor.writeAccess) socket.emit("node/update", node);
}

/**
 * Demande au serveur d'ajouter un lien en BDD.
 * @param link object
 * @param callback function
 */
function addLink(link, callback) {
    if(Editor.writeAccess) {
        socket.emit("link/add", link, function (data) {
            callback(data);
        });
    }
}

/**
 * Demande au serveur de supprimer un lien en BDD.
 */
function removeLink(link) {
    if(Editor.writeAccess) socket.emit("link/remove", link);
}

/******************************************************************
 *** RECEPTION                                                  ***
 ******************************************************************/

/**
 * Ajoute un nouveau noeud venant du serveur au graphe.
 */
socket.on("node/added", function (node) {
    if(node.graph_id != Editor.graphId) return;
    if(Graph.getNodeById(node._id) == null) {
        Graph.addNode(node);
        Controller.addNodeEventListeners(node._id);
        console.log("NODE " + node._id + " ADDED");
    }
});

socket.on("node/updated", function (node) {
    if(node.graph_id != Editor.graphId) return;
    var nodeToUpdate = Graph.getNodeById(node._id);
    if(nodeToUpdate != null) {
        nodeToUpdate.fixed = node.fixed;
        nodeToUpdate.type = node.type;
        nodeToUpdate.comment = node.comment;
        Graph.editNodeLabel(node._id, node.name);
        Graph.updateNodePosition(node._id, node.x, node.y);
    }
});

/**
 * Supprime un noeud si le serveur le demande via le socket.
 */
socket.on("node/removed", function (node) {
    if(node.graph_id != Editor.graphId) return;
    if(Graph.getNodeById(node._id) != null) {
        Graph.removeNode(node._id);
        console.log("NODE " + node._id + " DELETED");
    }
});

/**
 * Ajoute un nouveau lien entre 2 noeuds si le serveur l'indique via le socket.
 */
socket.on("link/added", function (link) {
    if(link.graph_id != Editor.graphId) return;
    if(Graph.getLinkById(link._id) == null) {
        Graph.addLink(link.source, link.target, link._id, link.label, link.type);
        Controller.addLinkEventListeners(link._id);
        console.log("LINK " + link._id + " ADDED");
    }
});

/**
 * Supprime un lien sur ordre du serveur.
 */
socket.on("link/removed", function (link) {
    if(link.graph_id != Editor.graphId) return;
    if(Graph.getLinkById(link._id) != null) {
        Graph.removeLink(link._id);
        console.log("LINK " + link._id + " DELETED");
    }
});

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    addNode,
    removeNode,
    updateNode,
    addLink,
    removeLink
}