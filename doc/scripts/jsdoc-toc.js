(function($) {
    // TODO: make the node ID configurable
    var treeNode = $('#jsdoc-toc-nav');

    // initialize the tree
    treeNode.tree({
        autoEscape: false,
        closedIcon: '&#x21e2;',
        data: [{"label":"<a href=\"module-bbop-rest-manager.html\">bbop-rest-manager</a>","id":"module:bbop-rest-manager","children":[{"label":"<a href=\"module-bbop-rest-manager-manager.html\">manager</a>","id":"module:bbop-rest-manager~manager","children":[]}]}],
        openedIcon: ' &#x21e3;',
        saveState: true,
        useContextMenu: false
    });

    // add event handlers
    // TODO
})(jQuery);
