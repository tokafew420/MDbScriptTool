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
    var $collapseBtn = $('.collapse-btn', $toolbar);
    var $expandBtn = $('.expand-btn', $toolbar);
    /** Result buttons **/
    var $exportResultsBtn = $('.export-results-btn', $toolbar);
    var $exportTextBtn = $('.export-text-btn', $toolbar);

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
        if (osFiles && osFiles.length && this.files && this.files.length) {
            var name = this.files[0].name;
            var osFile = app.findBy(osFiles, 'Name', name);
            if (osFile) {
                app.loadInstance(null, osFile.Path, name);
            }
        }
        osFiles = null;
    });

    // When the server asks for a file to be opened
    app.on('open-file', function (name, path) {
        app.loadInstance(null, path, name);
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

    $collapseBtn.on('click', function () {
        if (app.instance && app.instance.editor) {
            app.instance.editor.execCommand('fold');
            app.instance.editor.focus();
        }
    }).on('dblclick', function () {
        if (app.instance && app.instance.editor) {
            app.instance.editor.execCommand('foldAll');
            app.instance.editor.focus();
        }
    });

    $expandBtn.on('click', function () {
        if (app.instance && app.instance.editor) {
            app.instance.editor.execCommand('unfold');
            app.instance.editor.focus();
        }
    }).on('dblclick', function () {
        if (app.instance && app.instance.editor) {
            app.instance.editor.execCommand('unfoldAll');
            app.instance.editor.focus();
        }
    });

    $exportResultsBtn.on('click', function () {
        if (app.instance) {
            app.downloadToCsv(app.instance, function () {
                app.instance.editor.focus()
            });
        }
    });

    $exportTextBtn.on('click', function () {
        let instance = app.instance;
        if (instance && instance.results && instance.$result) {
            let $results = $('.header-text, .result-text', instance.$result);

            if ($results.length) {
                app.emit('export-result-text', instance);
                var filename = app.date.format(new Date(), 'yyyymmddhhMMss') + '.txt';

                app.downloadText($results.map(function () {
                    let $this = $(this);

                    if ($this.hasClass('header-text')) {
                        let header = $this.text();
                        return header + '\r\n'.padEnd(header.length, '-');
                    } else {
                        return $this.text() + '\r\n';
                    }
                }).get().join('\r\n'), encodeURIComponent(filename), 'text/plain;charset=utf-8');

                os.once('download-completed', function (complete, download) {
                    if (complete) {
                        var file = {
                            path: download.FullPath.replace(/\\/g, '/')
                        };
                        file.name = file.path.split('/').pop();
                    }
                    app.emit('file-downloaded', file);
                });
                return;
            }
        }

        return app.alert('<p>No result set found.</p>', 'Oops!', {
            html: true
        });
    });
}(window, window.app = window.app || {}, window.os, jQuery));
