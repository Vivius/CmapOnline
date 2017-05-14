/**
 * Main module.
 */

import $ from "jquery";
import * as Controller from "./controller";
import * as Graph from  "./graph";
import * as Networker from "./networker";

var graphId = 0;
var writeAccess = false;

/******************************************************************
 *** MAIN                                                       ***
 ******************************************************************/

/**
 * Initialisation du graphe avec les données de la BDD.
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
});

/******************************************************************
 *** HELPERS                                                    ***
 ******************************************************************/

/**
 * Définit l'identifiant du graphe actuellement ouvert dans l'éditeur.
 * @returns int
 */
function setGraphId() {
    var url = window.location.href;
    var split = url.split("/");
    graphId = split[split.length-1];
}

/**
 * Définit si le graphe est ouvert en mode lecture ou écriture.
 * @returns
 */
function setAccessLevel() {
    var url = window.location.href;
    var split = url.split("/");
    var accessMode = split[split.length-2];
    writeAccess = accessMode == "edit";
}

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    graphId,
    writeAccess
}