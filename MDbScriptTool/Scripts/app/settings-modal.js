/// <reference path="app.js" />

/**
 * Settings Modal
 */
$(function () {
    // Sync logging settings
    os.emit('get-log-settings');
    os.once('log-settings', function (err, settings) {
        app.state.settings.logging = settings || {};
    });

    var $dlg = $('#settings-modal');
    var $logging = $('#enable-logs', $dlg);
    var $loggingDebug = $('#enable-logs-debug', $dlg);
    var $loggingInfo = $('#enable-logs-info', $dlg);
    var $loggingWarn = $('#enable-logs-warn', $dlg);
    var $loggingError = $('#enable-logs-error', $dlg);
    var $addonJs = $('#addon-js', $dlg);
    var $addonCss = $('#addon-css', $dlg);

    var $saveBtn = $('.save-btn', $dlg);

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

        os.emit('set-log-settings', app.state.settings.logging);

        // If check add-on values change
        var addonChanged = false;
        var addonJs = $addonJs.val().trim().toLowerCase();
        if (addonJs !== app.state.settings.addonJs) {
            app.state.settings.addonJs = addonJs;
            addonChanged = true;
        }
        var addonCss = $addonCss.val().trim().toLowerCase();
        if (addonCss !== app.state.settings.addonCss) {
            app.state.settings.addonCss = addonCss;
            addonChanged = true;
        }

        $dlg.modal('hide');

        if (addonChanged) {
            app.saveState('settings');
            app.alert('AddOn Script and CSS file will be apply on next reload.', {
                cancel: 'Later',
                ok: 'Reload'
            }, function (reload) {
                if (reload) {
                    window.location.reload(true);
                }
            });
        }
    });

    $dlg.on('show.bs.modal', function (evt) {
        $logging.prop('checked', app.state.settings.logging.enabled).change();
        $loggingDebug.prop('checked', app.state.settings.logging.debug);
        $loggingInfo.prop('checked', app.state.settings.logging.info);
        $loggingWarn.prop('checked', app.state.settings.logging.warn);
        $loggingError.prop('checked', app.state.settings.logging.error);
        $addonJs.val(app.state.settings.addonJs);
        $addonCss.val(app.state.settings.addonCss);
    });
});
