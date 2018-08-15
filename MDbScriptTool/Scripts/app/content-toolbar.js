/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Content panel toolbar.
 */
(function (window) {
    var $content = $('.content');
    var $toolbar = $('.content-toolbar', $content);

    /** Execute button **/
    var $executeBtn = $('.execute-btn', $toolbar);

    $executeBtn.click(function () {
        var $activeInstance = $('.instance-containers .instance.active', $content);

        if ($activeInstance.length) {
            var editor = $('.CodeMirror', $activeInstance)[0].CodeMirror;
            var sql = editor.getSelection();

            if (!sql) sql = editor.getValue();
            sql = (sql || '').trim();

            if (sql && sql !== '') {
                if (app.state.currentConnection) {
                    var dbs = (app.state.currentConnection.dbs || []).filter(d => d.checked);

                    if (dbs.length) {
                        $('.result', $activeInstance).empty();
                        $executeBtn.prop('disabled', true);
                        var id = $activeInstance.attr('id');

                        app.emit('execute-sql', id);
                        scriptEvent.emit('execute-sql', app.state.currentConnection.raw, dbs.map(db => db.name), sql, id);
                    }
                }
            }
        }
    });

    systemEvent.on('sql-execute-begin', function (id, db) {
        var instance = app.utils.findBy(app.state.instances, 'id', id);

        if (!instance) {
            app.state.instances.push(instance = {
                id: id,
                pending: 0
            });
        }
        instance.pending++;
    });

    systemEvent.on('sql-execute-complete', function (id, db) {
        var instance = app.utils.findBy(app.state.instances, 'id', id);

        if (instance) {
            instance.pending--;
            if (instance.pending === 0 && $('.instance-containers .instance.active', $content).attr('id') === id) {
                $executeBtn.prop('disabled', false);
            }
        }
    });

    app.on('tab-activating', function (id) {
        var instance = app.utils.findBy(app.state.instances, 'id', id);

        if (instance) {
            if (instance.pending === 0) {
                $executeBtn.prop('disabled', false);
            } else if (instance.pending > 0) {
                $executeBtn.prop('disabled', true);
            }
        }
    });
}(window));