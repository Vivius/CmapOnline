/**
 * Module de gestion des contrôles utilisateur.
 */

import $ from "jquery"
import * as Graph from "./graph"

/******************************************************************
 *** VARIABLES                                                  ***
 ******************************************************************/

var svgContainer = $("#svg-container");
var nodes = $(".node");
var links = $(".link-label");

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
    type: null,
    source: null,
    target: null,
    enable: false,
    button: null
};

/******************************************************************
 *** MENU FUNCTIONS                                             ***
 ******************************************************************/

/**
 * Met à jour l'affichage de la carte sélectionnée dans le menu latéral.
 * @param id
 */
function updateNodePanel(id) {
    var node = Graph.getDataNodeById(id);
    if(node === null) {
        nodeMenu.fadeOut();
    } else {
        nodeNameInput.val(node.name);
        nodeCommentTextArea.val(node.comment);
        nodeMenu.fadeIn(function () {
            nodeNameInput[0].focus();
        });
    }
}

/**
 * Met à jour l'affichage du lien sélectionné dans le menu latéral.
 * @param id
 */
function updateLinkPanel(id) {
    var link = Graph.getDataLinkById(id);
    if(link === null) {
        linkMenu.fadeOut();
    } else {
        linkLabelInput.val(link.label);
        linkTypeSelection.val(link.type);
        linkMenu.fadeIn(function () {
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

/**
 * Fonction appelée quand on crée un nouveau noeud.
 */
function createNode() {
    var uniqId =  new Date().valueOf();
    Graph.addNode({_id: uniqId, name: "NEW", type: function (id) {
        return id === "concept-creator" ? "concept" : "object";
    }($(this).attr("id"))});
    Graph.selectNode(uniqId);
    updateMenu();
    // TODO : ajout en BDD et socket emit.
}

/**
 * Fonction appelée quand on valide les changements apportés à un noeud.
 */
function editNode() {
    Graph.editNodeLabel(Graph.selectedNode, nodeNameInput.val());
    Graph.getDataNodeById(Graph.selectedNode).comment = nodeCommentTextArea.val();
}

/**
 * Fonction appelée quand on supprime un noeud.
 */
function removeNode() {
    Graph.removeNode(Graph.selectedNode);
    // TODO : supprimer en BDD.
    Graph.unselectNode();
    updateMenu();
    console.log("Suppression d'un noeud");
}

/**
 * Fonction appelée quand on crée un nouveau lien.
 */
function createLink() {

}

/**
 * Fonction appelée quand on valide les changements apportés à un lien.
 */
function editLink() {
    Graph.editLinkLabel(Graph.selectedLink, linkLabelInput.val());
    console.log("Renommage d'un lien");
}

/**
 * Fonction appelée quand on modifie le type d'un lien.
 */
function changeLinkType() {
    var link = Graph.getDataLinkById(Graph.selectedLink);
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
    Graph.removeLink(Graph.selectedLink);
    // TODO : supprimer en BDD.
    Graph.unselectLink();
    updateMenu();
    console.log("Suppression d'un lien");
}

/******************************************************************
 *** EVENTS                                                     ***
 ******************************************************************/

// Apparition du menu.
nodes.click(updateMenu);
links.click(updateMenu);
svgContainer.click(updateMenu);

// Menu création
nodeCreatorButton.click(createNode);

// Menu noeud
deleteNodeButton.click(removeNode);
validateNodeButton.click(editNode);

// Menu lien
linkTypeSelection.change(changeLinkType);
deleteLinkButton.click(removeLink);
validateLinkButton.click(editLink);

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
 * Détermine les contraintes de liaison entre un lien et 2 noeuds.
 * Retourne true si la création est possible, false sinon.
 * @param nodeSource object
 * @param nodeTarget object
 * @param linkType string
 * @returns boolean
 */
function canCreateLink(nodeSource, nodeTarget, linkType) {
    var validation = true;
    switch (linkType) {
        case "instance of":
            if(nodeSource.type !== "object" || nodeTarget.type !== "concept")
                validation = false;
            break;
        case "ako":
            if(nodeSource.type !== "concept" || nodeTarget.type !== "concept")
                validation = false;
            break;
        case "association":
            if(nodeSource.type !== "concept" || nodeTarget.type !== "concept")
                validation = false;
            break;
        default: validation = false;
    }
    return validation;
}