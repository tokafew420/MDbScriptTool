/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Content panel. Contains the editor and the result set(s).
 */
(function (app, window, $) {
    var $content = $('.content');

    var removeAnimateTimer;

    // Toggle collapse on navbar's sidebar toggle click
    app.on('navbar-sidebar-toggled', function (collapsed) {
        clearTimeout(removeAnimateTimer);

        if (collapsed) {
            $content.addClass('animate-250').addClass('full');
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

    // Adjust the instance container height
    var $instanceContainer = $('.instance-containers', $content);
    var containerTop = $instanceContainer.position().top;
    $instanceContainer.css('height', `calc(100% - ${containerTop}px)`);
}(app, window, window.jQuery));