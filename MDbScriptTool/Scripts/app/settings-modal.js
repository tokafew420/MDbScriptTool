/// <reference path="app.js" />

/**
 * Settings Modal
 */
$(function () {
    // Sync logging settings
    scriptEvent.emit('get-log-settings');
    systemEvent.once('log-settings', function (settings) {
        app.settings.logging = settings || {};
    });

    var $dlg = $('#settings-modal');
    var $logging = $('#enable-logs', $dlg);
    var $loggingDebug = $('#enable-logs-debug', $dlg);
    var $loggingInfo = $('#enable-logs-info', $dlg);
    var $loggingWarn = $('#enable-logs-warn', $dlg);
    var $loggingError = $('#enable-logs-error', $dlg);
    var $saveBtn = $('.save-btn', $dlg);

    $('[data-toggle="tooltip"]', $dlg).tooltip();

    $logging.change(function () {
        var enabled = $logging.is(':checked');

        $loggingDebug.prop('disabled', !enabled);
        $loggingInfo.prop('disabled', !enabled);
        $loggingWarn.prop('disabled', !enabled);
        $loggingError.prop('disabled', !enabled);
    });

    $saveBtn.click(function () {
        app.settings.logging.enabled = $logging.is(':checked');
        app.settings.logging.debug = $loggingDebug.is(':checked');
        app.settings.logging.info = $loggingInfo.is(':checked');
        app.settings.logging.warn = $loggingWarn.is(':checked');
        app.settings.logging.error = $loggingError.is(':checked');

        scriptEvent.emit('set-log-settings', app.settings.logging);

        $dlg.modal('hide');
    });

    $dlg.on('show.bs.modal', function (evt) {
        $logging.prop('checked', app.settings.logging.enabled).change();
        $loggingDebug.prop('checked', app.settings.logging.debug);
        $loggingInfo.prop('checked', app.settings.logging.info);
        $loggingWarn.prop('checked', app.settings.logging.warn);
        $loggingError.prop('checked', app.settings.logging.error);
    });
});