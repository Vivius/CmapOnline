/**
 * Module principal de l'éditeur de carte conceptuelles.
 */

import $ from "jquery"
import * as Controller from "./controller"
import * as Graph from  "./graph"
import * as Networker from "./networker"

var graphId = 0;

/**
 * Retourne l'identifiant du graphe actuellement ouvert.
 * @returns int
 */
function getGraphId() {
    var url = window.location.href;
    var split = url.split("/");
    return split[split.length-1];
}

$(function () {
    graphId = getGraphId();
    $.get("/graph/get/" + getGraphId(), function (graph) {
        Graph.fetchGraph(graph);
    });
});

export {
    graphId
}