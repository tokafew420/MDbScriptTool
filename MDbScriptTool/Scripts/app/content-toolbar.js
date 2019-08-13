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
