/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Connection Information Dialog 
 */
(function (window) {
    $(function () {
        var $dlg = $('#connection-info-modal');
        var $selectConnections = $('.select-connections', $dlg);
        var $name = $('.name', $dlg);
        var $server = $('.server', $dlg);
        var $username = $('.username', $dlg);
        var $password = $('.password', $dlg);
        var $connStr = $('.connection-string', $dlg);
        var $advanceContainer = $('#advance-container', $dlg);
        var $deleteBtn = $('.delete-btn', $dlg);
        var $saveBtn = $('.save-btn', $dlg);

        function reset() {
            $name.val('');
            $server.val('');
            $username.val('');
            $password.val('');
            $connStr.val('');
            $advanceContainer.collapse('hide');
            $('option:not([value="new"])', $selectConnections).remove();
            $('option[value="new"]', $selectConnections).prop('selected', true);
            $deleteBtn.addClass('hidden');
            $saveBtn.prop('disabled', true);
        }

        function initDlgValues() {
            app.connections.forEach(function (conn) {
                $selectConnections.append(`<option value="${conn.id}">${conn.name}</option>`);
            });
            $name.val('Server ' + (app.connections.length + 1));
        }

        $dlg.on('show.bs.modal', function (evt) {
            initDlgValues();
        }).on('hidden.bs.modal', function () {
            reset();
        });

        app.on('open-connection-info-modal', function () {
            $dlg.modal('show');
        });

        $selectConnections.change(function () {
            var id = $selectConnections.val();

            if (id === 'new') {
                $deleteBtn.addClass('hidden');
                $name.val('Server ' + (app.connections.length + 1));
                $server.val('');
                $username.val('');
                $password.val('');
                $connStr.val('');
            } else {
                var conn = app.getConnection(id);
                if (conn) {
                    $deleteBtn.removeClass('hidden');
                    $name.val(conn.name);
                    $server.val(conn.server);
                    $username.val(conn.username);
                    $password.val(conn.password);
                    $connStr.val(conn.raw);
                }
            }
        });

        $('.server, .username, .password, .connection-string', $dlg).keyup(utils.debounce(function () {
            scriptEvent.emit('parse-connection-string', $connStr.val(), $server.val(), $username.val(), $password.val());
        }, 300));

        systemEvent.on('connection-string-parsed', function (err, connectionString, connBuilder) {
            if (err) return console.log(err);

            if (connBuilder['Data Source']) {
                $server.val(connBuilder['Data Source']).change();
                if (!$name.val()) {
                    $name.val(connBuilder['Data Source']).change();
                }
            }
            if (connBuilder['Password']) {
                $password.val(connBuilder['Password']).change();
            }
            if (connBuilder['User ID']) {
                $username.val(connBuilder['User ID']).change();
            }
            if (connectionString) {
                $connStr.val(connectionString).change();
            }
        });

        $('.name, .server, .username, .password', $dlg).change(function () {
            if ($name.val() &&
                $server.val() &&
                $username.val() &&
                $password.val()) {
                $saveBtn.prop('disabled', false);
            } else {
                $saveBtn.prop('disabled', true);
            }
        });

        $('input', $dlg).on('keyup', utils.debounce(function () {
            $(this).change();
        }, 500));

        $deleteBtn.click(function () {
            var id = $selectConnections.val();
            if (id !== 'new') {
                app.removeConnection(id);
                reset();
                initDlgValues();
            }
        });

        $saveBtn.click(function () {
            var id = $selectConnections.val();

            if (id === 'new') {
                app.saveConnection({
                    id: utils.guid(),
                    name: $name.val(),
                    server: $server.val(),
                    username: $username.val(),
                    password: $password.val(),
                    raw: $connStr.val()
                });

                $dlg.modal('hide');
            } else {
                var conn = app.getConnection(id);
                if (conn) {
                    conn.name = $name.val();
                    conn.server = $server.val();
                    conn.username = $username.val();
                    conn.password = $password.val();
                    conn.raw = $connStr.val();

                    app.saveConnection(conn);
                }
            }
        });
    });
}(window));