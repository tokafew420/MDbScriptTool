/// <reference path="app.js" />

/**
 * Content panel. Contains the editor and the result set(s).
 */
(function (app, window, $) {
    var $content = $('.content');

    var removeAnimateTimer;

    // Toggle collapse on navbar's sidebar toggle click
    app.on('sidebar-collapse-toggled', function (collapsed) {
        clearTimeout(removeAnimateTimer);

        if (collapsed) {
            $content.addClass('animate-250 full');
        } else {
            $content.addClass('animate-250').removeClass('full');
        }

        removeAnimateTimer = setTimeout(function () {
            $content.removeClass('animate-250');
        }, 300);
    });

    // Adjust margins when sidebar slider is dragged
    app.on('sidebar-slider-dragged', function (left) {
        $content.css('margin-left', (left + 6) + 'px'); // eslint-disable-line no-extra-parens
    });

    app.on('update-content-status', function (text) {
        $('#content-statusbar .status-text', $content).html(text);
    });
}(app, window, window.jQuery));
