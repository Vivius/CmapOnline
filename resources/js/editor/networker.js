/**
 * Module managing the network access for web sockets specially.
 */

import $ from "jquery";
import * as Graph from "./graph";
import * as Controller from "./controller";
import * as Editor from "./editor";

var serverUrl = "http://localhost:8080";
var socket = require('socket.io-client')(serverUrl);

/******************************************************************
 *** SENDING                                                    ***
 ******************************************************************/

/**
 * Sends a node to the server to save and share it.
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
 * Sends a node to the server to delete it.
 * @param node object
 */
function removeNode(node) {
    if(Editor.writeAccess && node != null)
        socket.emit("node/remove", node);
}

/**
 * Sends a node to the server to update the modification and share it.
 * @param node object
 */
function updateNode(node) {
    if(Editor.writeAccess && node != null)
        socket.emit("node/update", node);
}

/**
 * Sends a link to the server to save and share it.
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
 * Sends a link to the server to delete it.
 */
function removeLink(link) {
    if(Editor.writeAccess && link != null)
        socket.emit("link/remove", link);
}

/**
 * Indicates that the current user is connected to the graph.
 * @param data
 */
function userConnection(data) {
    if(data.graph_id && data.user)
        socket.emit("user/connection", data);
}

/******************************************************************
 *** RECEIVING                                                  ***
 ******************************************************************/

/**
 * Adds a new node from the server in the local graph.
 */
socket.on("node/added", function (node) {
    if(node.graph_id != Editor.graphId) return;
    if(Graph.getNodeById(node._id) == null) {
        var newNode = Graph.addNode(node._id, node.name, node.type, node.comment, node.graph_id);
        Controller.addNodeEventListeners(newNode);
        console.log("NODE " + node._id + " ADDED");
    }
});

/**
 * Updates the local version of the node received from the server.
 */
socket.on("node/updated", function (node) {
    if(node.graph_id != Editor.graphId) return;
    var nodeToUpdate = Graph.getNodeById(node._id);
    if(nodeToUpdate != null) {
        nodeToUpdate.fixed = node.fixed;
        nodeToUpdate.type = node.type;
        nodeToUpdate.comment = node.comment;
        Graph.editNodeLabel(nodeToUpdate, node.name);
        Graph.setNodePosition(nodeToUpdate, node.x, node.y);
        console.log("NODE " + node._id + " UPDATED");
    }
});

/**
 * Removes the local version of the received node from the server.
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
 * Adds a new link in the local graph received from the server.
 */
socket.on("link/added", function (link) {
    if(link.graph_id != Editor.graphId) return;
    if(Graph.getLinkById(link._id) == null) {
        var newLink = Graph.addLink(link._id, Graph.getNodeById(link.source), Graph.getNodeById(link.target), link.label, link.type, link.graph_id);
        Controller.addLinkEventListeners(newLink);
        console.log("LINK " + link._id + " ADDED");
    }
});

/**
 * Removes the local version of the received link from the server.
 */
socket.on("link/removed", function (link) {
    if(link.graph_id != Editor.graphId) return;
    var linkToDelete = Graph.getLinkById(link._id);
    if(linkToDelete != null) {
        Graph.removeLink(linkToDelete);
        console.log("LINK " + link._id + " DELETED");
    }
});

/**
 * Function called when a new user is connected to the current graph.
 */
socket.on("user/connected", function (data) {
    var canAddUser = true;
    if(data.graph_id == Editor.graphId && data.user._id != Editor.currentUser._id) {
        $.each(Editor.connectedUsers, function (i, user) {
            if(user._id == data.user._id) {
                canAddUser = false;
                return true;
            }
        });
        if(canAddUser) {
            Editor.connectedUsers.push(data.user);
            Editor.updateConnectedUsersList();
        }
        socket.emit("user/confirm", {user: Editor.currentUser, graph_id: Editor.graphId});
    }
});

/**
 * Function called when one of the other users confirms his presence.
 */
socket.on("user/confirmed", function (data) {
    if(data.graph_id == Editor.graphId && data.user._id != Editor.currentUser._id) {
        var canAddUser = true;
        $.each(Editor.connectedUsers, function (i, user) {
            if(user._id == data.user._id) {
                canAddUser = false;
                return true;
            }
        });
        if(canAddUser) {
            Editor.connectedUsers.push(data.user);
            Editor.updateConnectedUsersList();
        }
    }
});

/**
 * Refresh the connected users list when someone disconnects.
 */
socket.on("user/disconnected", function (user) {
    var userToDelete = false;
    $.each(Editor.connectedUsers, function (i, object) {
        if(object._id == user._id) {
            userToDelete = user;
            return true;
        }
    });
    if(userToDelete) {
        Editor.connectedUsers.splice(Editor.connectedUsers.indexOf(userToDelete), 1);
        Editor.updateConnectedUsersList();
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
    removeLink,
    userConnection
}