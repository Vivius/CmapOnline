/**
 * Module gérant l'affichage du graphe.
 */

import $ from 'jquery';
import * as d3 from 'd3';
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
var nodeWidth = 160, nodeHeight = 50;
var colors = d3.scale.category10();
var nodes, links, linkLabels;
var selectedNode = null, selectedLink = null;

var linkEditionStatus = {
    type: null,
    source: null,
    target: null,
    enable: false,
    button: null
};

/******************************************************************
 *** JEU DE DONNEES                                             ***
 ******************************************************************/

var dataset = {
    nodes: [
        {_id: 0, name: "Langage de prog.", type: "concept"},
        {_id: 1, name: "Procédural", type: "concept"},
        {_id: 2, name: "Orienté objet", type: "concept"},
        {_id: 3, name: "Fonctionnel", type: "concept"},
        {_id: 4, name: "Prototypé", type: "concept"},

        {_id: 5, name: "C", type: "object"},
        {_id: 6, name: "C++", type: "object"},
        {_id: 7, name: "LISP", type: "object"},
        {_id: 8, name: "C#", type: "object"},
        {_id: 9, name: "Javascript", type: "object"},
        {_id: 10, name: "PHP", type: "object"},
        {_id: 11, name: "Fortran", type: "object"},
        {_id: 12, name: "Scala", type: "object"},
        {_id: 13, name: "Java", type: "object"},
        {_id: 14, name: "Smalltalk", type: "object"},
        {_id: 15, name: "Brain Fuck", type: "object"}
    ],
    links: [
        {_id: 1, source: 1, target: 0, label: "est un langage de prog.", type: "ako"},
        {_id: 2, source: 2, target: 0, label: "est un langage de prog.", type: "ako"},
        {_id: 3, source: 3, target: 0, label: "est un langage de prog.", type: "ako"},
        {_id: 4, source: 4, target: 0, label: "est un langage de prog.", type: "ako"},

        {_id: 5, source: 5, target: 1, label: "est procédural", type: "instance of"},
        {_id: 6, source: 6, target: 2, label: "est orienté objet", type: "instance of"},
        {_id: 7, source: 7, target: 3, label: "est fonctionnel", type: "instance of"},
        {_id: 8, source: 8, target: 2, label: "est orienté objet", type: "instance of"},
        {_id: 9, source: 9, target: 4, label: "est prototypé", type: "instance of"},
        {_id: 10, source: 10, target: 2, label: "est orienté objet", type: "instance of"},
        {_id: 11, source: 11, target: 1, label: "est procédural", type: "instance of"},
        {_id: 12, source: 12, target: 3, label: "est fonctionnel", type: "instance of"},
        {_id: 13, source: 13, target: 2, label: "est orienté objet", type: "instance of"},
        {_id: 14, source: 14, target: 2, label: "est orienté objet", type: "instance of"}
    ]
};

/******************************************************************
 *** CREATION DU GRAPHE                                         ***
 ******************************************************************/

// Création de l'élément SVG conteneur. Application d'un effet de zoom comme Google Maps.
var svg = d3
    .select(svgContainer)
    .append("svg")
    .attr({
        "width": width,
        "height": height
    })
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

update(); // Premier affichage du graphe.

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
        .on("click", function() { d3.event.stopPropagation(); }) // Stop la propagation de l'event click.
        .call(force.drag);
    nodes
        .append("rect")
        .attr({
            "width": nodeWidth,
            "height": nodeHeight,
            "rx": function (d) { return d.type === "concept" ? 10 : 0; },
            "ry": function (d) { return d.type === "concept" ? 10 : 0; }
        })
        .style("fill", function (d) { return d.type === "concept" ? "#FFC44E" : "#AF813C"; });
    nodes
        .append("text")
        .attr({
            "x": nodeWidth/2,
            "y": nodeHeight/2,
            "class": "node-label",
            "stroke": "#000000",
            "text-anchor": "middle"
        })
        .text(function (d) { return d.type === "concept" ? "< " + d.name + " >" : d.name; });

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
    width = $(svgContainer).width();
    height = $(svgContainer).height();
    svg.attr({
        "width": width,
        "height": height,
    });
    force.size([width, height]);
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
function nodeDragEnd() { }

/**
 * Lorque l'on doule clic sur une carte, on la libère.
 * Le force layout reprend le contrôle par la suite.
 * @param node
 */
function nodeDbClick(node) {
    d3.event.stopPropagation(); // Stop l'event zoom lors du double clic.
    d3.select(this).classed("fixed", node.fixed = false);
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
    getDataNodeById(id).name = newLabel;
    d3.select(getDomNodeById(id)).select("text").text("< " + newLabel + " >");
}

/**
 * Supprime le noeud passé en paramètre du graphe ainsi que les liens qui le lient.
 * @param id int
 */
function removeNode(id) {
    if(id === -1) return false;
    var linksToDelete = [];
    var node = getDataNodeById(id);
    dataset.nodes.splice(dataset.nodes.indexOf(node), 1);
    $.each(dataset.links, function (i, link) {
        if(link.source._id === node._id || link.target._id === node._id)
            linksToDelete.push(link);
    });
    $.each(linksToDelete, function (i, link) {
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
function getDataNodeById(id) {
    var node = null;
    $.each(dataset.nodes, function (i, val) {
        if(val._id === id)
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
    var iFrom = dataset.nodes.indexOf(getDataNodeById(fromNodeID));
    var iTo = dataset.nodes.indexOf(getDataNodeById(toNodeID));
    var newLink = {_id: newID, source: iFrom, target: iTo, label: label, type: type};
    dataset.links.push(newLink);
    update();
    return newLink;
}

/**
 * Modifie le label d'un lien du graphe.
 * @param id int
 * @param newLabel String
 */
function editLinkLabel(id, newLabel) {
    var linkData = getDataLinkById(id);
    linkData.label = newLabel;
    d3.selectAll("textPath").filter(function (d) { return linkData._id === d._id; }).text(linkData.label);
}

/**
 * Supprime le lien passé en paramètre du graphe.
 * @param id
 */
function removeLink(id) {
    if(id === -1) return false;
    var link = dataset.links.indexOf(getDataLinkById(id));
    dataset.links.splice(link, 1);
    update();
    return link;
}

/**
 * Retourne l'objet représentant le lien dans le dataset.
 * @param id int
 * @returns object
 */
function getDataLinkById(id) {
    var link = null;
    $.each(dataset.links, function (i, val) {
        if(val._id === id)
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

    addNode,
    editNodeLabel,
    removeNode,
    getDataNodeById,
    getD3NodeById,
    getDomNodeById,
    selectNode,
    unselectNode,

    addLink,
    editLinkLabel,
    removeLink,
    getD3LinkById,
    getDataLinkById,
    getDomLinkById,
    selectLink,
    unselectLink,

    nodeSelectionStyle,
    nodeDefaultStyle,
    linkSelectionStyle,
    linkDefaultStyle
}



