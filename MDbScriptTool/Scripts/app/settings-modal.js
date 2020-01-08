/// <reference path="app.js" />

/**
 * Settings Modal
 */
(function (window, app, os, $) {
    app.settings.logging = app.settings.logging || {};
    app.settings.sqlLogging = app.settings.sqlLogging || {};
    app.settings.scriptLibrary = app.settings.scriptLibrary || {};

    $(function () {
        // On fresh startup, the app may need time to build out the data/settings directory.
        // Sync logging settings
        os.once('settings', function (err, settings) {
            if (settings.logging) app.settings.logging = settings.logging;
            if (settings.sqlLogging) app.settings.sqlLogging = settings.sqlLogging;
            if (settings.scriptLibrary) Object.assign(app.settings.scriptLibrary, settings.scriptLibrary);
        }).emit('get-settings');
    });

    var $dlg = $('#settings-modal');
    var $logging = $('#enable-logs', $dlg);
    var $loggingDebug = $('#enable-logs-debug', $dlg);
    var $loggingInfo = $('#enable-logs-info', $dlg);
    var $loggingWarn = $('#enable-logs-warn', $dlg);
    var $loggingError = $('#enable-logs-error', $dlg);
    var $sqlLogging = $('#enable-sql-logs', $dlg);
    var $sqlLoggingDir = $('#sql-log-dir', $dlg);
    var $sqlLogRetention = $('#sql-log-retention', $dlg);
    var $addonJs = $('#addon-js', $dlg);
    var $addonCss = $('#addon-css', $dlg);
    var $scriptLibDir = $('#script-library-dir', $dlg);

    var $saveBtn = $('.save-btn', $dlg);

    $logging.on('change', function () {
        var enabled = $logging.is(':checked');

        $loggingDebug.prop('disabled', !enabled);
        $loggingInfo.prop('disabled', !enabled);
        $loggingWarn.prop('disabled', !enabled);
        $loggingError.prop('disabled', !enabled);
    });

    $sqlLogging.on('change', function () {
        var enabled = $sqlLogging.is(':checked');

        $sqlLoggingDir.prop('disabled', !enabled);
        $sqlLogRetention.prop('disabled', !enabled);
    });

    $sqlLogRetention.on('change keydown', function () {
        var isValid = $sqlLogRetention[0].checkValidity();
        $sqlLogRetention.toggleClass('is-invalid', !isValid)
            .toggleClass('is-valid', isValid);
    });

    $saveBtn.click(function () {
        if ($('input.is-invalid', $dlg).length === 0) {
            app.settings.logging.enabled = $logging.is(':checked');
            app.settings.logging.debug = $loggingDebug.is(':checked');
            app.settings.logging.info = $loggingInfo.is(':checked');
            app.settings.logging.warn = $loggingWarn.is(':checked');
            app.settings.logging.error = $loggingError.is(':checked');

            var retention = $sqlLogRetention.val();
            app.settings.sqlLogging.enabled = $sqlLogging.is(':checked');
            app.settings.sqlLogging.directory = $sqlLoggingDir.val();
            app.settings.sqlLogging.retention = retention ? +retention : null;

            app.settings.scriptLibrary.directory = $scriptLibDir.val().trim();

            os.emit('set-settings', app.settings);

            // If check add-on values change
            var addonChanged = false;
            var addonJs = $addonJs.val().trim();
            if (app.compare(addonJs, app.settings.addonJs)) {
                app.settings.addonJs = addonJs;
                addonChanged = true;
            }
            var addonCss = $addonCss.val().trim();
            if (app.compare(addonCss, app.settings.addonCss)) {
                app.settings.addonCss = addonCss;
                addonChanged = true;
            }

            $dlg.modal('hide');

            if (addonChanged) {
                app.saveState('settings');
                app.alert('AddOn Script and CSS file will be apply on next reload. Reload Now?', 'Hey!!', {
                    cancel: 'Later',
                    ok: 'Reload'
                }, function (reload) {
                    if (reload) {
                        window.location.reload(true);
                    }
                });
            }
        }
    });

    var osFiles;
    $('#sql-log-dir-file, #addon-js-file, #addon-css-file, #script-library-dir-file', $dlg).on('click', function () {
        var $this = $(this);
        osFiles = null;

        os.once('file-dialog-closed', function (err, cancelled, files) {
            if (!cancelled) {
                osFiles = files;

                if ($this[0].hasAttribute('webkitdirectory')) {
                    $this.change();
                }
            }
        });
    }).on('change', function () {
        var $this = $(this);
        var osFile;

        if (osFiles && osFiles.length) {
            if (this.files && this.files.length) {
                osFile = app.findBy(osFiles, 'Name', this.files[0].name);
            } else if (osFiles[0].Type === 'directory' && osFiles[0].Path) {
                osFile = osFiles[0];
            }

            if (osFile) {
                let id = '#' + $this.attr('id').replace('-file', '');

                $(id, $dlg).val(osFile.Path.replace(/\\/g, '/'));
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
        $sqlLogging.prop('checked', app.settings.sqlLogging.enabled).change();
        $sqlLoggingDir.val(app.settings.sqlLogging.directory);
        $sqlLogRetention.val(app.settings.sqlLogging.retention);
        $addonJs.val(app.settings.addonJs);
        $addonCss.val(app.settings.addonCss);
        $scriptLibDir.val(app.settings.scriptLibrary.directory);
    });
}(window, window.app = window.app || {}, window.os, jQuery));
