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

    $executeBtn.click(function () {
        var $activeInstance = $('.instance-container .instance.active', $content);

        app.emit('execute-instance', $activeInstance);
        var instance = $activeInstance.data('instance');

        instance.editor.focus();
    });

    app.on('execute-instance', function ($instance, dbs) {
        $instance = $($instance);

        if ($instance && $instance.length) {
            var editor = $('.CodeMirror', $instance)[0].CodeMirror;
            var sql = editor.getSelection();

            if (!sql) sql = editor.getValue();
            sql = (sql || '').trim();

            if (sql) {
                if (app.connection) {
                    if (!dbs) {
                        dbs = (app.connection.dbs || [])
                            .filter(function (d) { return d.checked; })
                            .map(function (db) { return db.name; });
                    }

                    if (dbs.length) {
                        $('.result', $instance).empty();
                        $executeBtn.prop('disabled', true);
                        $parseBtn.prop('disabled', true);
                        var id = $instance.attr('id');

                        app.emit('execute-sql', id);
                        os.emit('execute-sql', app.connection.raw, dbs, sql, id);
                    }
                }
            }
        }
    });

    $parseBtn.click(function () {
        var $activeInstance = $('.instance-container .instance.active', $content);

        if ($activeInstance.length) {
            var editor = $('.CodeMirror', $activeInstance)[0].CodeMirror;
            var sql = editor.getSelection();

            if (!sql) sql = editor.getValue();
            sql = (sql || '').trim();

            if (sql) {
                if (app.connection) {

                    $('.result', $activeInstance).empty();
                    $executeBtn.prop('disabled', true);
                    $parseBtn.prop('disabled', true);
                    var id = $activeInstance.attr('id');

                    var instance = app.findBy(app.instances, 'id', id);

                    if (instance) {
                        app.emit('parse-sql', id);
                        os.emit('parse-sql', app.connection.raw, sql, id);
                        instance.pending++;
                    }
                }
            }

            editor.focus();
        }
    });

    os.on('sql-exe-db-begin', function (err, id, db) {
        var instance = app.findBy(app.instances, 'id', id);

        if (instance) {
            instance.pending++;
        }
    });

    os.on('sql-exe-db-complete', function (err, id, db) {
        var instance = app.findBy(app.instances, 'id', id);

        if (instance) {
            instance.pending--;
            if (instance.pending === 0 && $('.instance-container .instance.active', $content).attr('id') === id) {
                $executeBtn.prop('disabled', false);
                $parseBtn.prop('disabled', false);
            }
        }
    });

    // This event only fires when the entire batch failed to execute.
    os.on(['sql-exe-complete', 'sql-parse-complete'], function (err, id) {
        if (err) {
            console.log(err);
            app.alert(err.Message, 'Error Executing SQL');
        }

        var instance = app.findBy(app.instances, 'id', id);

        if (instance) {
            instance.pending = 0;
            if ($('.instance-container .instance.active', $content).attr('id') === id) {
                $executeBtn.prop('disabled', false);
                $parseBtn.prop('disabled', false);
            }
        }
    });

    app.on('tab-activating', function (id) {
        var instance = app.findBy(app.instances, 'id', id);

        if (instance) {
            if (instance.pending === 0) {
                $executeBtn.prop('disabled', false);
                $parseBtn.prop('disabled', false);
            } else if (instance.pending > 0) {
                $executeBtn.prop('disabled', true);
                $parseBtn.prop('disabled', true);
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
