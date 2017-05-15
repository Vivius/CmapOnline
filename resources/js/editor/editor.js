/**
 * Main module.
 */

import $ from "jquery";
import * as Controller from "./controller";
import * as Graph from  "./graph";
import * as Networker from "./networker";

var graphId = 0;
var writeAccess = false;
var currentUser = {};
var connectedUsers = [];

/******************************************************************
 *** MAIN                                                       ***
 ******************************************************************/

/**
 * Initializes the graph with the database and defines the write access.
 */
$(function () {
    setGraphId();
    setAccessLevel();
    $.get("/graph/get/" + graphId, function (graph) {
        Graph.fetchGraph(graph);
        $.each(Graph.dataset.nodes, function (i, node) {
            Controller.addNodeEventListeners(node);
        });
        $.each(Graph.dataset.links, function (i, link) {
            Controller.addLinkEventListeners(link);
        });
        if(!writeAccess) $("#menu").hide();
    });
    $.get("/user/current", function (user) {
        currentUser = user;
        if(writeAccess) Networker.userConnection({user: currentUser, graph_id: graphId});
    });
});

/******************************************************************
 *** HELPERS                                                    ***
 ******************************************************************/

/**
 * Finds the id of the current graph.
 */
function setGraphId() {
    var url = window.location.href;
    var split = url.split("/");
    graphId = split[split.length-1];
}

/**
 * Defines the write access of the graph for the current user.
 */
function setAccessLevel() {
    var url = window.location.href;
    var split = url.split("/");
    var accessMode = split[split.length-2];
    writeAccess = accessMode == "edit";
}

/**
 * Updates the list of the connected users.
 */
function updateConnectedUsersList() {
    $("#connectedUsers").empty();
    $.each(connectedUsers, function (i, user) {
       $("#connectedUsers").append("<p>" + user.firstname + " " + user.lastname + "</p>");
    });
}

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    graphId,
    writeAccess,
    currentUser,
    connectedUsers,
    updateConnectedUsersList
}