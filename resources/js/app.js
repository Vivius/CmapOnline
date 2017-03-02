import $ from 'jquery';
import * as d3 from "d3";
import io from 'socket.io-client'
import svgIntersections from 'svg-intersections';
var intersect = svgIntersections.intersect;
var shape = svgIntersections.shape;

// Variables globales
var width = $(document).width();
var height = $(document).height();
var linkDistance = 250;
var nodeWidth = 120;
var nodeHeight = 80;
var colors = d3.scale.category10();
var nodes, links, linkLabels;

// Données à représenter.
var dataset = {
    nodes: [
        {id: 0, name: "C++"},
        {id: 1, name: "C"},
        {id: 2, name: "Javascript"},
        {id: 3, name: "C#"},
        {id: 4, name: "Java"},
        {id: 5, name: "Smalltalk"},
        {id: 6, name: "PHP"},
        {id: 7, name: "LISP"},
        {id: 8, name: "Ruby"},
        {id: 9, name: "Python"}
    ],
    links: [
        {id: 0, source: 0, target: 1},
        {id: 1, source: 0, target: 2},
        {id: 2, source: 0, target: 3},
        {id: 3, source: 0, target: 4},
        {id: 4, source: 1, target: 5},
        {id: 5, source: 2, target: 5},
        {id: 6, source: 2, target: 5},
        {id: 7, source: 3, target: 4},
        {id: 8, source: 5, target: 8},
        {id: 9, source: 5, target: 9},
        {id: 10, source: 6, target: 7},
        {id: 11, source: 7, target: 8},
        {id: 12, source: 8, target: 9}
    ]
};

// Création de l'élément SVG conteneur.
var svg = d3
    .select("body")
    .append("svg")
    .attr({
        "width": width,
        "height": height
    });

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
    .charge(-800)
    .theta(0.1)
    .gravity(0.05)
    .start();
// Force events.
force.drag().on("dragstart", nodeDragStart); // Drag des cartes conceptuelles.
force.drag().on("dragend", nodeDragEnd);
force.on("tick", forceTick); // Evénement tick du force layout.

update();

function update() {
    // Liens entre les neouds (arrêtes).
    links = svg.selectAll(".link")
        .data(dataset.links, function (d) {
            return d.id;
        })
        .enter()
        .append('path')
        .attr({
            'd': function (d) {
                return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y + 'Z'
            },
            'class': 'link',
            'fill-opacity': 0.5,
            'stroke-opacity': 0.5,
            'fill': '#000000',
            'stroke': '#000000',
            'id': function (d, i) {
                return 'link-' + i
            },
            'marker-end': 'url(#fleche)'
        });

    // Création des labels posés sur les arrêtes.
    linkLabels = svg.selectAll(".link-label")
        .data(dataset.links, function (d) {
            return d.id;
        })
        .enter()
        .append('text')
        .attr({
            'class': 'link-label',
            'id': function (d, i) {
                return 'link-label-' + i
            },
            'dx': linkDistance / 2,
            'dy': -10,
            'font-size': 13,
            'fill': '#000000',
            "text-anchor": "middle"
        });
    linkLabels
        .append('textPath')
        .attr('xlink:href', function (d, i) {
            return '#link-' + i
        })
        .text(function (d, i) {
            return 'label ' + i
        });

    // Création des cartes.
    nodes = svg.selectAll(".node")
        .data(dataset.nodes, function (d) {
            return d.id;
        })
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .call(force.drag);
    nodes
        .append("rect")
        .attr({
            "width": nodeWidth,
            "height": nodeHeight
        })
        .style("fill", function (d, i) {
            return colors(i);
        });
    nodes
        .append("text")
        .attr({
            "x": nodeWidth/2,
            "y": nodeHeight/2,
            "class": "node-label",
            "stroke": "#000000",
            "text-anchor": "middle"
        })
        .text(function (d) {
            return d.name;
        });

    // Mise à jour des références avec les nouveaux noeuds ajoutés.
    nodes = svg.selectAll('.node');
    links = svg.selectAll(".link");
    linkLabels = svg.selectAll(".link-label");

    // Lorqu'on double clic sur une carte, on la libère.
    nodes.on("dblclick", nodeDbClick);

    // Rafraichissement du force layout.
    force.start();
}

// Supprime le noeud passé en paramètre du graphe.
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
    linkLabels
        .data(dataset.links, function (d) {
            return d.id;
        })
        .exit()
        .remove();
    links
        .data(dataset.links, function (d) {
            return d.id;
        })
        .exit()
        .remove();
    nodes
        .data(dataset.nodes, function (d) {
            return d.id;
        })
        .exit()
        .remove();
}

/******************************************************************
 * EVENTS                                                         *
 ******************************************************************/

// Event lancé lorsque les cartes bougent (drag, gravité, force...).
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

    // Mise à jour des labels placés sur les arrêtes.
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

    // Aligne le label des liens au centre.
    linkLabels.attr("dx", function () {
        var linkId = d3.select(this).select("textPath").attr("xlink:href");
        var link = $(linkId)[0];
        if(link)
            return link.getTotalLength()/2;
        else
            return linkDistance/2;
    });
}

// Lorque l'on commence à bouger une carte, on la fixe.
function nodeDragStart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
}

// TODO : enregistrement des positions après un drag.
function nodeDragEnd(d) {
    console.log(this);
}

// Lorque l'on doule clic sur une carte, on la libère. Le force layout reprend le contrôle.
function nodeDbClick(d) {
    d3.select(this).classed("fixed", d.fixed = false);
}

/******************************************************************
 * TESTS                                                          *
 ******************************************************************/

// Ajout à la volée.
setTimeout(function () {
    console.log("Ajout de Linux");
    dataset.nodes.push({id: 11, name: "Linux", x:100, y:100});
    update();
 }, 2000);

// Suppression à la volée.
setTimeout(function () {
    console.log("Suppression de C++");
    removeNode(dataset.nodes[0]);
}, 5000);