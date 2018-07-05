﻿/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Sidebar slider
 */
(function (window) {
    $(function () {
        var $sidebarSlider = $('.sidebar-slider');
        var $dynoStyle = $('<style/>');
        $dynoStyle.appendTo($('head'));

        $sidebarSlider.draggable({
            axis: 'x',
            containment: 'parent',
            drag: function (event, ui) {
                var left = ui.offset.left;  // Current left (position: absolute)
                // Constrain movement
                if (left < 100 || left > 500) return false;

                // Sidebar slider is 10px 2 x (border 2px + padding 3px)
                // Only partially hide it
                //$sidebar.css('width', left + 'px');
                $dynoStyle.html(`.sidebar.collapsed {
                    margin-left: -${left + 6}px;
                }
                .sidebar-slider.collapsed {
                    margin-left: -${left + 6}px;
                }`);
                //$content.css('margin-left', (left + 6) + 'px');
                app.emit('sidebar-slider-dragged', left);
            }
        });

        // Toggle collapse on navbar's sidebar toggle click
        app.on('navbar-sidebar-toggled', function (sidebarCollapsed) {
            $sidebarSlider.addClass('animating').toggleClass('collapsed');

            if (!sidebarCollapsed) {
                $sidebarSlider.removeClass('animating');
            }
        });
    });

}(window));