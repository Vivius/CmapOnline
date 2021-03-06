/**
 * Module managing the user's controls.
 */

import $ from "jquery";
import * as Graph from "./graph";
import * as Networker from "./networker";
import * as Editor from "./editor";

/******************************************************************
 *** VARIABLES                                                  ***
 ******************************************************************/

var svgContainer = $("#svg-container");
var menu = $("#menu");

var nodeCreatorButton = $(".node-creator");
var nodeMenu = $("#menu-node");
var nodeNameInput = $("#menu-node-selected-name");
var nodeCommentTextArea = $("#menu-node-selected-comment");
var deleteNodeButton = $("#menu-node-delete");
var validateNodeButton = $("#menu-node-validate");

var linkCreatorButton = $(".link-creator");
var linkMenu = $("#menu-link");
var linkLabelInput = $("#menu-link-selected-label");
var linkTypeSelection = $("#menu-link-link-type");
var deleteLinkButton = $("#menu-link-delete");
var validateLinkButton = $("#menu-link-validate");

// Object representing the status of the edition of a new link.
var linkEditionStatus = {
    type: "",
    source: null,
    target: null,
    enable: false,
    button: null
};

/******************************************************************
 *** MENU FUNCTIONS                                             ***
 ******************************************************************/

// Menu display

/**
 * Updates the selected node's menu.
 * @param node object
 */
function updateNodePanel(node) {
    if(node == null) {
        if(Graph.selectedLink != null) {
            nodeMenu.slideUp("fast");
        } else {
            nodeMenu.slideUp("fast", function () {
                menu.removeClass("bigger");
            });
        }
    } else {
        nodeNameInput.val(node.name);
        nodeCommentTextArea.val(node.comment);
        nodeMenu.slideDown("fast", function () {
            nodeNameInput[0].focus();
            menu.addClass("bigger");
        });
    }
}

/**
 * Updates the selected link's menu.
 * @param link object
 */
function updateLinkPanel(link) {
    if(link == null) {
        if(Graph.selectedNode != null) {
            linkMenu.slideUp("fast");
        } else {
            linkMenu.slideUp("fast", function () {
                menu.removeClass("bigger");
            });
        }
    } else {
        linkLabelInput.val(link.label);
        linkTypeSelection.val(link.type);
        linkMenu.slideDown("fast", function () {
            menu.addClass("bigger");
            linkLabelInput[0].focus();
        });
    }
}

/**
 * Updates the menu depending of the selected item.
 */
function updateMenu() {
    updateLinkPanel(Graph.selectedLink);
    updateNodePanel(Graph.selectedNode);
}

// Nodes

/**
 * Function called when a new node is created.
 */
function createNode() {
    if(Graph.newNodeExists()) {
        alert("A new node is already ready to be edited.");
        return;
    }
    Networker.addNode({
        name: "",
        type: function (id) {
            return id == "concept-creator" ? "concept" : "object";
        }($(this).attr("id")),
        comment: "",
        fixed: false,
        x: 0,
        y: 0,
        graph_id: Editor.graphId
    }, function (node) {
        var newNode = Graph.addNode(node._id, node.name, node.type, node.comment, node.graph_id);
        Graph.selectNode(newNode);
        Graph.nodeNewStyle(newNode);
        Graph.setLastInsertedNode(newNode);
        Graph.unselectLink();
        addNodeEventListeners(newNode);
        updateMenu();
    });
}

/**
 * Function called when a node is edited by the user.
 */
function editNode() {
    Graph.editNodeLabel(Graph.selectedNode, nodeNameInput.val());
    Graph.nodeOldStyle(Graph.selectedNode);
    Graph.selectedNode.comment = nodeCommentTextArea.val();
    Networker.updateNode(Graph.selectedNode);
    // Close the panel after update.
    Graph.unselectNode();
    updateMenu();
}

/**
 * Function called when the user removes a node.
 * All the links connected to this node are removed too.
 */
function removeNode() {
    var nodeToRemove = Graph.selectedNode;
    var linksToDelete = [];
    if(nodeToRemove == null) return;
    $.each(Graph.dataset.links, function (i, link) {
       if(link.source._id == nodeToRemove._id || link.target._id == nodeToRemove._id) {
            linksToDelete.push(link);
       }
    });
    $.each(linksToDelete, function (i, link) {
        Graph.removeLink(link);
        Networker.removeLink(link);
    });
    Graph.unselectNode();
    Networker.removeNode(nodeToRemove);
    Graph.removeNode(nodeToRemove);
    updateMenu();
}

// LINKS

/**
 * Function called when a link is created by the user.
 */
function createLink() {
    resetLinkEdition();
    linkEditionStatus.enable = true;
    linkEditionStatus.button = $(this);
    switch ($(this).attr("id")) {
        case "ako-creator":
            linkEditionStatus.type = "ako";
            break;
        case "instance-of-creator":
            linkEditionStatus.type = "instance of";
            break;
        case "association-creator":
            linkEditionStatus.type = "association";
            break;
    }
    $(this).addClass("selected");
}

/**
 * Manages the creation of the links.
 * @param linkEditionStatus object
 * @param node object
 */
function createLinkManager(linkEditionStatus, node) {
    if(linkEditionStatus.enable) {
        if(linkEditionStatus.source == null) linkEditionStatus.source = node;
        else if(linkEditionStatus.target == null) {
            linkEditionStatus.target = node;
            if(isLinkTypeCompatible(linkEditionStatus.source, linkEditionStatus.target, linkEditionStatus.type) &&
                Graph.findLink(linkEditionStatus.source, linkEditionStatus.target) == null &&
                linkEditionStatus.source._id != linkEditionStatus.target._id) {
                Networker.addLink({
                    source: linkEditionStatus.source._id,
                    target: linkEditionStatus.target._id,
                    label: linkEditionStatus.type,
                    type: linkEditionStatus.type,
                    graph_id: Editor.graphId
                }, function (link) {
                    var newLink = Graph.addLink(link._id, Graph.getNodeById(link.source), Graph.getNodeById(link.target), link.label, link.type, link.graph_id);
                    Graph.selectLink(newLink);
                    Graph.unselectNode();
                    addLinkEventListeners(newLink);
                    updateMenu();
                });
            } else {
                alert("Imposssible to create this link. Nodes types are not compatibles or a link already exists.");
            }
            resetLinkEdition();
        }
    } else {
        resetLinkEdition();
    }
}

/**
 * Reinitialises the link edition status object state.
 */
function resetLinkEdition() {
    linkEditionStatus.source = null;
    linkEditionStatus.target = null;
    linkEditionStatus.type = null;
    linkEditionStatus.enable = false;
    linkCreatorButton.removeClass("selected");
}

/**
 * Function called when the user accepts the link modification.
 */
function editLink() {
    Graph.editLinkLabel(Graph.selectedLink, linkLabelInput.val());
    Networker.updateLink(Graph.selectedLink);
    // Close the panel after update.
    Graph.unselectLink();
    updateMenu();
}

/**
 * Function called when user changes the link type of the selected link.
 */
function changeLinkType() {
    var link = Graph.selectedLink;
    if(!isLinkTypeCompatible(link.source, link.target, $(this).val())) {
        alert("Impossible to apply this link type between these nodes.");
        $(this).val(link.type);
        return;
    }
    link.type = $(this).val();
    Graph.getD3Link(Graph.selectedLink).style("stroke-dasharray", function () {
        switch (link.type) {
            case "ako": return ("1, 0");
            case "association": return ("1, 0");
            case "instance of": return ("3, 3");
            default: return ("1, 0");
        }
    });
    Networker.updateLink(link);
}

/**
 * Function called when the user wants to remove a link.
 */
function removeLink() {
    var linkToDelete = Graph.selectedLink;
    if(linkToDelete == null) return;
    Graph.unselectLink();
    Graph.removeLink(linkToDelete);
    Networker.removeLink(linkToDelete);
    updateMenu();
}

/******************************************************************
 *** EVENTS                                                     ***
 ******************************************************************/

// General behaviours
$(document).contextmenu(function () { return false; });
svgContainer.mousedown(function () {
    Graph.unselectLink();
    Graph.unselectNode();
    updateMenu();
});
svgContainer.click(resetLinkEdition);

// CREATION MENU
nodeCreatorButton.click(createNode);
linkCreatorButton.click(createLink);

// NODE MENU
deleteNodeButton.click(removeNode);
validateNodeButton.click(editNode);

// LINK MENU
linkTypeSelection.change(changeLinkType);
deleteLinkButton.click(removeLink);
validateLinkButton.click(editLink);

/**
 * Adds all the event listeners required for a node from the dataset.
 * @param node object
 */
function addNodeEventListeners(node) {
    var domNode = $(Graph.getDomNode(node));
    // Selects the node and opens the menu when the node is pressed.
    domNode.mousedown(function (e) {
        e.stopPropagation();
        Graph.unselectLink();
        Graph.selectNode(node);
        updateMenu();
    });
    // Updates the current node depending on the action.
    domNode.mouseup(function (e) {
        if(e.which == 1) // Left button
            node.fixed = true; // Fix the node position.
        else if(e.which == 3) // Right button
            Graph.freeNodePosition(node); // Free the node position
        Networker.updateNode(node);
    });
    // Begins the creation of a link depending of the linkEditionStatus object.
    domNode.click(function (e) {
        e.stopPropagation();
        createLinkManager(linkEditionStatus, node);
    });
    // Prevents the browwser to open the contextual window.
    domNode.contextmenu(function () { return false; });
}

/**
 * Adds all the event listeners required for a link.
 * @param link object
 */
function addLinkEventListeners(link) {
    var domLink = $("#link-label-" + link._id);
    domLink.mousedown(function (e) {
        e.stopPropagation();
        Graph.unselectNode();
        Graph.selectLink(link);
        updateMenu();
    });
}

// Keyboard shortcuts
$(window).keyup(function (e) {
    switch (e.keyCode) {
        // DELETE button
        case 46 :
            if(nodeMenu.is(":visible")) removeNode();
            if(linkMenu.is(":visible")) removeLink();
            break;
        // ENTER button
        case 13 :
            if(nodeMenu.is(":visible")) editNode();
            if(linkMenu.is(":visible")) editLink();
            break;
    }
});

/******************************************************************
 *** VALIDATION                                                 ***
 ******************************************************************/

/**
 * Returns true is the creation of <linkType> link is possible between <nodeSource> and <nodeTarget>.
 * @param nodeSource node
 * @param nodeTarget node
 * @param linkType string
 * @returns boolean
 */
function isLinkTypeCompatible(nodeSource, nodeTarget, linkType) {
    var validation = true;
    switch (linkType) {
        case "instance of":
            if(nodeSource.type != "object" || nodeTarget.type != "concept")
                validation = false;
            break;
        case "ako":
            if(nodeSource.type != "concept" || nodeTarget.type != "concept")
                validation = false;
            break;
        case "association":
            if(nodeSource.type != "concept" || nodeTarget.type != "concept")
                validation = false;
            break;
        default: validation = false;
    }
    return validation;
}

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {
    addNodeEventListeners,
    addLinkEventListeners
}