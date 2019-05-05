/// <reference path="app.js" />

/**
 * Content panel toolbar.
 */
(function (window) {
    var $content = $('.content');
    var $toolbar = $('.content-toolbar', $content);

    /** Execute button **/
    var $executeBtn = $('.execute-btn', $toolbar);
    var $parseBtn = $('.parse-btn', $toolbar);

    $executeBtn.click(function () {
        var $activeInstance = $('.instance-containers .instance.active', $content);

        if ($activeInstance.length) {
            var editor = $('.CodeMirror', $activeInstance)[0].CodeMirror;
            var sql = editor.getSelection();

            if (!sql) sql = editor.getValue();
            sql = (sql || '').trim();

            if (sql) {
                if (app.state.currentConnection) {
                    var dbs = (app.state.currentConnection.dbs || []).filter(function (d) { return d.checked; });

                    if (dbs.length) {
                        $('.result', $activeInstance).empty();
                        $executeBtn.prop('disabled', true);
                        $parseBtn.prop('disabled', true);
                        var id = $activeInstance.attr('id');

                        app.emit('execute-sql', id);
                        os.emit('execute-sql', app.state.currentConnection.raw, dbs.map(function (db) { return db.name; }), sql, id);
                    }
                }
            }
        }
    });

    $parseBtn.click(function () {
        var $activeInstance = $('.instance-containers .instance.active', $content);

        if ($activeInstance.length) {
            var editor = $('.CodeMirror', $activeInstance)[0].CodeMirror;
            var sql = editor.getSelection();

            if (!sql) sql = editor.getValue();
            sql = (sql || '').trim();

            if (sql) {
                if (app.state.currentConnection) {

                    $('.result', $activeInstance).empty();
                    $executeBtn.prop('disabled', true);
                    $parseBtn.prop('disabled', true);
                    var id = $activeInstance.attr('id');

                    var instance = app.findBy(app.state.instances, 'id', id);

                    if (instance) {
                        app.emit('parse-sql', id);
                        os.emit('parse-sql', app.state.currentConnection.raw, sql, id);
                        instance.pending++;
                    }
                }
            }
        }
    });

    os.on('sql-exe-db-begin', function (err, id, db) {
        var instance = app.findBy(app.state.instances, 'id', id);

        if (instance) {
            instance.pending++;
        }
    });

    os.on('sql-exe-db-complete', function (err, id, db) {
        var instance = app.findBy(app.state.instances, 'id', id);

        if (instance) {
            instance.pending--;
            if (instance.pending === 0 && $('.instance-containers .instance.active', $content).attr('id') === id) {
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

        var instance = app.findBy(app.state.instances, 'id', id);

        if (instance) {
            instance.pending = 0;
            if ($('.instance-containers .instance.active', $content).attr('id') === id) {
                $executeBtn.prop('disabled', false);
                $parseBtn.prop('disabled', false);
            }
        }
    });

    app.on('tab-activating', function (id) {
        var instance = app.findBy(app.state.instances, 'id', id);

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
}(window));
