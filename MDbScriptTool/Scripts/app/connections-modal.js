/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Connection Information Dialog 
 */
(function (window) {
    var serverRegex = new RegExp('(?:Data Source|Server)=[^;]*;', 'i');
    var usernameRegex = new RegExp('User ID=[^;]*;', 'i');
    var passwordRegex = new RegExp('Password=[^;]*;', 'i');

    $(function () {
        var $dlg = $('#connections-modal');
        var $selectConnections = $('.select-connections', $dlg);
        var $name = $('.name', $dlg);
        var $server = $('.server', $dlg);
        var $username = $('.username', $dlg);
        var $password = $('.password', $dlg);
        var $connStr = $('.connection-string', $dlg);
        var $advancedContainer = $('#advanced-container', $dlg);
        var $deleteBtn = $('.delete-btn', $dlg);
        var $addBtn = $('.add-btn', $dlg);

        // Reset connections select
        function resetSelect() {
            $('option:not([value="new"])', $selectConnections).remove();
            $('option[value="new"]', $selectConnections).prop('selected', true);
        }

        // Initialize connections select
        function initSelect() {
            app.connections.forEach(function (conn) {
                $selectConnections.append(`<option value="${conn.id}">${conn.name}</option>`);
            });
        }

        // Reset feilds
        function resetFields() {
            $('input', $dlg).val('').removeClass('is-valid').removeClass('is-invalid');
            $advancedContainer.collapse('hide');
        }

        // Reset buttons
        function resetBtns() {
            $deleteBtn.addClass('hidden');
            $addBtn.text('Add');
        }

        // Reset dialog
        function reset() {
            resetFields();
            resetSelect();
            initSelect();
            resetBtns();
        }

        $dlg.on('show.bs.modal', function (evt) {
            reset();
        }).on('hidden.bs.modal', function () {
            reset();
        });

        app.on('open-connections-modal', function () {
            $dlg.modal('show');
        });

        $selectConnections.change(function () {
            var id = $selectConnections.val();

            if (id === 'new') {
                reset();
            } else {
                var conn = app.getConnection(id);
                if (conn) {
                    resetFields();
                    $deleteBtn.removeClass('hidden');
                    $name.val(conn.name);
                    $server.val(conn.server);
                    $username.val(conn.username);
                    $password.val(conn.password);
                    $connStr.val(conn.raw);

                    $addBtn.text('Save');
                }
            }
        });

        $name.on('keydown change', utils.debounce(function () {
            if ($name[0].checkValidity()) {
                $name.removeClass('is-invalid').addClass('is-valid');
            } else {
                $name.removeClass('is-valid').addClass('is-invalid');
            }
        }, 200));

        $server.on('keydown change', utils.debounce(function () {
            var server = $server.val();
            var connStr = $connStr.val();

            if (serverRegex.test(connStr)) {
                $connStr.val(connStr.replace(serverRegex, 'Data Source=' + server + ";"));
            } else {
                $connStr.val(`Data Source=${server};${connStr}`);
            }

            if ($server[0].checkValidity()) {
                $server.removeClass('is-invalid').addClass('is-valid');
            } else {
                $server.removeClass('is-valid').addClass('is-invalid');
            }
        }, 100));

        $username.on('keydown change', utils.debounce(function () {
            var username = $username.val();
            var connStr = $connStr.val();

            if (usernameRegex.test(connStr)) {
                $connStr.val(connStr.replace(usernameRegex, 'User ID=' + username + ";"));
            } else {
                $connStr.val(`User ID=${username};${connStr}`);
            }

            if ($username[0].checkValidity()) {
                $username.removeClass('is-invalid').addClass('is-valid');
            } else {
                $username.removeClass('is-valid').addClass('is-invalid');
            }
        }, 100));

        $password.on('keydown change', utils.debounce(function () {
            var password = $password.val();
            var connStr = $connStr.val();

            if (passwordRegex.test(connStr)) {
                $connStr.val(connStr.replace(passwordRegex, 'Password=' + password + ";"));
            } else {
                $connStr.val(`Password=${password};${connStr}`);
            }

            if ($password[0].checkValidity()) {
                $password.removeClass('is-invalid').addClass('is-valid');
            } else {
                $password.removeClass('is-valid').addClass('is-invalid');
            }
        }, 100));

        $connStr.on('keydown change', utils.debounce(function () {
            var connStr = $connStr.val();

            if (connStr) {
                scriptEvent.emit('parse-connection-string', connStr);
            }
        }, 100));

        systemEvent.on('connection-string-parsed', function (err, connectionString, connBuilder) {
            if (err) {
                $connStr.addClass('is-invalid');
                return console.log(err);
            } else {
                $connStr.removeClass('is-invalid');
            }

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
        });

        $deleteBtn.click(function () {
            var id = $selectConnections.val();
            if (id !== 'new') {
                app.removeConnection(id);
                reset();
            }
        });

        var _tmpConn = null;
        var _hideAfterSave = false;

        $addBtn.click(function () {
            // Verify fields
            $('input', $dlg).not('.connection-string').each(function () {
                var $this = $(this);

                if ($this[0].checkValidity()) {
                    $this.removeClass('is-invalid').addClass('is-valid');
                } else {
                    $this.removeClass('is-valid').addClass('is-invalid');
                }
            });

            // Encrypt password before saving
            if ($('input.is-invalid', $dlg).length === 0) {
                var id = $selectConnections.val();

                if (id === 'new') {
                    loading.show('Adding...');
                    _hideAfterSave = true;
                    _tmpConn = {
                        id: utils.guid(),
                        name: $name.val(),
                        server: $server.val(),
                        username: $username.val(),
                        password: $password.val(),
                        raw: $connStr.val()
                    };

                    scriptEvent.emit('encrypt-password', $password.val());

                } else {
                    var conn = app.getConnection(id);
                    if (conn) {
                        loading.show('Saving...');
                        _hideAfterSave = false;

                        conn.name = $name.val();
                        conn.server = $server.val();
                        conn.username = $username.val();
                        conn.password = $password.val();
                        conn.raw = $connStr.val();

                        _tmpConn = conn;

                        scriptEvent.emit('encrypt-password', $password.val());
                    }
                }
            } else {
                // Focus on first invalid field
                $('input.is-invalid:first', $dlg).focus();
            }
        });

        systemEvent.on('password-encrypted', function (cipher) {
            _tmpConn.password = cipher;
            $password.val(cipher).change();
            app.saveConnection(_tmpConn);

            if (_hideAfterSave) {
                $dlg.modal('hide');
            }

            _tmpConn = null;
            _hideAfterSave = false;
            loading.hide();
        });
    });
}(window));