/**
 * Module gérant l'affichage du graphe.
 */

import $ from 'jquery';
import * as d3 from 'd3';
import * as Networker from "./networker"
import bowser from 'bowser';
import {intersect, shape} from 'svg-intersections';

/******************************************************************
 *** VARIABLES                                                  ***
 ******************************************************************/

// IDs
var svgContainer = "#svg-container";

// Configuration
var width = $(svgContainer).width(), height = $(svgContainer).height();
var linkDistance = 300;
var conceptColor = "#ffc55a", objectColor = "#7ba1ff";
var nodeWidth = 160, nodeHeight = 50;
var nodes, links, linkLabels;
var selectedNode = null, selectedLink = null;

/******************************************************************
 *** GESTION DES DONNEES                                        ***
 ******************************************************************/

var dataset = {
    nodes: [],
    links: []
};

/**
 * Permet d'importer les données d'un graphe dans celui-ci.
 * @param graph
 */
function fetchGraph(graph) {
    $.each(graph.nodes, function (k, node) {
        dataset.nodes.push({
            _id: node._id,
            name: node.name,
            type: node.type,
            comment: node.comment,
            fixed: node.fixed,
            x: node.x,
            y: node.y,
            graph_id: node.graph_id
        });
    });
    $.each(graph.links, function (k, link) {
        dataset.links.push({
            _id: link._id,
            source: getNodeById(link.source),
            target: getNodeById(link.target),
            label: link.label,
            type: link.type,
            graph_id: link.graph_id
        });
    });
    update();
}

/******************************************************************
 *** CREATION DU GRAPHE                                         ***
 ******************************************************************/

// Création de l'élément SVG conteneur. Application d'un effet de zoom comme Google Maps.
var svg = d3
    .select(svgContainer)
    .append("svg")
    .call(d3.behavior.zoom().on("zoom", function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
    }))
    .append("g");

// Création d'un marker en forme de flèche (définition).
svg
    .append('defs')
    .append('marker')
    .attr({
        'id': 'fleche',
        'viewBox': '-0 -5 10 10',
        'refX': 10,
        'refY': 0,
        'orient': 'auto',
        'markerWidth': 10,
        'markerHeight': 10,
        'xoverflow': 'visible'
    })
    .append('svg:path')
    .attr({
        'd': 'M 0,-5 L 10 ,0 L 0,5',
        'fill': '#000000',
        'stroke': '#000000'
    });

// Configuration de la force du graphe.
var force = d3.layout.force()
    .nodes(dataset.nodes)
    .links(dataset.links)
    .size([width, height])
    .linkDistance(linkDistance)
    .charge(-1000)
    .theta(0.1)
    .gravity(0.05);

// Force events
force.drag().on("dragstart", nodeDragStart); // Drag des cartes conceptuelles.
force.drag().on("dragend", nodeDragEnd); // Event de fin de drag.
force.on("tick", forceTick); // Evénement tick du force layout.

function update() {
    // Rafraichissement du force layout avec les données existentes.
    force.start();

    // Liens entre les neouds (arrêtes).
    links = svg.selectAll(".link")
        .data(dataset.links, function (d) { return d._id; })
        .enter()
        .append('path')
        .attr({
            'd': function (d) { return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y + 'Z' },
            'class': 'link',
            'fill-opacity': 1,
            'stroke-opacity': 1,
            'fill': '#000000',
            'stroke': '#000000',
            'id': function (d) { return 'link-' + d._id },
            'marker-end': 'url(#fleche)'
        })
        .style("stroke-dasharray", function (d) {
            switch (d.type) {
                case "ako": return ("1, 0");
                case "association": return ("1, 0");
                case "instance of": return ("3, 3");
                default: return ("1, 0");
            }
        })
        .on("click", function (d) { linkClick(d)});

    // Création des labels posés sur les arrêtes.
    linkLabels = svg.selectAll(".link-label")
        .data(dataset.links, function (d) { return d._id; })
        .enter()
        .append('text')
        .attr({
            'class': 'link-label',
            'id': function (d) { return 'link-label-' + d._id },
            'dx': linkDistance / 2,
            'dy': -10,
            'font-size': 13,
            'fill': '#000000',
            "text-anchor": "middle"
        })
        .on("click", function (d) { linkClick(d)});
    linkLabels
        .append('textPath')
        .attr('xlink:href', function (d) { return '#link-' + d._id })
        .text(function (d) { return d.label; });

    // Création des cartes (noeuds).
    nodes = svg.selectAll(".node")
        .data(dataset.nodes, function (d) { return d._id; })
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
        .on("click", function() { d3.event.stopPropagation(); }) // Stop la propagation de l'event click au parent.
        .call(force.drag);
    nodes
        .append("rect")
        .attr({
            "width": nodeWidth,
            "height": nodeHeight,
            "rx": function (d) { return d.type == "concept" ? 10 : 0; },
            "ry": function (d) { return d.type == "concept" ? 10 : 0; }
        })
        .style("fill", function (d) { return d.type == "concept" ? conceptColor : objectColor; });
    nodes
        .append("text")
        .attr({
            "x": nodeWidth/2,
            "y": nodeHeight/2,
            "class": "node-label",
            "stroke": "#000000",
            "text-anchor": "middle"
        })
        .text(function (d) { return d.type == "concept" ? "< " + d.name + " >" : d.name; });

    // Mise à jour des références avec les nouveaux noeuds ajoutés.
    nodes = svg.selectAll('.node');
    links = svg.selectAll(".link");
    linkLabels = svg.selectAll(".link-label");

    // La suppression provoque un bug uniquement sur firefox.
    // On préfère donc ici laisser les labels en invisible dans le DOM.
    if(!bowser.gecko) {
        linkLabels
            .data(dataset.links, function (d) { return d._id; })
            .exit()
            .remove();
    } else {
        linkLabels
            .data(dataset.links, function (d) { return d._id; })
            .exit()
            .attr("visibility", "hidden ");
    }
    links
        .data(dataset.links, function (d) { return d._id; })
        .exit()
        .remove();
    nodes
        .data(dataset.nodes, function (d) { return d._id; })
        .exit()
        .remove();

    // Mise à jour des références avec les noeuds supprimés.
    nodes = svg.selectAll('.node');
    links = svg.selectAll(".link");
    linkLabels = svg.selectAll(".link-label");

    // Lorqu'on double clic sur une carte, on la libère.
    nodes.on("dblclick", nodeDbClick);
}

/******************************************************************
 *** EVENTS                                                     ***
 ******************************************************************/

/**
 * Event appelé lorque la fenêtre est redimensionnée.
 * Permet de recalculer la taille du svg et du force layout.
 */
$(window).resize(function() {
    force.size([$(svgContainer).width(), $(svgContainer).height()]);
    force.start();
});

/**
 * Event appelé quand l'utilisateur click sur la fenêtre (en dehors des liens et des noeuds).
 * Permet de déselectionner un noeud ou un lien si tel était le cas.
 */
$(svgContainer).click(function () {
    unselectLink();
    unselectNode();
});

/**
 * Event lancé lorsque les cartes bougent (drag, gravité, force...).
 */
function forceTick() {
    // Mise à jour du positionnement des cartes.
    nodes.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });

    // Mise à jour du positionnement des arrêtes.
    links.attr('d', function (d) {
        // Recherche de l'intersection entre la ligne et le rectangle pour placer la flèche correctement.
        var line = shape("line", {x1: (d.source.x + nodeWidth / 2), y1: (d.source.y + nodeHeight / 2), x2: (d.target.x + nodeWidth / 2), y2: (d.target.y + nodeHeight / 2)});
        var rect_source = shape("rect", {x: d.source.x, y: d.source.y, width: nodeWidth, height: nodeHeight});
        var rect_target = shape("rect", {x: d.target.x, y: d.target.y, width: nodeWidth, height: nodeHeight});
        var source = intersect(rect_source, line);
        var target = intersect(rect_target, line);

        if (target.points.length > 0 && source.points.length > 0) {
            return 'M ' + source.points[0].x + ' ' + source.points[0].y + ' L ' + target.points[0].x + ' ' + target.points[0].y;
        } else {
            return 'M ' + (d.source.x + nodeWidth / 2) + ' ' + (d.source.y + nodeHeight / 2) + ' L ' + (d.target.x + nodeWidth / 2) + ' ' + (d.target.y + nodeHeight / 2);
        }
    });

    // Mise à jour de la position des labels placés sur les arrêtes.
    linkLabels.attr('transform', function (d) {
        if (d.target.x < d.source.x) {
            var bbox = this.getBBox();
            var rx = bbox.x + bbox.width / 2;
            var ry = bbox.y + bbox.height / 2;
            return 'rotate(180 ' + rx + ' ' + ry + ')';
        } else {
            return 'rotate(0)';
        }
    });

    // Aligne le label des liens en leur centre.
    linkLabels.attr("dx", function () {
        var linkId = d3.select(this).select("textPath").attr("xlink:href");
        var link = $(linkId)[0];
        if(link)
            return link.getTotalLength()/2;
        else
            return linkDistance/2;
    });
}

/**
 * Lorque l'on commence à bouger une carte, on la fixe et on applique le style de sélection...
 * @param node
 */
function nodeDragStart(node) {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("fixed", node.fixed = true); // On fixe la carte.
    unselectLink();
    selectNode(node._id);
}

/**
 * Evénement appelé lorsque l'on arrête de déplacer une carte.
 */
function nodeDragEnd() {
    Networker.updateNode(getNodeById(selectedNode));
}

/**
 * Lorque l'on doule clic sur une carte, on la libère.
 * Le force layout reprend le contrôle par la suite.
 * @param node
 */
function nodeDbClick(node) {
    d3.event.stopPropagation(); // Stop l'event zoom lors du double clic.
    d3.select(this).classed("fixed", node.fixed = false);
    Networker.updateNode(getNodeById(selectedNode));
    unselectNode();
}

/**
 * Evénement appelé lorque l'on clic sur un des liens du graphe.
 * @param link
 */
function linkClick(link) {
    d3.event.stopPropagation();
    unselectNode();
    selectLink(link._id);
}

/******************************************************************
 *** STYLES                                                     ***
 ******************************************************************/

/**
 * Style appliqué à un noeud quand il est sélectionné.
 * @param id int
 */
function nodeSelectionStyle(id) {
    getD3NodeById(id).select("rect").attr({"stroke": "red", "stroke-width": 2});
}

/**
 * Fonction utilisée pour rétablir le style par défaut d'une carte.
 * @param id int
 */
function nodeDefaultStyle(id) {
    getD3NodeById(id).select("rect").attr("stroke", "none");
}

/**
 * Permet d'appliquer un style de sélection à un lien.
 * @param id int
 */
function linkSelectionStyle (id) {
   getD3LinkById(id).attr({"fill": "#ff0004", "stroke": "#ff0004"});
}

/**
 * Applique le style par défaut au lien donné.
 * @param id int
 */
function linkDefaultStyle(id) {
    getD3LinkById(id).attr({"fill": "#000", "stroke": "#000"});
}

/******************************************************************
 *** MANIPULATION                                               ***
 ******************************************************************/

// Nodes

/**
 * Ajoute le noeud passé en paramètre au graphe et met à jour l'affichage.
 * @param node d3_node_datum
 */
function addNode(node) {
    dataset.nodes.push(node);
    update();
    return node;
}

/**
 * Modifie le label d'une carte du graphe.
 * @param id int
 * @param newLabel String
 */
function editNodeLabel(id, newLabel) {
    var node = getNodeById(id);
    var formattedLabel = node.type == "concept" ? "< " + newLabel + " >" : newLabel;
    node.name = newLabel;
    d3.select(getDomNodeById(id)).select("text").text(formattedLabel);
}

/**
 * Met à jour la position d'un noeud manuellement.
 * @param id
 * @param x
 * @param y
 */
function updateNodePosition(id, x, y) {
    var node = getNodeById(id);
    if(node.fixed) {
        node.x = x;
        node.y = y;
        node.px = x;
        node.py = y;
        update();
    }
}

/**
 * Supprime le noeud passé en paramètre du graphe ainsi que les liens qui le lient.
 * @param id int
 */
function removeNode(id) {
    if(id == -1) return false;
    var linksToDelete = [];
    var node = getNodeById(id);
    dataset.nodes.splice(dataset.nodes.indexOf(node), 1);
    $.each(dataset.links, function (i, link) {
        if(link.source._id == node._id || link.target._id == node._id)
            linksToDelete.push(link);
    });
    $.each(linksToDelete, function (i, link) {
        Networker.removeLink(link);
        dataset.links.splice(dataset.links.indexOf(link), 1);
    });
    update();
    return node;
}

/**
 * Retourne un noeud venant du dataset grâce à son ID.
 * @param id int
 * @returns object
 */
function getNodeById(id) {
    var node = null;
    $.each(dataset.nodes, function (i, val) {
        if(val._id == id)
            node = val;
    });
    return node;
}

/**
 * Retourne un noeud d3js datum grâce à son ID.
 * @param id int
 * @returns d3_datum
 */
function getD3NodeById(id) {
    return d3.selectAll(".node").filter(function (d) { return d._id === id; });
}

/**
 * Retourne un noeud venant du DOM grâce à son ID.
 * @param id int
 * @returns dom_node
 */
function getDomNodeById(id) {
    return getD3NodeById(id).node();
}

/**
 * Sélectionne le noeud passé en paramètre.
 */
function selectNode(id) {
    unselectNode();
    selectedNode = id;
    nodeSelectionStyle(selectedNode);
}

/**
 * Déselectionne le noeud actuellement sélectionné.
 */
function unselectNode() {
    nodeDefaultStyle(selectedNode);
    selectedNode = -1; 
}

// Links

/**
 * Ajoute une relation entre les noeuds passés en paramètre et met ensuite à jour l'affichage.
 * @param fromNodeID int
 * @param toNodeID int
 * @param newID int
 * @param label string
 * @param type string
 */
function addLink(fromNodeID, toNodeID, newID, label, type) {
    var iFrom = dataset.nodes.indexOf(getNodeById(fromNodeID));
    var iTo = dataset.nodes.indexOf(getNodeById(toNodeID));
    var newLink = {_id: newID, source: iFrom, target: iTo, label: label, type: type};
    dataset.links.push(newLink);
    update();
    return newLink;
}

/**
 * Permet de touver si un lien existe entre 2 noeuds donnés.
 * @param nodeSource int
 * @param nodeTarget int
 */
function findLink(nodeSource, nodeTarget) {
    var link = null;
    $.each(dataset.links, function (k, l) {
        if(l.source._id == nodeSource && l.target._id == nodeTarget)
            link = l;
    });
    return link;
}

/**
 * Modifie le label d'un lien du graphe.
 * @param id int
 * @param newLabel String
 */
function editLinkLabel(id, newLabel) {
    var linkData = getLinkById(id);
    linkData.label = newLabel;
    d3.selectAll("textPath").filter(function (d) { return linkData._id == d._id; }).text(linkData.label);
}

/**
 * Supprime le lien passé en paramètre du graphe.
 * @param id
 */
function removeLink(id) {
    if(id == -1) return false;
    var link = dataset.links.indexOf(getLinkById(id));
    dataset.links.splice(link, 1);
    update();
    return link;
}

/**
 * Retourne l'objet représentant le lien dans le dataset.
 * @param id int
 * @returns object
 */
function getLinkById(id) {
    var link = null;
    $.each(dataset.links, function (i, val) {
        if(val._id == id)
            link = val;
    });
    return link;
}

/**
 * Retourne un datum d3js d'un lien du graphe.
 * @param id int
 * @returns d3_datum
 */
function getD3LinkById(id) {
    return d3.selectAll(".link").filter(function (d) { return d._id === id; });
}

/**
 * Retourne l'objet du DOM représentant le lien demandé.
 * @param id
 * @returns dom_node
 */
function getDomLinkById(id) {
    return getD3LinkById(id).node();
}

/**
 * Sélectionne le lien passé en paramètre.
 */
function selectLink(id) {
    unselectLink();
    selectedLink = id;
    linkSelectionStyle(selectedLink);
}

/**
 * Déselectionne le noeud actuellement sélectionné.
 */
function unselectLink() {
    linkDefaultStyle(selectedLink);
    selectedLink = -1;
}

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    selectedNode,
    selectedLink,
    dataset,

    fetchGraph,

    addNode,
    editNodeLabel,
    updateNodePosition,
    removeNode,
    getNodeById,
    getD3NodeById,
    getDomNodeById,
    selectNode,
    unselectNode,

    addLink,
    findLink,
    editLinkLabel,
    removeLink,
    getD3LinkById,
    getLinkById,
    getDomLinkById,
    selectLink,
    unselectLink,
}



