/// <reference path="app.js" />

/**
 * Settings Modal
 */
$(function () {
    // Sync logging settings
    scriptEvent.emit('get-log-settings');
    systemEvent.once('log-settings', function (err, settings) {
        app.state.settings.logging = settings || {};
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
        app.state.settings.logging.enabled = $logging.is(':checked');
        app.state.settings.logging.debug = $loggingDebug.is(':checked');
        app.state.settings.logging.info = $loggingInfo.is(':checked');
        app.state.settings.logging.warn = $loggingWarn.is(':checked');
        app.state.settings.logging.error = $loggingError.is(':checked');

        scriptEvent.emit('set-log-settings', app.state.settings.logging);

        $dlg.modal('hide');
    });

    $dlg.on('show.bs.modal', function (evt) {
        $logging.prop('checked', app.state.settings.logging.enabled).change();
        $loggingDebug.prop('checked', app.state.settings.logging.debug);
        $loggingInfo.prop('checked', app.state.settings.logging.info);
        $loggingWarn.prop('checked', app.state.settings.logging.warn);
        $loggingError.prop('checked', app.state.settings.logging.error);
    });
});