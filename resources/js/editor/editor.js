/**
 * Module principal de l'éditeur de carte conceptuelles.
 */

import $ from "jquery"
import * as Controller from "./controller"
import * as Graph from  "./graph"
import * as Networker from "./networker"

var graphId = 0;

/******************************************************************
 *** MAIN                                                       ***
 ******************************************************************/

/**
 * Initialisation du graphe avec les données de la BDD.
 */
$(function () {
    graphId = getGraphId();
    $.get("/graph/get/" + graphId, function (graph) {
        Graph.fetchGraph(graph);
        $.each(Graph.dataset.nodes, function (i, node) {
            Controller.addNodeEventListeners(node._id);
        });
        $.each(Graph.dataset.links, function (i, link) {
            Controller.addLinkEventListeners(link._id);
        });
    });
});

/******************************************************************
 *** HELPERS                                                    ***
 ******************************************************************/

/**
 * Retourne l'identifiant du graphe actuellement ouvert dans l'éditeur.
 * @returns int
 */
function getGraphId() {
    var url = window.location.href;
    var split = url.split("/");
    return split[split.length-1];
}

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    graphId
}