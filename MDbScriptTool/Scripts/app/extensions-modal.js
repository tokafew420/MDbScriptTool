/// <reference path="app.js" />

/**
 * Settings Modal
 */
(function (window, app, os, $) {
    var $dlg = $('#extensions-modal');
    var $setFileAssocBtn = $('#extensions-set-file-assoc-btn', $dlg);
    var $removeFileAssocBtn = $('#extensions-remove-file-assoc-btn', $dlg);
    var $saveBtn = $('.save-btn', $dlg);

    $setFileAssocBtn.on('click', function () {
        os.emit('set-file-association', app.settings);
    });
    os.on('file-association-set', function (err, msg) {
        if (err) {
            console.error(err);
            msg = 'Error trying to set file association. Error: ' + msg;
        }
        return app.alert(msg, err ? 'Error' : 'Success');
    });

    $removeFileAssocBtn.on('click', function () {
        os.emit('remove-file-association', app.settings);
    });
    os.on('file-association-removed', function (err, msg) {
        if (err) {
            console.error(err);
            msg = 'Error trying to remove file association. Error: ' + msg;
        }
        return app.alert(msg, err ? 'Error' : 'Success');
    });

    $dlg.on('show.bs.modal', function (evt) {

    });
}(window, window.app = window.app || {}, window.os, jQuery));
