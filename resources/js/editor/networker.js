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
 * @param node
 * @param callback
 */
function addNode(node, callback) {
    socket.emit("node/add", node, function (data) {
        callback(data);
    });
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
       console.log("NODE ADDED");
   }
});

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    addNode
}