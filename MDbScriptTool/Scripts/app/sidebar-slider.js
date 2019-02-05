/// <reference path="app.js" />

/**
 * Sidebar slider
 */
(function (window) {
    var $sidebarSlider = $('.slider.slider-v');
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
            $dynoStyle.html(`.sidebar.collapsed {
                margin-left: -${left + 6}px;
            }
            .slider.slider-v.collapsed {
                margin-left: -${left + 6}px;
            }`);

            app.emit('sidebar-slider-dragged', left);
        }
    });

    var removeAnimateTimer;
    // Toggle collapse on navbar's sidebar toggle click
    app.on('navbar-sidebar-toggled', function (collapsed) {
        clearTimeout(removeAnimateTimer);

        if (collapsed) {
            $sidebarSlider.addClass('animate-250').addClass('collapsed');
        } else {
            $sidebarSlider.addClass('animate-250').removeClass('collapsed');
        }

        removeAnimateTimer = setTimeout(function () {
            $sidebarSlider.removeClass('animate-250');
        }, 300);
    });
}(window));