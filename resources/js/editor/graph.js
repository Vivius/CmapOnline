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

// Configuration
var width = $(svgContainer).width(), height = $(svgContainer).height();
var linkDistance = 300;
var conceptColor = "#ffc55a", objectColor = "#7ba1ff";
var nodeWidth = 160, nodeHeight = 50;
var nodes, links, linkLabels;
var lastInsertedNode = null;
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
 * Allows to import a graph dataset and update the display.
 * @param graph object
 */
function fetchGraph(graph) {
    $.each(graph.nodes, function (i, node) {
        var newNode = addNode(node._id, node.name, node.type, node.comment, node.graph_id);
        newNode.fixed = node.fixed;
        setNodePosition(newNode, node.x, node.y);
    });
    $.each(graph.links, function (i, link) {
        addLink(link._id, getNodeById(link.source), getNodeById(link.target), link.label, link.type, link.graph_id);
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
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
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
    .charge(-200)
    .friction(0.8)
    .gravity(0);

// Force events
force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); });
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
            'd': function (d) { return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y },
            'class': 'link',
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
        });

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
            'font-size': 14,
            'fill': '#000000',
            "text-anchor": "middle"
        });
    linkLabels
        .append('textPath')
        .attr('xlink:href', function (d) { return '#link-' + d._id })
        .text(function (d) { return d.label; });

    // Creates the cards (nodes).
    nodes = svg.selectAll(".node")
        .data(dataset.nodes, function (d) { return d._id; })
        .enter()
        .append("g")
        .attr({
            "class": "node",
            "transform": function (d) { return "translate(" + d.x + "," + d.y + ")"; }
        })
        .call(force.drag);
    nodes
        .append("rect")
        .attr({
            "width": nodeWidth,
            "height": nodeHeight,
            "rx": function (d) { return d.type == "concept" ? 10 : 0; },
            "ry": function (d) { return d.type == "concept" ? 10 : 0; },
            "class": function (d) { return d.type == "concept" ? "concept" : "object" }
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
    nodes
        .each(function (d) {
            editNodeLabel(d, d.name);
        });

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
}

/******************************************************************
 *** EVENTS                                                     ***
 ******************************************************************/

/**
 * Event called when the window is resized.
 * It allows to center again the position of the center of gravity.
 */
$(window).resize(function() {
    force.size([$(svgContainer).width(), $(svgContainer).height()]);
    force.start();
});

/**
 * Function called when the graph change (deplacement, force...).
 */
function forceTick() {
    // Updates the node's position.
    nodes.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });

    // Updates the link's position.
    links.attr('d', function (d) {
        // Gets the dimension of the target and the source node.
        var sourceBox = getD3Node(d.source).select("rect").node().getBBox();
        var targetBox = getD3Node(d.target).select("rect").node().getBBox();
        // Finds the intersection between the link and the source and target node.
        var line = shape("line", {
            x1: (d.source.x + sourceBox.width / 2),
            y1: (d.source.y + sourceBox.height / 2),
            x2: (d.target.x + targetBox.width / 2),
            y2: (d.target.y + targetBox.height / 2)
        });
        var sourceRect = shape("rect", {x: d.source.x, y: d.source.y, width: sourceBox.width, height: sourceBox.height});
        var targetRect = shape("rect", {x: d.target.x, y: d.target.y, width: targetBox.width, height: targetBox.height});
        var source = intersect(sourceRect, line);
        var target = intersect(targetRect, line);

        if (target.points.length > 0 && source.points.length > 0) {
            return 'M ' + source.points[0].x + ' ' + source.points[0].y + ' L ' + target.points[0].x + ' ' + target.points[0].y;
        } else {
            return 'M ' + (d.source.x + nodeWidth / 2) + ' ' + (d.source.y + nodeHeight / 2) + ' L ' + (d.target.x + nodeWidth / 2) + ' ' + (d.target.y + nodeHeight / 2);
        }
    });

    // Rotates the link's label to make the reading easier.
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

    // Centers the link's label.
    linkLabels.attr("dx", function () {
        var linkId = d3.select(this).select("textPath").attr("xlink:href");
        var link = $(linkId)[0];
        return link ? link.getTotalLength()/2 : linkDistance/2;
    });
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
 * Applies a specific theme for an unmodified node.
 * @param node object
 */
function nodeNewStyle(node) {
    getD3Node(node).select("rect")
        .attr({"stroke": "red", "stroke-width": 2})
        .style("fill", "#82ee5b");
}

/**
 * Applies the standard theme when the node is edited.
 * @param node object
 */
function nodeOldStyle(node) {
    getD3Node(node).select("rect").style("fill", function () { return node.type == "concept" ? conceptColor : objectColor; });
}

/**
 * Applies a default style.
 * @param node object
 */
function nodeDefaultStyle(node) {
    getD3Node(node).select("rect").attr({"stroke": "none"});
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
 * @param id int
 * @param name string
 * @param type string
 * @param comment string
 * @param graph_id string
 */
function addNode(id, name, type, comment, graph_id) {
    var newNode = {_id: id, name: name, type: type, comment: comment, graph_id: graph_id};
    if(lastInsertedNode) {
        newNode.x = lastInsertedNode.x + 100;
        newNode.y = lastInsertedNode.y - 100;
    }
    dataset.nodes.push(newNode);
    update();
    return newNode;
}

/**
 * Modifies the label of a link.
 * Adapts the width of the node corresponding to the size of the text.
 * @param node object
 * @param newLabel string
 */
function editNodeLabel(node, newLabel) {
    var formattedLabel = node.type == "concept" ? "< " + newLabel + " >" : newLabel;
    var d3Node = getD3Node(node);
    var d3Text =  d3Node.select("text");
    var d3Rect = d3Node.select("rect");
    d3Text.text(formattedLabel);
    node.name = newLabel;
    var newWidth = d3Text.node().getBBox().width + 30;
    d3Rect.attr('width', newWidth + "px");
    d3Text.attr("x", newWidth/2);
}

/**
 * Updates the position of the given node from the dataset.
 * The node must be fixed.
 * @param node object
 * @param x int
 * @param y int
 */
function setNodePosition(node, x, y) {
    if(node.fixed) {
        node.x = x;
        node.y = y;
        node.px = x;
        node.py = y;
        update();
    }
}

/**
 * Uses the force layout to control the position of the given node.
 */
function freeNodePosition(node) {
    node.fixed = false;
    update();
}

/**
 * Set the last inserted node by the user.
 * Variable used for egonomics.
 * @param node object
 */
function setLastInsertedNode(node) {
    lastInsertedNode = node;
}

/**
 * Deletes the given node in the graph.
 * @param node object
 * @return {object, boolean}
 */
function removeNode(node) {
    var index = dataset.nodes.indexOf(node);
    if(index >= 0) {
        dataset.nodes.splice(index, 1);
        update();
        return true;
    }
    return false;
}

/**
 * Finds a node by ID in the dataset.
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
 * Selects the given node from the dataset.
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
 * @return {boolean, object}
 */
function addLink(id, nodeSource, nodeTarget, label, type, graphId) {
    var iSource = dataset.nodes.indexOf(nodeSource);
    var iTarget = dataset.nodes.indexOf(nodeTarget);
    if(iSource >= 0 && iTarget >= 0) {
        var newLink = {_id: id, source: iSource, target: iTarget, label: label, type: type, graph_id: graphId};
        dataset.links.push(newLink);
        update();
        return newLink;
    }
    return false;
}

/**
 * Finds a link with a source node and a target node.
 * @param nodeSource object
 * @param nodeTarget object
 * @return object
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
 * Finds a link by ID in the dataset.
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
 * Selects the given link from the dataset.
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
    setNodePosition,
    freeNodePosition,
    setLastInsertedNode,
    removeNode,
    getNodeById,
    getD3Node,
    getDomNode,
    selectNode,
    unselectNode,
    nodeNewStyle,
    nodeOldStyle,

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