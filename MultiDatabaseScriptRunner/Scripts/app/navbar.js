/// <reference path="utils.js" />
/// <reference path="app.js" />


/**
 * Navbar
 */
(function (window) {
    $(function (window) {
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

        var removeAnimationFn = utils.debounce(function () {
            $sidebar.removeClass('animating');
            $sidebarSlider.removeClass('animating');
            $content.removeClass('animating');
        }, 500);

        // Handle sidebar toggle on the navbar
        $sidebarToggle.click(function () {
            app.uiState.sidebarCollapsed = !app.uiState.sidebarCollapsed;

            if (app.uiState.sidebarCollapsed) {
                $('i', $sidebarToggle).removeClass('fa-arrow-circle-left')
                    .addClass('fa-arrow-circle-right');
            } else {
                $('i', $sidebarToggle).removeClass('fa-arrow-circle-right')
                    .addClass('fa-arrow-circle-left');
            }

            app.emit('navbar-sidebar-toggled', app.uiState.sidebarCollapsed);
        });
    });
}(window));