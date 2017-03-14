import $ from 'jquery';
import * as d3 from "d3";
import io from 'socket.io-client';
import bowser from 'bowser';
import svgIntersections from 'svg-intersections';
var intersect = svgIntersections.intersect;
var shape = svgIntersections.shape;

////////////////////////////////
// VARIABLES GLOBALES ///////
//////////////////////////

var width = $("#svg-container").width();
var height = $("#svg-container").height();
var linkDistance = 300;
var nodeWidth = 120;
var nodeHeight = 50;
var colors = d3.scale.category10();
var nodes, links, linkLabels;
var selectedNode = null, selectedLink = null;

/******************************************************************
 * DONNEES                                                        *
 ******************************************************************/

var dataset = {
    nodes: [
        {id: 0, name: "Langage de prog.", type: "concept"},
        {id: 1, name: "Procédural", type: "concept"},
        {id: 2, name: "Orienté objet", type: "concept"},
        {id: 3, name: "Fonctionnel", type: "concept"},
        {id: 4, name: "Prototypé", type: "concept"},

        {id: 5, name: "C", type: "instance"},
        {id: 6, name: "C++", type: "instance"},
        {id: 7, name: "LISP", type: "instance"},
        {id: 8, name: "C#", type: "instance"},
        {id: 9, name: "Javascript", type: "instance"},
        {id: 10, name: "PHP", type: "instance"},
        {id: 11, name: "Fortran", type: "instance"},
        {id: 12, name: "Scala", type: "instance"},
        {id: 13, name: "Java", type: "instance"},
        {id: 14, name: "Smalltalk", type: "instance"},
        {id: 15, name: "Brain Fuck", type: "instance"}
    ],
    links: [
        {id: 0, source: 1, target: 0, label: "est un langage de prog.", type: "is a"},
        {id: 1, source: 1, target: 0, label: "est un langage de prog.", type: "is a"},
        {id: 2, source: 2, target: 0, label: "est un langage de prog.", type: "is a"},
        {id: 3, source: 3, target: 0, label: "est un langage de prog.", type: "is a"},
        {id: 4, source: 4, target: 0, label: "est un langage de prog.", type: "is a"},

        {id: 5, source: 5, target: 1, label: "est procédural", type: "instance of"},
        {id: 6, source: 6, target: 2, label: "est orienté objet", type: "instance of"},
        {id: 7, source: 7, target: 3, label: "est fonctionnel", type: "instance of"},
        {id: 8, source: 8, target: 2, label: "est orienté objet", type: "instance of"},
        {id: 9, source: 9, target: 4, label: "est prototypé", type: "instance of"},
        {id: 10, source: 10, target: 2, label: "est orienté objet", type: "instance of"},
        {id: 11, source: 11, target: 1, label: "est procédural", type: "instance of"},
        {id: 12, source: 12, target: 3, label: "est fonctionnel", type: "instance of"},
        {id: 13, source: 13, target: 2, label: "est orienté objet", type: "instance of"},
        {id: 14, source: 14, target: 2, label: "est orienté objet", type: "instance of"}
    ]
};

/******************************************************************
 * AFFICHAGE DU GRAPHE                                            *
 ******************************************************************/

// Création de l'élément SVG conteneur. Application d'un effet de zoom comme Google Maps.
var svg = d3
    .select("#svg-container")
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

/**
 * Permet de mettre à jour l'ensemble de l'affichage du graphe en fonction des données définies dans le dataset.
 * Permet aussi bien d'ajouter les nouveaux liens et noeuds que de supprimer ceux qui ne se trouvent plus dans les données.
 */
function update() {
    // Rafraichissement du force layout avec les données existentes.
    force.start();

    // Liens entre les neouds (arrêtes).
    links = svg.selectAll(".link")
        .data(dataset.links, function (d) { return d.id; })
        .enter()
        .append('path')
        .attr({
            'd': function (d) { return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y + 'Z' },
            'class': 'link',
            'fill-opacity': 1,
            'stroke-opacity': 1,
            'fill': '#000000',
            'stroke': '#000000',
            'id': function (d, i) { return 'link-' + i },
            'marker-end': 'url(#fleche)'
        })
        .style("stroke-dasharray", function (d) { return d.type == "instance of" ? ("3, 3") : ("1, 0"); });

    // Création des labels posés sur les arrêtes.
    linkLabels = svg.selectAll(".link-label")
        .data(dataset.links, function (d) { return d.id; })
        .enter()
        .append('text')
        .attr({
            'class': 'link-label',
            'id': function (d, i) { return 'link-label-' + i },
            'dx': linkDistance / 2,
            'dy': -10,
            'font-size': 13,
            'fill': '#000000',
            "text-anchor": "middle"
        });
    linkLabels
        .append('textPath')
        .attr('xlink:href', function (d, i) { return '#link-' + i })
        .text(function (d) { return d.label; });

    // Création des cartes (noeuds).
    nodes = svg.selectAll(".node")
        .data(dataset.nodes, function (d) { return d.id; })
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
            "rx": function (d) { return d.type == "concept" ? 10 : 0; },
            "ry": function (d) { return d.type == "concept" ? 10 : 0; }
        })
        .style("fill", function (d) { return d.type == "concept" ? "#FFC44E" : "#AF813C"; });
    nodes
        .append("text")
        .attr({
            "x": nodeWidth/2,
            "y": nodeHeight/2,
            "class": "node-label",
            "stroke": "#000000",
            "text-anchor": "middle"
        })
        .text(function (d) { return d.name; });

    // Mise à jour des références avec les nouveaux noeuds ajoutés.
    nodes = svg.selectAll('.node');
    links = svg.selectAll(".link");
    linkLabels = svg.selectAll(".link-label");

    // La suppression provoque un bug uniquement sur firefox.
    // On préfère donc ici laisser les labels en invisible dans le DOM.
    if(!bowser.gecko) {
        linkLabels
            .data(dataset.links, function (d) { return d.id; })
            .exit()
            .remove();
    } else {
        linkLabels
            .data(dataset.links, function (d) { return d.id; })
            .exit()
            .attr("visibility", "hidden ");
    }
    links
        .data(dataset.links, function (d) { return d.id; })
        .exit()
        .remove();
    nodes
        .data(dataset.nodes, function (d) { return d.id; })
        .exit()
        .remove();

    // Mise à jour des références avec les noeuds supprimés.
    nodes = svg.selectAll('.node');
    links = svg.selectAll(".link");
    linkLabels = svg.selectAll(".link-label");

    // Lorqu'on double clic sur une carte, on la libère.
    nodes.on("dblclick", nodeDbClick);
}

////////////////////////////////
// STYLES ///////////////////
//////////////////////////

/**
 * Style appliqué à un noeud quand il est sélectionné.
 * @param node DOM_object
 */
function nodeSelectionStyle(node) {
    d3.select(node).select("rect").attr({"stroke": "red", "stroke-width": 2});
}

/**
 * Fonction utilisée pour rétablir le style par défaut d'une carte.
 * @param node DOM_object
 */
function nodeDefaultStyle(node) {
    d3.select(node).select("rect").attr("stroke", "none");
}

/******************************************************************
 * FONCTIONS DE MANIPULATION DU GRAPHE                            *
 ******************************************************************/

/**
 * Supprime le noeud passé en paramètre du graphe ainsi que les liens qui le lient.
 * Met également à jour l'affichage.
 * @param node d3_node_datum
 */
function removeNode(node) {
    var linksToDelete = [];

    dataset.nodes.splice(dataset.nodes.indexOf(node), 1);
    $.each(dataset.links, function (i, link) {
        if(link.source.id == node.id || link.target.id == node.id)
            linksToDelete.push(link);
    });
    $.each(linksToDelete, function (i, link) {
        dataset.links.splice(dataset.links.indexOf(link), 1);
    });
    update();
}

/**
 * Supprime le lien passé en paramètre du graphe et met en jour l'affichage.
 * @param link d3_node_datum
 */
function removeLink(link) {
    dataset.links.splice(dataset.links.indexOf(link), 1);
    update();
}

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
 * Ajoute une relation entre les noeuds passés en paramètre et met ensuite à jour l'affichage.
 * @param fromNode d3_node_datum
 * @param toNode d3_node_datum
 */
function addLink(fromNode, toNode) {
    var iFrom = dataset.nodes.indexOf(fromNode);
    var iTo = dataset.nodes.indexOf(toNode);
    dataset.links.push({id: getMaxLinkId() + 1, source: iFrom, target: iTo});
    update();
}

/**
 * Modifie le label d'une carte du graphe (met à jour l'affichage et les données).
 * @param node DOM_object
 * @param newLabel String
 */
function editNodeLabel(node, newLabel) {
    var nodeText = d3.select(node).select("text");
    var nodeData = d3.select(node).datum();
    nodeData.name = newLabel;
    nodeText.text(newLabel);
}

/**
 * Permet de trouver en lien en fonction des noeuds source et target donnés en paramètre.
 * @param sourceNode d3_node_datum
 * @param targetNode d3_node_datum
 * @returns d3_link_datum
 */
function findLink(sourceNode, targetNode) {
    var link = null;
    $.each(dataset.links, function (i, val) {
        if(val.source.id == sourceNode.id && val.target.id == targetNode.id)
            link = val;
    });
    return link;
}

/**
 * Retourne un noeud grâce à son ID.
 * @param id int
 * @returns d3_node_datum
 */
function getNodeById(id) {
    var node = null;
    $.each(dataset.nodes, function (i, val) {
        if(val.id == id)
            node = val;
    });
    return node;
}

/**
 * Retourne un lien grâce à son ID.
 * @param id
 * @returns d3_link_datum
 */
function getLinkById(id) {
    var link = null;
    $.each(dataset.nodes, function (i, val) {
        if(val.id == id)
            link = val;
    });
    return link;
}

/**
 * Retourne l'ID max des noeuds.
 * Cette fonction va disparaitre quand les noeuds auront un ID définit par la BDD.
 * @returns int
 */
function getMaxNodeId() {
    if(dataset.nodes.length > 0)
        var max = dataset.nodes[0].id;
    else
        return 0;
    $.each(dataset.nodes, function (i, node) {
        if(node.id > max)
            max = node.id;
    });
    return max;
}

/**
 * Retourne l'ID max des liens.
 * Cette fonction va disparaitre quand les liens auront un ID définit par la BDD.
 * @returns int
 */
function getMaxLinkId() {
    if(dataset.links.length > 0)
        var max = dataset.links[0].id;
    else
        return 0;
    $.each(dataset.links, function (i, link) {
        if(link.id > max)
            max = link.id;
    });
    return max;
}

/******************************************************************
 * SVG EVENTS                                                     *
 ******************************************************************/

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
 * Event appelé lorque la fenêtre est redimensionnée.
 * Permet de recalculer la taille du svg et du force layout.
 * Les SVGs auront peut-être une taille fixe à l'avenir pour qu'ils sont compatibles avec tous les types d'écrans.
 */
$(window).resize(function() {
    width = $("#svg-container").width();
    height = $("#svg-container").height();
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
$("#svg-container").click(function () {
    if(selectedNode != null) {
        nodeDefaultStyle(selectedNode);
        selectedNode = null;
        updateSelectedNodeMenu(selectedNode);
    }
});

/**
 * Lorque l'on commence à bouger une carte, on la fixe et on applique le style de sélection...
 * @param d
 */
function nodeDragStart(d) {
    d3.event.sourceEvent.stopPropagation();

    d3.select(this).classed("fixed", d.fixed = true); // On fixe la carte.

    // On met l'ancienne carte sélectionnée sans contour, la nouvelle est entourée en rouge.
    if(selectedNode != null)
        nodeDefaultStyle(selectedNode);
    selectedNode = this;
    nodeSelectionStyle(selectedNode);

    updateSelectedNodeMenu(selectedNode);
}

// TODO : enregistrement des positions après un drag.
function nodeDragEnd(d) {
    $("#menu-node-selected-name")[0].focus();
}

/**
 * Lorque l'on doule clic sur une carte, on la libère. Le force layout reprend le contrôle par la suite.
 * @param d
 */
function nodeDbClick(d) {
    d3.event.stopPropagation(); // Stop l'event zoom lors du double clic.
    d3.select(this).classed("fixed", d.fixed = false);
}

/******************************************************************
 * MENU                                                           *
 ******************************************************************/

/**
 * Fonction de mise à jour du menu d'édition du noeud sélectionné.
 * @param node DOM_object
 */
function updateSelectedNodeMenu(node) {
    var nameInput = $("#menu-node-selected-name");
    var nodeMenu = $("#menu-node");

    if(node == null) {
        nodeMenu.fadeOut();
    } else {
        var d3Node = d3.select(node).datum();
        nameInput.val(d3Node.name);
        nodeMenu.fadeIn();
    }
}

////////////////////////////////
// MENU EVENTS //////////////
//////////////////////////

/**
 * Event quand on clic sur supprimer un noeud.
 */
$("#menu-node-delete").click(function () {
   removeNode(d3.select(selectedNode).datum());
});

/**
 * Event quand on clic sur valider les modifications.
 */
$("#menu-node-validate").click(function () {
    editNodeLabel(selectedNode, $("#menu-node-selected-name").val());
});

$(".node-creator").click(function () {
    var newNode = addNode({
       "id": getMaxNodeId() + 1,
        "name": "Undefined",
        "type": function (id) { return id == "concept-creator" ? "concept" : "instance"; } ($(this).attr("id")),
        "x": 0,
        "y": 0
    });
    if(selectedNode != null)
        nodeDefaultStyle(selectedNode);
    selectedNode = d3.selectAll(".node").filter(function (d) { return d.id == newNode.id; }).node();
    nodeSelectionStyle(selectedNode);
    updateSelectedNodeMenu(selectedNode);
    $("#menu-node-selected-name").val("");
    $("#menu-node-selected-name")[0].focus();
});

/******************************************************************
 * RACCOURCIS CLAVIER                                             *
 ******************************************************************/

$(window).keyup(function (e) {
    switch (e.keyCode) {
        // Bouton DELETE
        case 46 :
            if(selectedNode != null) {
                removeNode(d3.select(selectedNode).datum());
                selectedNode = null;
                updateSelectedNodeMenu(selectedNode);
            }
            break;
        // Bouton ENTRER
        case 13 :
            var nodeName = $("#menu-node-selected-name");
            if(nodeName.is(":focus")) {
                editNodeLabel(selectedNode, nodeName.val());
            }
            break;
    }
});

/******************************************************************
 * TESTS                                                          *
 ******************************************************************/

/*
// Ajout d'un noeud à la volée.
setTimeout(function () {
    console.log("Ajout de Linux (" + (getMaxNodeId() + 1) + ")");
    addNode({id: getMaxNodeId() + 1, name: "Linux", x:100, y:100});
}, 2000);

// Ajout d'un lien à la volée.
setTimeout(function () {
    console.log("Ajout de Linux");
    addLink(getNodeById(10), getNodeById(1));
}, 3000);

// Suppression d'un noeud et de ses relations à la volée.
setTimeout(function () {
    console.log("Suppression de C++");
    removeNode(getNodeById(0));
}, 5000);

// Suppression d'un lien unique à la volée.
setTimeout(function () {
    console.log("Suppression du lien entre Java et C#");
    removeLink(findLink(getNodeById(3), getNodeById(4)));
}, 7000);
*/