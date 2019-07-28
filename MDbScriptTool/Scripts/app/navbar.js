/// <reference path="app.js" />


/**
 * Navbar
 */
(function (window, app, os, $) {
    var $navbar = $('.navbar');
    var $navbarDrawer = $('#navbar-drawer', $navbar);
    var $navbarToggle = $('.navbar-toggler', $navbar);
    var $sidebarToggle = $('.sidebar-toggle', $navbar);

    // In small screen, hide navbar dropdown drawer when menu item clicked.
    $('li a', $navbarDrawer).click(function () {
        if ($navbarToggle.is(':visible')) {
            $navbarDrawer.collapse('hide');
        }
    });
    // In small screen, hide navbar dropdown drawer when body is clicked
    $('body').click(function () {
        if ($navbarToggle.is(':visible')) {
            $navbarDrawer.collapse('hide');
        }
    });

    app.on('sidebar-collapse-toggled', function (collapsed) {
        $('i', $sidebarToggle).toggleClass('fa-rotate-180', collapsed);
    });

    // Handle sidebar toggle on the navbar
    $sidebarToggle.click(function () {
        app.ui.sidebarCollapsed = !app.ui.sidebarCollapsed;
        app.emit('sidebar-collapse-toggled', app.ui.sidebarCollapsed);
        app.saveState('ui');
    });

    // Restore state
    $(function () {
        app.emit('sidebar-collapse-toggled', app.ui.sidebarCollapsed);
    });
}(window, window.app = window.app || {}, window.os, jQuery));
