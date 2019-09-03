/// <reference path="app.js" />

/**
 * Execute Options Modal
 */
(function (window, app, os, $) {

    var $dlgBtn = $('.content-toolbar .execute-options-btn');
    var $dlg = $('#execute-options-modal');
    var $cmdTimeout = $('.cmd-timeout', $dlg);
    var $saveBtn = $('.save-btn', $dlg);

    $dlgBtn.on('click', function () {
        $dlg.modal('show');
    });

    $cmdTimeout.on('keydown change', app.debounce(function () {
        var isValid = $cmdTimeout[0].checkValidity();
        $cmdTimeout.toggleClass('is-invalid', !isValid)
            .toggleClass('is-valid', isValid);
    }, 100));

    $saveBtn.click(function () {
        if (app.instance && $('input.is-invalid', $dlg).length === 0) {
            var timeout = $cmdTimeout.val();

            app.instance.timeout = timeout ? +timeout : null;

            app.saveState('instances');

            $dlg.modal('hide');
        }
    });

    $dlg.on('hidden.bs.modal', function (e) {
        $cmdTimeout.val('').remove('is-invalid is-valid');
    }).on('show.bs.modal', function (e) {
        if (app.instance) {
            if (app.instance.timeout >= 0) {
                $cmdTimeout.val(app.instance.timeout).change();

            }
        }
    });
}(window, window.app = window.app || {}, window.os, jQuery));
