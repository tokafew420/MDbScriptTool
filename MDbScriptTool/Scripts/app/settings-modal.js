/// <reference path="app.js" />

/**
 * Settings Modal
 */
(function (window, app, os, $) {
    // Sync logging settings
    os.emit('get-log-settings');
    os.once('log-settings', function (err, settings) {
        app.settings.logging = settings || {};
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
        app.settings.logging.enabled = $logging.is(':checked');
        app.settings.logging.debug = $loggingDebug.is(':checked');
        app.settings.logging.info = $loggingInfo.is(':checked');
        app.settings.logging.warn = $loggingWarn.is(':checked');
        app.settings.logging.error = $loggingError.is(':checked');

        os.emit('set-log-settings', app.settings.logging);

        // If check add-on values change
        var addonChanged = false;
        var addonJs = $addonJs.val().trim().toLowerCase();
        if (addonJs !== app.settings.addonJs) {
            app.settings.addonJs = addonJs;
            addonChanged = true;
        }
        var addonCss = $addonCss.val().trim().toLowerCase();
        if (addonCss !== app.settings.addonCss) {
            app.settings.addonCss = addonCss;
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

    var osFiles;
    $('#addon-js-file, #addon-css-file', $dlg).on('click', function () {
        osFiles = null;
        os.on('file-dialog-closed', function (err, cancelled, files) {
            if (!cancelled) osFiles = files;
        });
    }).on('change', function () {
        var $this = $(this);
        if (osFiles && osFiles.length && this.files && this.files.length) {
            var osFile = app.findBy(osFiles, 'Name', this.files[0].name);
            if (osFile) {
                var id = '#' + $this.attr('id').replace('-file', '');

                $(id, $dlg).val((osFile.WebkitRelativePath + '/' + osFile.Name).replace(/\\/g, '/'));
            }
        }
        osFiles = null;
    });

    $dlg.on('show.bs.modal', function (evt) {
        $logging.prop('checked', app.settings.logging.enabled).change();
        $loggingDebug.prop('checked', app.settings.logging.debug);
        $loggingInfo.prop('checked', app.settings.logging.info);
        $loggingWarn.prop('checked', app.settings.logging.warn);
        $loggingError.prop('checked', app.settings.logging.error);
        $addonJs.val(app.settings.addonJs);
        $addonCss.val(app.settings.addonCss);
    });
}(window, window.app = window.app || {}, window.os, jQuery));
