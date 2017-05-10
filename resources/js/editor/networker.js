/**
 * Module de gestion des accès réseau.
 */

import * as Graph from "./graph"
import * as Controller from "./controller"
var serverUrl = "http://localhost:8080";
var socket = require('socket.io-client')(serverUrl);


/******************************************************************
 *** EMITS                                                      ***
 ******************************************************************/

/**
 * Envoie un noeud au serveur pour l'ajouter et renvoie le noeud ajouté en paramètre dans la callback donnée.
 * @param node object
 * @param callback
 */
function addNode(node, callback) {
    socket.emit("node/add", node, function (data) {
        callback(data);
    });
}

/**
 * Demande au serveur de supprimer en BDD le noeud passé.
 * @param node
 */
function removeNode(node) {
    socket.emit("node/remove", node);
}

/**
 * Met à jour un noeud en BDD.
 * @param node
 */
function updateNode(node) {
    socket.emit("node/update", node);
}

/**
 * Demande au serveur d'ajouter un lien en BDD.
 * @param link
 * @param callback
 */
function addLink(link, callback) {
    socket.emit("link/add", link, function (data) {
        callback(data);
    });
}

/**
 * Demande au serveur de supprimer un lien en BDD.
 */
function removeLink(link) {
    socket.emit("link/remove", link);
}

/******************************************************************
 *** ON                                                         ***
 ******************************************************************/

/**
 * Ajoute un nouveau noeud si le serveur l'indique via le socket.
 */
socket.on("node/added", function (node) {
   if(Graph.getDataNodeById(node._id) == null) {
       Graph.addNode(node);
       Controller.addNodeEventListeners(node._id);
       console.log("NODE " + node._id + " ADDED");
   }
});

socket.on("node/updated", function (node) {
   var nodeToUpdate = Graph.getDataNodeById(node._id);
   if(nodeToUpdate != null) {
       Graph.editNodeLabel(node._id, node.name);
       Graph.updateNodePosition(node._id, node.x, node.y);
       nodeToUpdate.fixed = node.fixed;
       nodeToUpdate.type = node.type;
       nodeToUpdate.comment = node.comment;
   }
});

/**
 * Supprime un noeud si le serveur le demande via le socket.
 */
socket.on("node/removed", function (node) {
   if(Graph.getDataNodeById(node._id) != null) {
       Graph.removeNode(node._id);
       console.log("NODE " + node._id + " DELETED");
   }
});

/**
 * Ajoute un nouveau lien entre 2 noeuds si le serveur l'indique via le socket.
 */
socket.on("link/added", function (link) {
   if(Graph.getDataLinkById(link._id) == null) {
       Graph.addLink(link.source, link.target, link._id, link.label, link.type);
       Controller.addLinkEventListeners(link._id);
       console.log("LINK " + link._id + " ADDED");
   }
});

/**
 * Supprime un lien si le serveur le demande via le socket.
 */
socket.on("link/removed", function (link) {
    if(Graph.getDataLinkById(link._id) != null) {
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