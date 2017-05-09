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

var nodeMenu = $("#menu-node");
var nodeNameInput = $("#menu-node-selected-name");
var nodeCommentTextArea = $("#menu-node-selected-comment");
var deleteNodeButton = $("#menu-node-delete");
var linkMenu = $("#menu-link");
var linkLabelInput = $("#menu-link-selected-label");
var linkTypeSelection = $("#menu-link-link-type");
var deleteLinkButton = $("#menu-link-delete");

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

}

/**
 * Fonction appelée quand on valide les changements apportés à un noeud.
 */
function editNode() {
    console.log("Renommage d'un noeud");
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
    console.log("Renommage d'un lien");
}

/**
 * Fonction appelée quand on modifie le type d'un lien.
 */
function changeLinkType() {

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

// Menu noeud
deleteNodeButton.click(removeNode);

// Menu lien
deleteLinkButton.click(removeLink);

// Raccourcis clavier
$(window).keyup(function (e) {
    switch (e.keyCode) {
        // Bouton DELETE
        case 46 :
            // Suppression noeud.
            if(nodeMenu.is(":visible")) removeNode();
            // Suppresion lien.
            if(linkMenu.is(":visible")) removeLink();
            break;
        // Bouton ENTRER
        case 13 :
            // Mise à jour nom noeud.
            if(Graph.selectedNode !== -1) {
                // Update name
                break;
            }
            if(Graph.selectedLink !== -1) {
                // Mise à jour label lien.
                break;
            }
            break;
    }
});

/******************************************************************
 *** VALIDATION                                                 ***
 ******************************************************************/

/**
 * Détermine les contraintes de liaison entre un lien et 2 noeuds.
 * Retourne true si la création est possible, false sinon.
 * @param nodeSourceID int
 * @param nodeTargetID int
 * @param linkType string
 * @returns boolean
 */
function canCreateLink(nodeSourceID, nodeTargetID, linkType) {
    var nodeSource = Graph.getDataNodeById(nodeSourceID);
    var nodeTarget = Graph.getDataNodeById(nodeTargetID);
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

/******************************************************************
 *** EXPORTS                                                    ***
 ******************************************************************/

export {

}