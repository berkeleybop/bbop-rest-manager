(function($) {
    // TODO: make the node ID configurable
    var treeNode = $('#jsdoc-toc-nav');

    // initialize the tree
    treeNode.tree({
        autoEscape: false,
        closedIcon: '&#x21e2;',
        data: [{"label":"<a href=\"module-bbop-rest-manager.html\">bbop-rest-manager</a>","id":"module:bbop-rest-manager","children":[{"label":"<a href=\"module-bbop-rest-manager-manager_base.html\">manager_base</a>","id":"module:bbop-rest-manager~manager_base","children":[]},{"label":"<a href=\"module-bbop-rest-manager-manager_jquery.html\">manager_jquery</a>","id":"module:bbop-rest-manager~manager_jquery","children":[]},{"label":"<a href=\"module-bbop-rest-manager-manager_node.html\">manager_node</a>","id":"module:bbop-rest-manager~manager_node","children":[]},{"label":"<a href=\"module-bbop-rest-manager-manager_node_sync.html\">manager_node_sync</a>","id":"module:bbop-rest-manager~manager_node_sync","children":[]}]}],
        openedIcon: ' &#x21e3;',
        saveState: true,
        useContextMenu: false
    });

    // add event handlers
    // TODO
})(jQuery);
