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
            $('option:not([value="-1"])', $selectConnections).remove();
            $('option:first', $selectConnections).prop('selected', true);
            $deleteBtn.addClass('hidden');
            $saveBtn.prop('disabled', true);
        }

        function initDlgValues() {
            app.connections.forEach(function (connection, idx) {
                $selectConnections.append(`<option value="${idx}">${connection.name}</option>`);
            });
            $name.val('Server ' + (app.connections.length + 1));
        }

        $dlg.on('show.bs.modal', function (evt) {
            initDlgValues();
        }).on('hidden.bs.modal', function () {
            reset();
        });

        $selectConnections.change(function () {
            var idx = +($selectConnections.val()); // eslint-disable-line no-extra-parens

            if (idx === -1) {
                $deleteBtn.addClass('hidden');
                $name.val('Server ' + (app.connections.length + 1));
                $server.val('');
                $username.val('');
                $password.val('');
                $connStr.val('');
            } else {
                var conn = app.connections[idx];
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
                $server.val(connBuilder['Data Source']);
                if (!$name.val()) {
                    $name.val(connBuilder['Data Source']);
                }
            }
            if (connBuilder['Password']) {
                $password.val(connBuilder['Password']);
            }
            if (connBuilder['User ID']) {
                $username.val(connBuilder['User ID']);
            }
            if (connectionString) {
                $connStr.val(connectionString);
            }
        });

        $('.name, .server, .username, .password', $dlg).change(function () {
            if ($name.val() &&
                $server.val() &&
                $username.val() &&
                $password.val()) {
                $saveBtn.prop('disabled', false);
            }
        });

        $('input', $dlg).on('keyup', utils.debounce(function () {
            $(this).change();
        }, 500));

        $deleteBtn.click(function () {
            var idx = +($selectConnections.val()); // eslint-disable-line no-extra-parens
            if (idx !== -1) {
                app.connections.splice(idx, 1);
                if (idx === app.opts.selectedConnIdx) {
                    opts.selectedConnIdx = -1;
                    app.emit('connection-selected', app.opts.selectedConnIdx);
                } else if (idx < opts.selectedConnIdx) {
                    app.opts.selectedConnIdx--;
                }
                reset();
                initDlgValues();
                window.localStorage.setItem('connections', JSON.stringify(app.connections));
            }
        });

        $saveBtn.click(function () {
            var idx = +($selectConnections.val());  // eslint-disable-line no-extra-parens
            if (idx === -1) {
                app.connections.push({
                    name: $name.val(),
                    server: $server.val(),
                    username: $username.val(),
                    password: $password.val(),
                    raw: $connStr.val()
                });
                // Sort connections by name
                app.connections.sort(function (a, b) {
                    var keyA = a.name.toLowerCase(),
                        keyB = b.name.toLowerCase();

                    if (keyA < keyB) return -1;
                    if (keyA > keyB) return 1;
                    return 0;
                });

                // Adjust selectedConnIdx
                if (app.currentConnection) {
                    idx = app.connections.indexOf(app.currentConnection);
                    if (idx !== -1) {
                        app.opts.selectedConnIdx = idx;
                    }
                }

                app.emit('connection-added');
                $dlg.modal('hide');
            } else {
                var conn = app.connections[idx];
                if (conn) {
                    conn.name = $name.val();
                    conn.server = $server.val();
                    conn.username = $username.val();
                    conn.password = $password.val();
                    conn.raw = $connStr.val();
                    app.emit('connection-updated', conn, idx);
                }
            }

            window.localStorage.setItem('connections', JSON.stringify(app.connections));
        });
    });
}(window));