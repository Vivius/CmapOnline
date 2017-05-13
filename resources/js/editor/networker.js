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
    if(Editor.writeAccess && node != null) {
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
    if(Editor.writeAccess && node != null)
        socket.emit("node/remove", node);
}

/**
 * Met à jour un noeud en BDD.
 * @param node object
 */
function updateNode(node) {
    if(Editor.writeAccess && node != null)
        socket.emit("node/update", node);
}

/**
 * Demande au serveur d'ajouter un lien en BDD.
 * @param link object
 * @param callback function
 */
function addLink(link, callback) {
    if(Editor.writeAccess && link != null) {
        socket.emit("link/add", link, function (data) {
            callback(data);
        });
    }
}

/**
 * Demande au serveur de supprimer un lien en BDD.
 */
function removeLink(link) {
    if(Editor.writeAccess && link != null)
        socket.emit("link/remove", link);
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
        Controller.addNodeEventListeners(node);
        console.log("NODE " + node._id + " ADDED");
    }
});

/**
 * Met à jour un noeud sur ordre du serveur.
 */
socket.on("node/updated", function (node) {
    if(node.graph_id != Editor.graphId) return;
    var nodeToUpdate = Graph.getNodeById(node._id);
    if(nodeToUpdate != null) {
        nodeToUpdate.fixed = node.fixed;
        nodeToUpdate.type = node.type;
        nodeToUpdate.comment = node.comment;
        Graph.editNodeLabel(nodeToUpdate, node.name);
        Graph.updateNodePosition(nodeToUpdate, node.x, node.y);
    }
});

/**
 * Supprime un noeud sur ordre du serveur.
 */
socket.on("node/removed", function (node) {
    if(node.graph_id != Editor.graphId) return;
    var nodeToDelete = Graph.getNodeById(node._id);
    if(nodeToDelete != null) {
        Graph.removeNode(nodeToDelete);
        console.log("NODE " + node._id + " DELETED");
    }
});

/**
 * Ajoute un nouveau lien entre 2 noeuds sur ordre du serveur.
 */
socket.on("link/added", function (link) {
    if(link.graph_id != Editor.graphId) return;
    if(Graph.getLinkById(link._id) == null) {
        Graph.addLink(link._id, Graph.getNodeById(link.source), Graph.getNodeById(link.target), link.label, link.type, link.graph_id);
        Controller.addLinkEventListeners(link);
        console.log("LINK " + link._id + " ADDED");
    }
});

/**
 * Delete a link on order of the server.
 */
socket.on("link/removed", function (link) {
    if(link.graph_id != Editor.graphId) return;
    var linkToDelete = Graph.getLinkById(link._id);
    if(linkToDelete != null) {
        Graph.removeLink(linkToDelete);
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