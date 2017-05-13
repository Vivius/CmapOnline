/**
 * Module managing the display of the graph.
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

// COnfiguration
var width = $(svgContainer).width(), height = $(svgContainer).height();
var linkDistance = 300;
var conceptColor = "#ffc55a", objectColor = "#7ba1ff";
var nodeWidth = 160, nodeHeight = 50;
var nodes, links, linkLabels;
var selectedNode = null, selectedLink = null;

/******************************************************************
 *** DATA MANAGEMENT                                            ***
 ******************************************************************/

// Representation of the graph.
var dataset = {
    nodes: [],
    links: []
};

/**
 * Allows to import some graph data and update the display.
 * @param graph object
 */
function fetchGraph(graph) {
    $.each(graph.nodes, function (i, node) {
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
    $.each(graph.links, function (i, link) {
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
 *** GRAPH CREATION                                             ***
 ******************************************************************/

// Creation of the svg container.
var svg = d3
    .select(svgContainer)
    .append("svg")
    .call(d3.behavior.zoom().on("zoom", function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
    }))
    .append("g");

// Creation of the arrow marker (definition).
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

// Configuraiton of the force layout.
var force = d3.layout.force()
    .nodes(dataset.nodes)
    .links(dataset.links)
    .size([width, height])
    .linkDistance(linkDistance)
    .charge(-1000)
    .theta(0.1)
    .gravity(0.05);

// Force events
force.drag().on("dragstart", nodeDragStart);
force.drag().on("dragend", nodeDragEnd);
force.on("tick", forceTick);

/**
 * Updates the display of the graph with the dataset.
 */
function update() {
    // Updates the force layout with the current data.
    force.start();

    // Makes the links.
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

    // Makes the link's labels.
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

    // Makes the cards (nodes).
    nodes = svg.selectAll(".node")
        .data(dataset.nodes, function (d) { return d._id; })
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
        .on("click", function() { d3.event.stopPropagation(); }) // Stop the propagation on the svg container.
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

    // Updates the references after creation.
    nodes = svg.selectAll('.node');
    links = svg.selectAll(".link");
    linkLabels = svg.selectAll(".link-label");

    // The deletion of link's labels result in errors on Mozilla. So we just hide them.
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

    // Updates the references after deletion.
    nodes = svg.selectAll('.node');
    links = svg.selectAll(".link");
    linkLabels = svg.selectAll(".link-label");

    // Double-click event to released the card.
    nodes.on("dblclick", nodeDbClick);
}

/******************************************************************
 *** EVENTS                                                     ***
 ******************************************************************/

/**
 * Event fired when the window is resized.
 */
$(window).resize(function() {
    force.size([$(svgContainer).width(), $(svgContainer).height()]);
    force.start();
});

/**
 * Event fired when the user click on the svg container.
 * Allow to deselect the links and the nodes.
 */
$(svgContainer).mousedown(function () {
    unselectLink();
    unselectNode();
});

/**
 * Function called when the graph change (deplacement, force...).
 */
function forceTick() {
    // Updates the node position.
    nodes.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });

    // Updates the link's position.
    links.attr('d', function (d) {
        // Find the intersection between the link and the node.
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

    // Updates the link's labels position.
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

    // Centers the link's labels.
    linkLabels.attr("dx", function () {
        var linkId = d3.select(this).select("textPath").attr("xlink:href");
        var link = $(linkId)[0];
        return link ? link.getTotalLength()/2 : linkDistance/2;
    });
}

/**
 * Function called when the drag start.
 * @param node
 */
function nodeDragStart(node) {
    // Stop the propagation to the parent. Allows to drag the node and not the entire graph.
    d3.event.sourceEvent.stopPropagation();
    node.fixed = true; // Fix the position of the node.
    unselectLink();
    selectNode(node);
}

/**
 * Function called when the drag end.
 */
function nodeDragEnd() {
    // Could be used to implement new behaviours.
}

/**
 * Function called when a node is double clicked.
 */
function nodeDbClick() {
    // Stop the zoom event when dbclick.
    d3.event.stopPropagation();
}

/**
 * Function called when a link is clicked.
 * @param link object
 */
function linkClick(link) {
    d3.event.stopPropagation(); // Stop the event propagation to the svg container.
    unselectNode();
    selectLink(link);
}

/******************************************************************
 *** STYLES                                                     ***
 ******************************************************************/

/**
 * Applies a selection style.
 * @param node object
 */
function nodeSelectionStyle(node) {
    getD3Node(node).select("rect").attr({"stroke": "red", "stroke-width": 2});
}

/**
 * Applies a default style.
 * @param node object
 */
function nodeDefaultStyle(node) {
    getD3Node(node).select("rect").attr("stroke", "none");
}

/**
 * Applies a selection style.
 * @param link object
 */
function linkSelectionStyle (link) {
   getD3Link(link).attr({"fill": "#ff0004", "stroke": "#ff0004"});
}

/**
 * Applies a default style.
 * @param link object
 */
function linkDefaultStyle(link) {
    getD3Link(link).attr({"fill": "#000", "stroke": "#000"});
}

/******************************************************************
 *** MANIPULATION                                               ***
 ******************************************************************/

// Nodes

/**
 * Adds a new node in the graph.
 * @param node object
 */
function addNode(node) {
    if(node == null) return;
    dataset.nodes.push(node);
    update();
}

/**
 * Modifies the label of a link.
 * @param node object
 * @param newLabel string
 */
function editNodeLabel(node, newLabel) {
    var formattedLabel = node.type == "concept" ? "< " + newLabel + " >" : newLabel;
    node.name = newLabel;
    d3.select(getDomNode(node)).select("text").text(formattedLabel);
}

/**
 * Updates the position of the given node.
 * @param node object
 * @param x int
 * @param y int
 */
function updateNodePosition(node, x, y) {
    if(node.fixed) {
        node.x = x;
        node.y = y;
        node.px = x;
        node.py = y;
        update();
    }
}

/**
 * Deletes the given node in the graph.
 * @param node object
 */
function removeNode(node) {
    var index = dataset.nodes.indexOf(node);
    if(index >= 0) {
        dataset.nodes.splice(index, 1);
        update();
    }
}

/**
 * Finds a node by ID.
 * @param id int
 * @returns object
 */
function getNodeById(id) {
    var node = null;
    $.each(dataset.nodes, function (i, object) {
        if(object._id == id) {
            node = object;
            return true;
        }
    });
    return node;
}

/**
 * Returns the d3.js datum of the given node.
 * @param node object
 * @returns d3_datum
 */
function getD3Node(node) {
    return d3.selectAll(".node").filter(function (d) { return d._id == node._id; });
}

/**
 * Returns the <g> tag corresponding to the node in the DOM.
 * @param node object
 * @returns g
 */
function getDomNode(node) {
    return getD3Node(node).node();
}

/**
 * Selects the given node in the graph.
 * @param node object
 */
function selectNode(node) {
    unselectNode();
    selectedNode = node;
    nodeSelectionStyle(selectedNode);
}

/**
 * Unselects the currently selected node.
 */
function unselectNode() {
    if(selectedNode == null) return;
    nodeDefaultStyle(selectedNode);
    selectedNode = null;
}

// Links

/**
 * Adds a new link in the graph.
 * @param id int
 * @param nodeSource object
 * @param nodeTarget object
 * @param label string
 * @param type string
 * @param graphId string
 */
function addLink(id, nodeSource, nodeTarget, label, type, graphId) {
    var iSource = dataset.nodes.indexOf(nodeSource);
    var iTarget = dataset.nodes.indexOf(nodeTarget);
    if(iSource >= 0 && iTarget >= 0) {
        var newLink = {_id: id, source: iSource, target: iTarget, label: label, type: type, graph_id: graphId};
        dataset.links.push(newLink);
        update();
    }
}

/**
 * Finds a link with a source node and a target node.
 * @param nodeSource object
 * @param nodeTarget object
 */
function findLink(nodeSource, nodeTarget) {
    var link = null;
    $.each(dataset.links, function (i, object) {
        if(object.source._id == nodeSource._id && object.target._id == nodeTarget._id) {
            link = object;
            return true;
        }
    });
    return link;
}

/**
 * Edits the label of the given link.
 * @param link object
 * @param newLabel string
 */
function editLinkLabel(link, newLabel) {
    link.label = newLabel;
    d3.selectAll("textPath").filter(function (d) { return link._id == d._id; }).text(link.label);
}

/**
 * Deletes the given link in the graph.
 * @param link object
 */
function removeLink(link) {
    var index = dataset.links.indexOf(link);
    if(index >= 0) {
        dataset.links.splice(index, 1);
        update();
    }
}

/**
 * Finds a link by ID.
 * @param id int
 * @returns object
 */
function getLinkById(id) {
    var link = null;
    $.each(dataset.links, function (i, object) {
        if(object._id == id) {
            link = object;
            return true;
        }
    });
    return link;
}

/**
 * Returns the d3.js datum of the given link.
 * @param link object
 * @returns d3_datum
 */
function getD3Link(link) {
    return d3.selectAll(".link").filter(function (d) { return d._id == link._id; });
}

/**
 * Returns the <path> object representating the link in the DOM.
 * @param link object
 * @returns path
 */
function getDomLink(link) {
    return getD3Link(link).node();
}

/**
 * Selects the given link.
 * @param link object
 */
function selectLink(link) {
    unselectLink();
    selectedLink = link;
    linkSelectionStyle(selectedLink);
}

/**
 * Unselects the currently selected node.
 */
function unselectLink() {
    if(selectedLink == null) return;
    linkDefaultStyle(selectedLink);
    selectedLink = null;
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
    getD3Node,
    getDomNode,
    selectNode,
    unselectNode,

    addLink,
    findLink,
    editLinkLabel,
    removeLink,
    getD3Link,
    getLinkById,
    getDomLink,
    selectLink,
    unselectLink,
}



