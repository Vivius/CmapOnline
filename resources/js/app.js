import $ from 'jquery';
import * as d3 from "d3";
import io from 'socket.io-client'
import svgIntersections from 'svg-intersections';
var intersect = svgIntersections.intersect;
var shape = svgIntersections.shape;

// Variables globales
var w = $(window).width();
var h = $(window).height();
var linkDistance = 200;
var nodeWidth = 120;
var nodeHeight = 80;

// Palette de couleurs
var colors = d3.scale.category10();

// Données à représenter.
var dataset = {
    nodes: [
        {name: "C++"},
        {name: "C"},
        {name: "Javascript"},
        {name: "C#"},
        {name: "Java"},
        {name: "Smalltalk"},
        {name: "PHP"},
        {name: "LISP"},
        {name: "Ruby"},
        {name: "Python"}
    ],
    links: [
        {source: 0, target: 1},
        {source: 0, target: 2},
        {source: 0, target: 3},
        {source: 0, target: 4},
        {source: 1, target: 5},
        {source: 2, target: 5},
        {source: 2, target: 5},
        {source: 3, target: 4},
        {source: 5, target: 8},
        {source: 5, target: 9},
        {source: 6, target: 7},
        {source: 7, target: 8},
        {source: 8, target: 9}
    ]
};

// Création de l'élément SVG conteneur.
var svg = d3
    .select("body")
    .append("svg")
    .attr({
        "width": w,
        "height": h
    });

// Configuration de la force du graphe.
var force = d3.layout.force()
    .nodes(dataset.nodes)
    .links(dataset.links)
    .size([w, h])
    .linkDistance(linkDistance)
    .charge(-800)
    .theta(0.1)
    .gravity(0.05)
    .start();

// Ajout des noeuds (cartes conceptuelles).
var nodes = svg.selectAll(".node")
    .data(dataset.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
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
        "x": nodeWidth / 2,
        "y": nodeHeight / 2,
        "class": "node-label",
        "stroke": "#000000",
        "text-anchor": "middle"
    })
    .text(function (d) {
        return d.name;
    });

// Liens entre les neouds (arrêtes).
var links = svg.selectAll(".link")
    .data(dataset.links)
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
        }
    })
    .attr('marker-end', 'url(#fleche)')
    .style("pointer-events", "none");

// Création des labels posés sur les arrêtes.
var linkLabels = svg
    .selectAll(".link-label")
    .data(dataset.links)
    .enter()
    .append('text')
    .style("pointer-events", "none")
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
    .style("pointer-events", "none")
    .text(function (d, i) {
        return 'label ' + i
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
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
    .attr('fill', '#000000')
    .attr('stroke', '#000000');

/******************************************************************
 * EVENTS                                                         *
 ******************************************************************/

// Event lancé lorsque les cartes bougent (drag, gravité, force...).
force.on("tick", function () {

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
        return $(linkId)[0].getTotalLength() / 2;
    });
});

// Lorqu'une carte est déplacée, on fixe sa position.
force.drag().on("dragstart", function (d) {
    d3.select(this).classed("fixed", d.fixed = true);
});

// Lorqu'on double clic sur une carte, on la libère.
nodes.on("dblclick", function (d) {
    d3.select(this).classed("fixed", d.fixed = false);
});

/******************************************************************
 * TESTS                                                          *
 ******************************************************************/

/*
// Ajout à la volée.
setTimeout(function () {
    dataset.nodes.push({name: "Vincent"});
    svg.selectAll("rect")
        .data(dataset.nodes)
        .enter()
        .append("rect")
        .attr({
            "width": nodeWidth,
            "height": nodeHeight
        })
        .style("fill", function (d, i) {
            return colors(i);
        })
        .call(force.drag);
    console.log("Ajout de Vincent");
}, 2000);
// Suppression à la volée.
setTimeout(function () {
    dataset.nodes.splice(1, 1);
    nodes
        .data(dataset.nodes)
        .exit()
        .remove();
    console.log("Suppression de Bob");
}, 5000);
*/