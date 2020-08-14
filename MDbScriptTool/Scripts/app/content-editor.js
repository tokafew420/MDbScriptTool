/// <reference path="app.js" />

/**
 * Editor within the instance container.
 */
(function (window, app, os, $) {
    app.on('instance-created', function (instance) {
        if (instance && instance.$editor) {
            // Initialize codemirror editor
            var mime = 'text/x-tsql';
            var theme = 'twilight-vs-tsql';

            var editor = instance.editor = CodeMirror(instance.$editor[0], {
                autofocus: true,
                indentWithTabs: true,
                indentUnit: 4,
                foldGutter: true,
                foldOptions: {
                    rangeFinder: new CodeMirror.fold.combine(CodeMirror.fold.tsql, CodeMirror.fold.linecomment, CodeMirror.fold.comment),
                    widget: '...'
                },
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                lineNumbers: true,
                keyMap: 'app',
                matchBrackets: true,
                mode: mime,
                scrollPastEnd: true,
                smartIndent: true,
                theme: theme
            });

            if (instance.code) {
                editor.setValue(instance.code);
                editor.clearHistory();
            }

            editor.on('change', app.debounce(function () {
                instance.dirty = instance.original !== SparkMD5.hash(editor.getValue());
                instance.$tab.toggleClass('is-dirty', instance.dirty);
            }, 500));

            editor.on('change', app.debounce(function () {
                instance.code = editor.getValue();
                app.saveInstance(instance);
            }, 1000));

            // Ignore when a file is dragged to allow for custom handling
            editor.on('dragstart', function (cm, e) {
                e.codemirrorIgnore = e.dataTransfer.items.length && e.dataTransfer.items[0].kind === 'file';
            });
            editor.on('dragenter', function (cm, e) {
                e.codemirrorIgnore = e.dataTransfer.items.length && e.dataTransfer.items[0].kind === 'file';
            });
            editor.on('dragover', function (cm, e) {
                e.codemirrorIgnore = e.dataTransfer.items.length && e.dataTransfer.items[0].kind === 'file';
            });
            editor.on('drop', function (cm, e) {
                e.codemirrorIgnore = e.dataTransfer.items.length && e.dataTransfer.items[0].kind === 'file';
            });
        }
    }).on('instance-loaded', function (instance) {
        if (instance && instance.$editor) {
            instance.editor.setValue(instance.code || '');
            instance.editor.clearHistory();
        }
    });
}(window, window.app = window.app || {}, window.os, jQuery));
