/// <reference path="app.js" />

/**
 * Content panel toolbar.
 */
(function (window, app, os, $) {
    var $content = $('.content');
    var $toolbar = $('.content-toolbar', $content);

    /** Execute buttons **/
    var $executeBtn = $('.execute-btn', $toolbar);
    var $parseBtn = $('.parse-btn', $toolbar);
    /** File buttons **/
    var $newFile = $('.new-file-btn', $toolbar);
    var $openFile = $('.open-file-btn', $toolbar);
    var $saveFile = $('.save-file-btn', $toolbar);
    var $saveAsFile = $('.save-as-file-btn', $toolbar);
    /** Editor buttons **/
    var $commentBtn = $('.comment-btn', $toolbar);
    var $uncommentBtn = $('.uncomment-btn', $toolbar);
    /** Result buttons **/
    var $exportBtn = $('.export-btn', $toolbar);

    function _toggleToolbarBtns(disabled) {
        // Disabled these toolbar button while a sql operation is in progress
        $executeBtn.prop('disabled', disabled);
        $parseBtn.prop('disabled', disabled);
    }

    $executeBtn.click(function () {
        _toggleToolbarBtns(true);

        if (app.instance && app.instance.editor) {
            if (app.executeSql()) {
                app.instance.editor.focus();
                return;
            }
        }

        _toggleToolbarBtns(false);
    });

    $parseBtn.click(function () {
        _toggleToolbarBtns(true);

        if (app.instance && app.instance.editor) {
            if (app.parseSql()) {
                app.instance.editor.focus();
                return;
            }
        }

        _toggleToolbarBtns(false);
    });

    app.on(['instance-switched', 'sql-parsed', 'execute-sql-db-begin', 'execute-sql-db-complete', 'sql-executed'], function (instance) {
        if (instance && instance.active) {
            if (instance.pending) {
                _toggleToolbarBtns(true);
            } else {
                _toggleToolbarBtns(false);
            }
        }
    });

    $newFile.on('click', function () {
        app.once('instance-created', function (inst) {
            app.switchInstance(inst);
        });

        app.createInstance();
    });

    var openFile = function (name, path) {
        app.openFile(path, function (err, res) {
            if (err) {
                return app.alert(`<span class="text-danger">${err || 'Failed to load file'}</span>`, 'Error', { html: true });
            }
            // If the current instance the default "New" tab then load the file into that instead.
            if (!app.instance.code && !app.instance.path) {
                app.loadInstance(app.instance, path, name, res);
            } else {
                let instance = app.createInstance({
                    path: path,
                    name: name,
                    code: res,
                    dirty: false
                });

                // Let the editor instance create itself first.
                setTimeout(function () {
                    app.switchInstance(instance);
                }, 0);
            }
        });
    };

    $openFile.on('click', function () {
        $('#open-file-file', $toolbar).val(null).click();
        return false;
    });

    var osFiles;
    $('#open-file-file', $toolbar).on('click', function () {
        osFiles = null;
        os.once('file-dialog-closed', function (err, cancelled, files) {
            if (!cancelled) osFiles = files;
        });
    }).on('change', function () {
        var $this = $(this);
        if (osFiles && osFiles.length && this.files && this.files.length) {
            var name = this.files[0].name;
            var osFile = app.findBy(osFiles, 'Name', name);
            if (osFile) {
                var path = osFile.Path.replace(/\\/g, '/');

                openFile(name, path);
            }
        }
        osFiles = null;
    });

    // When the server asks for a file to be opened
    app.on('open-file', function (name, path) {
        // If the file is already opened then switch to it
        for (var instance of app.instances) {
            // Check if id is from this app (in case of multi app instances)
            if (instance.path === path) {
                app.switchInstance(instance);
                return;
            }
        }
        openFile(name, path);
    });

    $saveFile.on('click', function () {
        if (app.instance && app.instance.editor) {
            app.saveInstanceToFile(false);
            app.instance.editor.focus();
        }
    });

    $saveAsFile.on('click', function () {
        if (app.instance && app.instance.editor) {
            app.saveInstanceToFile(true);
            app.instance.editor.focus();
        }
    });

    $commentBtn.on('click', function () {
        if (app.instance && app.instance.editor) {
            app.instance.editor.appToggleComment();
            app.instance.editor.focus();
        }
    });

    $uncommentBtn.on('click', function () {
        if (app.instance && app.instance.editor) {
            app.instance.editor.appToggleComment({ mode: 'un' });
            app.instance.editor.focus();
        }
    });

    $exportBtn.on('click', function () {
        if (app.instance) {
            app.downloadToCsv(app.instance);
            app.instance.editor.focus();
        }
    });
}(window, window.app = window.app || {}, window.os, jQuery));
