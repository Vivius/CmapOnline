/**
 * Module d'affichage du graphe.
 */

import Controller from "./controller"
import * as Designer from  "./designer"
import Network from "./networker"

console.log(Designer.removeLink(1));
Designer.addLink(5, 0, 58965, "test", "ako");
Designer.editLinkLabel(2, "je comprend pas moi");
Designer.removeNode(5);
Designer.editNodeLabel(2, "bravo c bien");