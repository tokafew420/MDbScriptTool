/// <reference path="app.js" />


/**
 * Navbar
 */
(function (window) {
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
        if (collapsed) {
            $('i', $sidebarToggle).removeClass('fa-arrow-circle-left')
                .addClass('fa-arrow-circle-right');
        } else {
            $('i', $sidebarToggle).removeClass('fa-arrow-circle-right')
                .addClass('fa-arrow-circle-left');
        }
    });

    // Handle sidebar toggle on the navbar
    $sidebarToggle.click(function () {
        app.state.ui.sidebarCollapsed = !app.state.ui.sidebarCollapsed;
        app.emit('sidebar-collapse-toggled', app.state.ui.sidebarCollapsed);
        app.saveState('ui');
    });

    // Restore state
    $(function () {
        app.emit('sidebar-collapse-toggled', app.state.ui.sidebarCollapsed);
    });
}(window));
