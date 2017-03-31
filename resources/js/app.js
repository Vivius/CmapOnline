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
var linkEditionStatus = {
    type: null,
    source: null,
    target: null,
    enable: false
};

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

        {id: 5, name: "C", type: "object"},
        {id: 6, name: "C++", type: "object"},
        {id: 7, name: "LISP", type: "object"},
        {id: 8, name: "C#", type: "object"},
        {id: 9, name: "Javascript", type: "object"},
        {id: 10, name: "PHP", type: "object"},
        {id: 11, name: "Fortran", type: "object"},
        {id: 12, name: "Scala", type: "object"},
        {id: 13, name: "Java", type: "object"},
        {id: 14, name: "Smalltalk", type: "object"},
        {id: 15, name: "Brain Fuck", type: "object"}
    ],
    links: [
        {id: 1, source: 1, target: 0, label: "est un langage de prog.", type: "ako"},
        {id: 2, source: 2, target: 0, label: "est un langage de prog.", type: "ako"},
        {id: 3, source: 3, target: 0, label: "est un langage de prog.", type: "ako"},
        {id: 4, source: 4, target: 0, label: "est un langage de prog.", type: "ako"},

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
 * AFFICHAGE / CREATION DU GRAPHE                                 *
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
            'id': function (d, i) { return 'link-' + d.id },
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
        .data(dataset.links, function (d) { return d.id; })
        .enter()
        .append('text')
        .attr({
            'class': 'link-label',
            'id': function (d) { return 'link-label-' + d.id },
            'dx': linkDistance / 2,
            'dy': -10,
            'font-size': 13,
            'fill': '#000000',
            "text-anchor": "middle"
        })
        .on("click", function (d) { linkClick(d)});
    linkLabels
        .append('textPath')
        .attr('xlink:href', function (d) { return '#link-' + d.id })
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

/**
 * Permet d'appliquer un style de sélection à un lien.
 * @param link DOM_object
 */
function linkSelectionStyle (link) {
    d3.select(link).attr({"fill": "#ff0004", "stroke": "#ff0004"});
}

/**
 * Applique le style par défaut au lien donné.
 * @param link DOM_object
 */
function linkDefaultStyle(link) {
    d3.select(link).attr({"fill": "#000", "stroke": "#000"});
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
        if(link.source.id === node.id || link.target.id === node.id)
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
 * @param label string
 * @param type string
 */
function addLink(fromNode, toNode, label, type) {
    var iFrom = dataset.nodes.indexOf(fromNode);
    var iTo = dataset.nodes.indexOf(toNode);
    var newID = new Date().valueOf();
    dataset.links.push({id: newID, source: iFrom, target: iTo, label: label, type: type});
    update();
    return getLinkById(newID);
}

/**
 * Détermine les contraintes de liaison entre un lien et 2 noeuds.
 * Retourne true si la création est possible, false sinon.
 * @param nodeSource
 * @param nodeTarget
 * @param linkType
 * @returns {boolean}
 */
function canCreateLink(nodeSource, nodeTarget, linkType) {
    var validation = true;
    switch (linkType) {
        case "instance of":
            if(nodeSource.type !== "object") validation = false;
            break;
        case "ako":
            if(nodeSource.type !== "concept" || nodeTarget.type !== "concept") validation = false;
            break;
        case "association": validation = true; break;
        default: validation = true;
    }
    return validation;
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
 * Modifie le label d'un lien du graphe (met à jour l'affichage et les données).
 * @param link DOM_object
 * @param newLabel String
 */
function editLinkLabel(link, newLabel) {
    var d3Link = d3.select(link);
    var linkData = d3Link.datum();
    // Mise à jour des données.
    linkData.label = newLabel;
    // Mise à jour de l'affichage du texte du lien actuel.
    d3.selectAll("textPath").filter(function (d) { return linkData.id === d.id; }).text(linkData.label);
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
        if(val.source.id === sourceNode.id && val.target.id === targetNode.id)
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
        if(val.id === id)
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
    $.each(dataset.links, function (i, val) {
        if(val.id === id)
            link = val;
    });
    return link;
}

/**
 * Retourne un identifiant unique basé sur le temps.
 * @returns string
 */
function uniquID() {
    return new Date().valueOf();
}

/******************************************************************
 * SVG EVENTS & TOOLS                                             *
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
    if(selectedNode !== null) {
        nodeDefaultStyle(selectedNode);
        selectedNode = null;
        updateSelectedNodeMenu(selectedNode);
    }
    if(selectedLink !== null) {
        linkDefaultStyle(selectedLink);
        selectedLink = null;
        updateSelectedLinkMenu(selectedLink);
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
    if(selectedNode !== null) nodeDefaultStyle(selectedNode);
    if(selectedLink !== null) linkDefaultStyle(selectedLink);

    selectedLink = null;
    selectedNode = this;
    nodeSelectionStyle(selectedNode);

    // Mise à jour de l'affichage du menu.
    updateSelectedNodeMenu(selectedNode);
    updateSelectedLinkMenu(selectedLink);

    editLink(linkEditionStatus, d3.select(selectedNode).datum());
}

// TODO : enregistrement des positions après un drag.
function nodeDragEnd() {
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

/**
 * Callback appelée lorque l'on clic sur un des liens du graphe.
 * @param link
 */
function linkClick(link) {
    d3.event.stopPropagation();

    // Rétablissement des styles par défaut pour les anciennes sélections.
    if(selectedLink !== null) linkDefaultStyle(selectedLink);
    if(selectedNode !== null) nodeDefaultStyle(selectedNode);

    selectedNode = null;
    selectedLink = d3.selectAll(".link").filter(function (d) { return d.id === link.id; }).node();
    linkSelectionStyle(selectedLink);

    // Mise à jour de l'affichage du menu.
    updateSelectedLinkMenu(selectedLink);
    updateSelectedNodeMenu(selectedNode);
    $("#menu-link-selected-label")[0].focus();
}

/**
 * Permet d'éditer un lien simplement en passant un objet de statut d'édition de lien et un noeud.
 * La fonction détermine automatiquement si on doit procéder à une création de lien et sait s'il s'agit du premier ou du second appel (source, target...).
 * @param linkEditionStatus linkEditionStatus_object
 * @param node d3_datum
 */
function editLink(linkEditionStatus, node) {
    if(linkEditionStatus.enable) {
        if(linkEditionStatus.source === null) linkEditionStatus.source = node;
        else if(linkEditionStatus.target === null) {
            linkEditionStatus.target = node;

            // Création du nouveau lien si les contraintes le permettent.
            if(canCreateLink(linkEditionStatus.source, linkEditionStatus.target, linkEditionStatus.type)) {
                var newLink = addLink(linkEditionStatus.source, linkEditionStatus.target, linkEditionStatus.type, linkEditionStatus.type);
                selectedLink = d3.selectAll(".link").filter(function (d) { return d.id === newLink.id; }).node();
                linkSelectionStyle(selectedLink);
                updateSelectedLinkMenu(selectedLink);
                // Petite attente pour être sur que l'input n'est pas encore hidden.
                setTimeout(function () { $("#menu-link-selected-label")[0].focus(); }, 500);
                $("#menu-link-selected-label").val(newLink.type);
            } else {
                alert("Contrainte de liaison. Impossible de créer cette relation entre ces types de cartes.");
            }
            // Réinitialisation du linkEditionStatus.
            linkEditionStatus.enable = false;
            linkEditionStatus.source = null;
            linkEditionStatus.target = null;

            // Modification de la sélection.
            nodeDefaultStyle(selectedNode);
            selectedNode = null;
            updateSelectedNodeMenu(selectedNode);
        }
    } else {
        linkEditionStatus.source = null;
        linkEditionStatus.target = null;
    }
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

    if(node === null) {
        nodeMenu.fadeOut();
    } else {
        var d3Node = d3.select(node).datum();
        nameInput.val(d3Node.name);
        nodeMenu.fadeIn();
    }
}

/**
 * Mise à jour de l'affiche du menu d'édition deu lien sélectionné.
 * @param link DOM_object
 */
function updateSelectedLinkMenu (link) {
    var labelInput = $("#menu-link-selected-label");
    var linkMenu = $("#menu-link");
    var linkSelectedType = $("#menu-link-link-type");

    if(link === null) {
        linkMenu.fadeOut();
    } else {
        var d3Link = d3.select(link).datum();
        labelInput.val(d3Link.label);
        linkSelectedType.val(d3Link.type);
        linkMenu.fadeIn();
    }
}

////////////////////////////////
// MENU EVENTS //////////////
//////////////////////////

////////////
// Noeuds //
////////////

/**
 * Event quand on clic sur supprimer un noeud.
 */
$("#menu-node-delete").click(function () {
   removeNode(d3.select(selectedNode).datum());
   selectedNode = null;
   updateSelectedNodeMenu(selectedNode);
});

/**
 * Event quand on clic sur valider les modifications.
 */
$("#menu-node-validate").click(function () {
    editNodeLabel(selectedNode, $("#menu-node-selected-name").val());
});

/**
 * Fonction exécutée quand l'utilisateur crée une nouvelle carte conceptuelle.
 */
$(".node-creator").click(function () {
    var newNode = addNode({
        "id": uniquID(),
        "name": "NEW !",
        "type": function (id) { return id === "concept-creator" ? "concept" : "object"; } ($(this).attr("id")),
        "x": 0,
        "y": 0
    });

    if(selectedLink !== null) linkDefaultStyle(selectedLink);
    selectedLink = null;
    if(selectedNode !== null) nodeDefaultStyle(selectedNode);
    selectedNode = d3.selectAll(".node").filter(function (d) { return d.id === newNode.id; }).node();
    nodeSelectionStyle(selectedNode);

    updateSelectedNodeMenu(selectedNode);
    updateSelectedLinkMenu(selectedLink);
    // Préparation de l'input pour la première modification du nom de la carte.
    $("#menu-node-selected-name").val("");
    $("#menu-node-selected-name")[0].focus();
});

///////////
// Liens //
///////////

/**
 * Appelé lors du clic sur un des boutons de création de lien.
 */
$(".link-creator").click(function () {
    linkEditionStatus.enable = true;
    switch ($(this).attr("id")) {
        case "ako-creator": linkEditionStatus.type = "ako"; break;
        case "instance-of-creator": linkEditionStatus.type = "instance of"; break;
        case "association-creator": linkEditionStatus.type = "association"; break;
    }
});

/**
 * Modification du type d'un lien.
 * TODO : prendre en charge plus de types de lien.
 */
$("#menu-link-link-type").change(function () {
    var d3Link = d3.select(selectedLink); // D3 DOM object
    var linkData = d3Link.datum(); // D3 Datum object

    if(!canCreateLink(linkData.source, linkData.target, $(this).val())) {
        alert("Contrainte de liaison.");
        $(this).val(linkData.type);
        return;
    }

    linkData.type = $(this).val();
    d3Link.style("stroke-dasharray", function () {
        switch (linkData.type) {
            case "ako": return ("1, 0");
            case "association": return ("1, 0");
            case "instance of": return ("3, 3");
            default: return ("1, 0");
        }
    });
});

/**
 * Valide le nouveau label appliqué au lien sélectionné.
 */
$("#menu-link-validate").click(function () {
    editLinkLabel(selectedLink, $("#menu-link-selected-label").val());
});

/**
 * Clic sur le bouton supprimer du menu d'édition des liens.
 */
$("#menu-link-delete").click(function () {
    removeLink(d3.select(selectedLink).datum());
    selectedLink = null;
    updateSelectedLinkMenu(selectedLink);
});

/******************************************************************
 * RACCOURCIS CLAVIER                                             *
 ******************************************************************/

$(window).keyup(function (e) {
    switch (e.keyCode) {
        // Bouton DELETE
        case 46 :
            // Suppression noeud.
            if(selectedNode !== null) {
                removeNode(d3.select(selectedNode).datum());
                selectedNode = null;
                updateSelectedNodeMenu(selectedNode);
                break;
            }
            // Suppresion lien.
            if(selectedLink !== null) {
                removeLink(d3.select(selectedLink).datum());
                selectedLink = null;
                updateSelectedLinkMenu(selectedLink);
                break;
            }
            break;
        // Bouton ENTRER
        case 13 :
            // Mise à jour nom noeud.
            if(selectedNode !== null) {
                var nodeName = $("#menu-node-selected-name");
                if(nodeName.is(":focus")) editNodeLabel(selectedNode, nodeName.val());
                break;
            }
            if(selectedLink !== null) {
                var linkName = $("#menu-link-selected-label");
                if(linkName.is(":focus")) editLinkLabel(selectedLink, linkName.val());
                break;
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