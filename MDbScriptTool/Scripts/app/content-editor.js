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
                mode: mime,
                indentWithTabs: true,
                indentUnit: 4,
                smartIndent: true,
                lineNumbers: true,
                matchBrackets: true,
                autofocus: true,
                theme: theme,
                keyMap: 'app'
            });

            if (instance.code) {
                editor.setValue(instance.code);
            }

            editor.on('change', app.debounce(function() {
                instance.dirty = instance.original !== SparkMD5.hash(editor.getValue());
                instance.$tab.toggleClass('is-dirty', instance.dirty);
            }, 500));

            editor.on('change', app.debounce(function () {
                instance.code = editor.getValue();
                app.saveState('instances');
            }, 5000));
        }
    });
}(window, window.app = window.app || {}, window.os, jQuery));
