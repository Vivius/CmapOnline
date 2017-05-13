/**
 * Module de gestion des contrôles utilisateur.
 */

import $ from "jquery"
import * as Graph from "./graph"
import * as Networker from "./networker"
import * as Editor from "./editor"

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

var linkEditionStatus = {
    type: "",
    source: -1,
    target: -1,
    enable: false,
    button: null
};

/******************************************************************
 *** MENU FUNCTIONS                                             ***
 ******************************************************************/

// Menu display

/**
 * Met à jour l'affichage de la carte sélectionnée dans le menu latéral.
 * @param id
 */
function updateNodePanel(id) {
    var node = Graph.getNodeById(id);
    if(node == null) {
        if(Graph.selectedLink != -1) {
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
 * Met à jour l'affichage du lien sélectionné dans le menu latéral.
 * @param id
 */
function updateLinkPanel(id) {
    var link = Graph.getLinkById(id);
    if(link == null) {
        if(Graph.selectedNode != -1) {
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
 * Met à jour le menu selon le noeud ou le lien sélectionné.
 */
function updateMenu() {
    updateLinkPanel(Graph.selectedLink);
    updateNodePanel(Graph.selectedNode);
}

// Nodes

/**
 * Fonction appelée quand on crée un nouveau noeud.
 */
function createNode() {
    Networker.addNode({
        name: "NEW",
        type: function (id) {
            return id == "concept-creator" ? "concept" : "object";
        }($(this).attr("id")),
        comment: "",
        fixed: false,
        graph_id: Editor.graphId
    }, function (node) {
        Graph.addNode(node);
        Graph.selectNode(node._id);
        Graph.unselectLink();
        addNodeEventListeners(node._id);
        updateMenu();
    });
}

/**
 * Fonction appelée quand on valide les changements apportés à un noeud.
 */
function editNode() {
    Graph.editNodeLabel(Graph.selectedNode, nodeNameInput.val());
    Graph.getNodeById(Graph.selectedNode).comment = nodeCommentTextArea.val();
    Networker.updateNode(Graph.getNodeById(Graph.selectedNode));
}

/**
 * Fonction appelée quand on supprime un noeud.
 */
function removeNode() {
    var nodeToRemove = Graph.selectedNode;
    if(nodeToRemove == -1) return;
    Graph.unselectNode();
    Networker.removeNode(Graph.getNodeById(nodeToRemove));
    Graph.removeNode(nodeToRemove);
    updateMenu();
}

// Links

/**
 * Fonction appelée quand on crée un nouveau lien.
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
 * Gère les création de liens.
 * @param linkEditionStatus object
 * @param node int
 */
function createLinkManager(linkEditionStatus, node) {
    if(linkEditionStatus.enable) {
        if(linkEditionStatus.source == -1) linkEditionStatus.source = node;
        else if(linkEditionStatus.target == -1) {
            linkEditionStatus.target = node;
            var source = Graph.getNodeById(linkEditionStatus.source);
            var target = Graph.getNodeById(linkEditionStatus.target);
            if(canCreateLink(source, target, linkEditionStatus.type) &&
                Graph.findLink(source._id, target._id) == null &&
                source._id != target._id) {
                Networker.addLink({
                    source: linkEditionStatus.source,
                    target: linkEditionStatus.target,
                    label: linkEditionStatus.type,
                    type: linkEditionStatus.type,
                    graph_id: Editor.graphId
                }, function (link) {
                    Graph.addLink(
                        link.source,
                        link.target,
                        link._id,
                        link.label,
                        link.type
                    );
                    Graph.selectLink(link._id);
                    Graph.unselectNode();
                    addLinkEventListeners(link._id);
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
 * Réinitialise l'état d'édition d'un lien.
 */
function resetLinkEdition() {
    linkEditionStatus.source = -1;
    linkEditionStatus.target = -1;
    linkEditionStatus.type = null;
    linkEditionStatus.enable = false;
    linkCreatorButton.removeClass("selected");
}

/**
 * Fonction appelée quand on valide les changements apportés à un lien.
 */
function editLink() {
    Graph.editLinkLabel(Graph.selectedLink, linkLabelInput.val());
}

/**
 * Fonction appelée quand on modifie le type d'un lien.
 */
function changeLinkType() {
    var link = Graph.getLinkById(Graph.selectedLink);
    if(!canCreateLink(link.source, link.target, $(this).val())) {
        alert("Contrainte de liaison.");
        $(this).val(link.type);
        return;
    }

    link.type = $(this).val();
    Graph.getD3LinkById(Graph.selectedLink).style("stroke-dasharray", function () {
        switch (link.type) {
            case "ako": return ("1, 0");
            case "association": return ("1, 0");
            case "instance of": return ("3, 3");
            default: return ("1, 0");
        }
    });
}

/**
 * Fonction appelée quand on veut supprimer un lien.
 */
function removeLink() {
    var linkToDelete = Graph.selectedLink;
    if(linkToDelete == -1) return;
    Graph.unselectLink();
    Networker.removeLink(Graph.getLinkById(linkToDelete));
    Graph.removeLink(linkToDelete);
    updateMenu();
}

/******************************************************************
 *** EVENTS                                                     ***
 ******************************************************************/

// Menu général
svgContainer.click(updateMenu);
svgContainer.click(resetLinkEdition);

// Menu création
nodeCreatorButton.click(createNode);
linkCreatorButton.click(createLink);

// Menu noeud
deleteNodeButton.click(removeNode);
validateNodeButton.click(editNode);

// Menu lien
linkTypeSelection.change(changeLinkType);
deleteLinkButton.click(removeLink);
validateLinkButton.click(editLink);

/**
 * Ajoute tous les event listeners liés à un noeud.
 * Cette fonction doit être utilisée quand un nouveau noeud est créé.
 * @param id int
 */
function addNodeEventListeners(id) {
    var node = $(Graph.getDomNodeById(id));
    node.click(updateMenu);
    node.click(function () { createLinkManager(linkEditionStatus, Graph.selectedNode); });
}

/**
 * Ajoute tous les event listeners liés à un lien.
 * Cette fonction doit être utilisée quand un nouveau lien est créé.
 * @param id int
 */
function addLinkEventListeners(id) {
    var link = $("#link-label-" + id);
    link.click(updateMenu);
}

// Raccourcis clavier
$(window).keyup(function (e) {
    switch (e.keyCode) {
        // Bouton DELETE
        case 46 :
            if(nodeMenu.is(":visible")) removeNode();
            if(linkMenu.is(":visible")) removeLink();
            break;
        // Bouton ENTRER
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
 * Détermine les contraintes de liaison entre un lien et 2 noeuds au niveau de leur type.
 * Retourne true si la création est possible, false sinon.
 * @param nodeSource node
 * @param nodeTarget node
 * @param linkType string
 * @returns boolean
 */
function canCreateLink(nodeSource, nodeTarget, linkType) {
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