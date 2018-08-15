/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Content panel. Contains the editor and the result set(s).
 */
(function (window) {
    var $content = $('.content');

    // Toggle collapse on navbar's sidebar toggle click
    app.on('navbar-sidebar-toggled', function (collapsed) {
        if (collapsed) {
            $content.addClass('animating').addClass('full');
        } else {
            $content.removeClass('animating').removeClass('full');
        }
    });

    // Adjust margins when sidebar slider is dragged
    app.on('sidebar-slider-dragged', function (left) {
        $content.css('margin-left', (left + 6) + 'px'); // eslint-disable-line no-extra-parens
    });
}(window));