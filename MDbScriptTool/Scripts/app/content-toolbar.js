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
    var $openFile = $('.open-file-btn', $toolbar);
    /** Editor  buttons **/
    var $commentBtn = $('.comment-btn', $toolbar);
    var $uncommentBtn = $('.uncomment-btn', $toolbar);

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

    app.on(['instance-switched', 'sql-parsed', 'execute-sql-progress', 'sql-executed'], function (instance) {
        if (instance && instance.active) {
            if (instance.pending) {
                _toggleToolbarBtns(true);
            } else {
                _toggleToolbarBtns(false);
            }
        }
    });

    $openFile.on('click', function () {
        $('#open-file-file', $toolbar).click();
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
                console.log(osFile);
                var path = (osFile.WebkitRelativePath + '/' + osFile.Name).replace(/\\/g, '/');
                console.log(path);

                app.openFile(path, function (err, res) {
                    if (err) {
                        return app.alert.error(err);
                    } 

                    var instance = app.createInstance({
                        path: path,
                        name: name,
                        code: res,
                        dirty: false
                    });

                    // Let the editor instance create itself first.
                    setTimeout(function () {
                        app.switchInstance(instance);
                    }, 0);
                });
            }
        }
        osFiles = null;
    });

    $commentBtn.on('click', function () {
        var $instance = $('.instance-container .instance.active', $content);
        var instance = $instance.data('instance');

        instance.editor.appToggleComment();
        instance.editor.focus();
    });

    $uncommentBtn.on('click', function () {
        var $instance = $('.instance-container .instance.active', $content);
        var instance = $instance.data('instance');

        instance.editor.appToggleComment({ mode: 'un' });
        instance.editor.focus();
    });

}(window, window.app = window.app || {}, window.os, jQuery));
