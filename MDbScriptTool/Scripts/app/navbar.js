/// <reference path="utils.js" />
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

    var removeAnimationFn = app.utils.debounce(function () {
        $sidebar.removeClass('animating');
        $sidebarSlider.removeClass('animating');
        $content.removeClass('animating');
    }, 500);

    function setSidebarCollapsed(collapsed) {
        app.state.ui.sidebarCollapsed = !!collapsed;

        if (app.state.ui.sidebarCollapsed) {
            $('i', $sidebarToggle).removeClass('fa-arrow-circle-right')
                .addClass('fa-arrow-circle-left');
        } else {
            $('i', $sidebarToggle).removeClass('fa-arrow-circle-left')
                .addClass('fa-arrow-circle-right');
        }

        app.saveState('ui');
        app.emit('navbar-sidebar-toggled', app.state.ui.sidebarCollapsed);
    }

    // Handle sidebar toggle on the navbar
    $sidebarToggle.click(function () {
        setSidebarCollapsed(!app.state.ui.sidebarCollapsed);
    });

    // Restore state
    $(function () {
        setSidebarCollapsed(app.state.ui.sidebarCollapsed);
    });
}(window));