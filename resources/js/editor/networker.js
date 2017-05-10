/**
 * Module de gestion des accès réseau.
 */

import * as Graph from "./graph"
var serverUrl = "http://localhost:8080";
var socket = require('socket.io-client')(serverUrl);


/******************************************************************
 *** EMITS                                                      ***
 ******************************************************************/

/**
 * Envoie un message au serveur d'ajout de noeud.
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

socket.on("node/added", function (node) {
    console.log(node);
   if(Graph.getDataNodeById(node._id) == null) {
       Graph.addNode(node);
       console.log("NODE ADDED");
   } else {
       console.log("ok");
   }
});

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    addNode
}