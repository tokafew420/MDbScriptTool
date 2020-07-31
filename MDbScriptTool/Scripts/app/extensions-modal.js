/// <reference path="app.js" />

/**
 * Settings Modal
 */
(function (window, app, os, $) {
    var $dlg = $('#extensions-modal');
    var $setFileAssocBtn = $('#extensions-set-file-assoc-btn', $dlg);
    var $removeFileAssocBtn = $('#extensions-remove-file-assoc-btn', $dlg);
    var $addCtxMenuBtn = $('#extensions-add-context-menu-btn', $dlg);
    var $removeCtxMenuBtn = $('#extensions-remove-context-menu-btn', $dlg);
    var $saveBtn = $('.save-btn', $dlg);

    $setFileAssocBtn.on('click', function () {
        app.loading('Setting', { parent: $dlg });
        os.emit('set-file-association', app.settings);
    });
    os.on('file-association-set', function (err, msg) {
        if (err) {
            console.error(err);
            msg = 'Error trying to set file association. Error: ' + msg;
        }
        app.loading.hide($dlg);
        return app.alert(msg, err ? 'Error' : 'Success');
    });

    $removeFileAssocBtn.on('click', function () {
        app.loading('Removing', { parent: $dlg });
        os.emit('remove-file-association', app.settings);
    });
    os.on('file-association-removed', function (err, msg) {
        if (err) {
            console.error(err);
            msg = 'Error trying to remove file association. Error: ' + msg;
        }
        app.loading.hide($dlg);
        return app.alert(msg, err ? 'Error' : 'Success');
    });

    $addCtxMenuBtn.on('click', function () {
        app.loading('Adding', { parent: $dlg });
        os.emit('add-context-menu', app.settings);
    });
    os.on('context-menu-added', function (err, msg) {
        if (err) {
            console.error(err);
            msg = 'Error trying to add context menu. Error: ' + msg;
        }
        app.loading.hide($dlg);
        return app.alert(msg, err ? 'Error' : 'Success');
    });

    $removeCtxMenuBtn.on('click', function () {
        app.loading('Removing', { parent: $dlg });
        os.emit('remove-context-menu', app.settings);
    });
    os.on('context-menu-removed', function (err, msg) {
        if (err) {
            console.error(err);
            msg = 'Error trying to remove remove context. Error: ' + msg;
        }
        app.loading.hide($dlg);
        return app.alert(msg, err ? 'Error' : 'Success');
    });

    $dlg.on('show.bs.modal', function (evt) {

    });
}(window, window.app = window.app || {}, window.os, jQuery));
