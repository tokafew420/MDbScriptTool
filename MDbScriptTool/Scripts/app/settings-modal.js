/// <reference path="app.js" />

/**
 * Settings Modal
 */
(function (window, app, os, $) {
    var $dlg = $('#settings-modal');
    var $singleInstance = $('#single-instance', $dlg);
    var $logToDevConsole = $('#log-to-dev-console', $dlg);
    var $logLevel = $('#log-level-select', $dlg);
    var $sqlLogging = $('#enable-sql-logs', $dlg);
    var $sqlLoggingDir = $('#sql-log-dir', $dlg);
    var $sqlLogRetention = $('#sql-log-retention', $dlg);
    var $addOnJs = $('#add-on-js', $dlg);
    var $addOnCss = $('#add-on-css', $dlg);
    var $scriptLibDir = $('#script-library-dir', $dlg);

    var $saveBtn = $('.save-btn', $dlg);

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
            app.settings.singleInstance = $singleInstance.is(':checked');
            app.settings.logging.logToDevConsole = $logToDevConsole.is(':checked');
            app.settings.logging.logLevel = $logLevel.val();

            var retention = $sqlLogRetention.val();
            app.settings.sqlLogging.enabled = $sqlLogging.is(':checked');
            app.settings.sqlLogging.directory = $sqlLoggingDir.val();
            app.settings.sqlLogging.retention = retention ? +retention : null;

            app.settings.scriptLibrary = $scriptLibDir.val().trim();

            // If check add-on values change
            var addOnChanged = false;
            var addOnJs = $addOnJs.val().trim();
            if (app.compare(addOnJs, app.settings.addOnJs)) {
                app.settings.addOnJs = addOnJs;
                addOnChanged = true;
            }
            var addOnCss = $addOnCss.val().trim();
            if (app.compare(addOnCss, app.settings.addOnCss)) {
                app.settings.addOnCss = addOnCss;
                addOnChanged = true;
            }

            os.emit('set-settings', app.settings);

            $dlg.modal('hide');

            if (addOnChanged) {
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
    $('#sql-log-dir-file, #add-on-js-file, #add-on-css-file, #script-library-dir-file', $dlg).on('click', function () {
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
        $singleInstance.prop('checked', app.settings.singleInstance);
        $logToDevConsole.prop('checked', app.settings.logging.logToDevConsole);
        $logLevel.val(app.settings.logging.logLevel);
        $sqlLogging.prop('checked', app.settings.sqlLogging.enabled).change();
        $sqlLoggingDir.val(app.settings.sqlLogging.directory);
        $sqlLogRetention.val(app.settings.sqlLogging.retention);
        $addOnJs.val(app.settings.addOnJs);
        $addOnCss.val(app.settings.addOnCss);
        $scriptLibDir.val(app.settings.scriptLibrary);
    });
}(window, window.app = window.app || {}, window.os, jQuery));
