(function (window) {
    var app = new EventEmitter();
    var connections = [];
    var currentConnection;
    var dbs = [];
    var opts = {
        selectedConnIdx: -1
    };
    var $navbar = $('.navbar');
    var $sidebar = $('.sidebar');
    var $sidebarSlider = $('.sidebar-slider');
    var $content = $('.content');

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    /** Navbar **/
    $(function () {
        var $navbarDrawer = $('#navbar-drawer', $navbar);
        var $navbarToggler = $('.navbar-toggler', $navbar);

        $('li a', $navbarDrawer).click(function () {
            if ($navbarToggler.is(':visible')) {
                $navbarDrawer.collapse('hide');
            }
        });
        $('body').click(function () {
            if ($navbarToggler.is(':visible')) {
                $navbarDrawer.collapse('hide');
            }
        });

        var removeAnimationFn = debounce(function () {
            $sidebar.removeClass('animating');
            $sidebarSlider.removeClass('animating');
            $content.removeClass('animating');
        }, 500);

        $('.sidebar-toggle', $navbar).click(function () {
            var $this = $(this);
            $sidebar.addClass('animating').toggleClass('collapsed');
            $sidebarSlider.addClass('animating').toggleClass('collapsed');
            $content.addClass('animating').toggleClass('full');

            if ($sidebar.hasClass('collapsed')) {
                $('i', $this).removeClass('fa-arrow-circle-left')
                    .addClass('fa-arrow-circle-right');
            } else {
                $('i', $this).removeClass('fa-arrow-circle-right')
                    .addClass('fa-arrow-circle-left');

                removeAnimationFn();
            }
        });
    });

    /** Sidebar **/
    $(function () {

        var $connectionSelect = $('.select-connection', $sidebar);
        var $dbLst = $('.db-lst', $sidebar);

        $connectionSelect.change(function () {
            var selectedConnIdx = +($('.select-connection option:selected').val());

            opts.selectedConnIdx = isNaN(selectedConnIdx) ? -1 : selectedConnIdx;
            currentConnection = connections[opts.selectedConnIdx];

            localStorage.setItem('options', JSON.stringify(opts));

            if (currentConnection) {
                renderDbList(currentConnection.dbs);
            } else {
                $dbLst.empty();
            }
        });


        app.on('connection-added', function () {
            renderConnectionSelect();
        }).on('connection-updated', function () {
            renderConnectionSelect();
        });

        function renderConnectionSelect() {
            $connectionSelect.html('<option value="-1">No Connection</option>');
            connections.forEach(function (c, idx) {
                $('<option value="' + idx + '">' + c.name + '</option>').appendTo($connectionSelect);
            });

            $(`option[value="${opts.selectedConnIdx}"]`, $connectionSelect).prop('selected', true);
            $connectionSelect.val(opts.selectedConnIdx);
        }

        function renderDbList(dbLst) {
            $dbLst.empty();

            if (dbLst) {
                dbLst.forEach(function (db, idx) {
                    if (typeof db.checked !== 'boolean') db.checked = db.name !== 'master';

                    $('input', $(`<li class="db-lst-item active">
                    <input type="checkbox" ${db.checked ? 'checked' : ''}/><span class="db-name">${db.name}</span>
                </li>`).appendTo($dbLst)).change(function () {
                            db.checked = $(this).is(':checked');
                            localStorage.setItem('connections', JSON.stringify(connections));
                        });
                });
            }
        }

        systemEvent.on('database-list', function (err, dbLst) {
            loading.hide();
            if (err) {
                console.log(err);
                return bsAlert('Error Listing Databases', err.message);
            }
            if (dbLst && dbLst.length) {
                currentConnection.dbs = dbLst;
                localStorage.setItem('connections', JSON.stringify(connections));
                renderDbList(currentConnection.dbs);
            }
        });

        if (connections.length) renderConnectionSelect();
        if (currentConnection) renderDbList(currentConnection.dbs);

        /** sidebar toolbar **/
        (function () {
            $('.sidebar-toolbar .refresh-databases-btn').click(function () {
                if (opts.selectedConnIdx === -1) {
                    bsAlert('No connection selected');
                } else {
                    if (currentConnection && currentConnection.raw) {
                        loading.show('Getting Databases...');
                        scriptEvent.emit('get-databases', currentConnection.raw);
                    }
                }
            });
        })();
    });

    /** sidebar slider **/
    $(function () {
        var $dynoStyle = $('<style/>');
        $dynoStyle.appendTo($('head'));

        $sidebarSlider.draggable({
            axis: 'x',
            containment: 'parent',
            drag: function (event, ui) {
                var left = ui.offset.left;  // Current left (position: absolute)
                // Constrain movement
                if (left < 100 || left > 500) return false;

                // Sidebar slider is 10px 2 x (border 2px + padding 3px)
                // Only partially hide it
                $sidebar.css('width', left + 'px');
                $dynoStyle.html(`.sidebar.collapsed {
                    margin-left: -${left + 6}px;
                }
                .sidebar-slider.collapsed {
                    margin-left: -${left + 6}px;
                }`);
                $content.css('margin-left', (left + 6) + 'px');
            }
        });
    });

    /** Content toolbar **/
    $(function () {
        var $toolbar = $('.content-toolbar', $content);

        /** Execute button **/
        var $executeBtn = $('.execute-btn', $toolbar);

        $executeBtn.click(function () {
            var $activePane = $('.code-panes .tab-pane.active', $content);

            if ($activePane.length) {
                var editor = $('.CodeMirror', $activePane)[0].CodeMirror;
                var sql = editor.getSelection();

                if (!sql) sql = editor.getValue();
                sql = (sql || '').trim();

                if (sql && sql.trim() !== '') {
                    if (currentConnection) {
                        var dbs = (currentConnection.dbs || []).filter(d => d.checked);

                        if (dbs.length) {
                            $('.result-subpane', $activePane).empty();
                            $executeBtn.prop('disabled', true);
                            var batchId = $activePane.attr('id');

                            app.emit('execute-sql', batchId);
                            scriptEvent.emit('execute-sql', currentConnection.raw, dbs.map(db => db.name), sql, batchId);
                        }
                    }
                }
            }
        });

        systemEvent.on('sql-execute-begin', function (batchId, db) {
            var $pane = $('#' + batchId);
            var pending = $pane.data('pending-job');
            if (pending) {
                pending++;
            } else {
                pending = 1;
            }

            $pane.data('pending-job', pending);

            if ($('.code-panes .tab-pane.active', $content).attr('id') === batchId) {
                $executeBtn.prop('disabled', true);
            }
        });
        systemEvent.on('sql-execute-result', function (batchId, db, result) {
            var $pane = $('#' + batchId);
            var $resultPane = $('.result-subpane', $pane);

            var $dbTable = $('#' + db, $resultPane);
            if ($dbTable.length === 0) {
                $resultPane.append(`<div id="${db}">${db}</div>`);
                $dbTable = $('#' + db, $resultPane);
            }
            if (result && result.length) {
                var $table = $('<table border="1"><thead></thead><tbody></tbody></table>');
                var keys = Object.keys(result[0]);

                $('thead', $table).append(keys.map(function (k) {
                    return '<th>' + k + '</th>';
                }).join());

                $('tbody', $table).append(result.map(function (row) {
                    return '<tr>' + keys.map(function (k) {
                        return '<td>' + row[k] + '</td>';
                    }).join() + '</tr>';
                }).join());

                $dbTable.append($table);
            }
        });
        systemEvent.on('sql-execute-complete', function (batchId, db) {
            var $pane = $('#' + batchId);
            var pending = $pane.data('pending-job');
            if (pending) {
                pending--;
            } else {
                pending = 0;
            }

            $pane.data('pending-job', pending);

            if (pending === 0 && $('.code-panes .tab-pane.active', $content).attr('id') === batchId) {
                $executeBtn.prop('disabled', false);
            }
        });
    });

    /** Content tabs **/
    $(function () {
        var $codeTabs = $('.code-tabs');
        var $codeTabsContent = $('.code-panes');
        var $plusTab = $('.plus-tab', $codeTabs);

        $plusTab.click(function () {
            newEditor('New *', guid());

        }).click();
    });

    function newEditor(name, id) {
        var $codeTabs = $('.code-tabs');
        var $codeTabsContent = $('.code-panes');
        var $plusTab = $('.plus-tab', $codeTabs);

        var $tab = $(`<li class="nav-item">
                   <a class="nav-link" id="${id}-tab" data-toggle="tab" href="#${id}" role="tab" aria-controls="${id}" aria-selected="false">${name} <i class="fa fa-times" aria-hidden="true"></i></a>
               </li>`);

        var $tabContent = $(`<div class="tab-pane fade" id="${id}" role="tabpanel" aria-labelledby="${id}-tab">
                    <div class="editor-subpane"></div>
                    <div class="result-slider">
                        <div></div>
                    </div>
                    <div class="result-subpane"></div>
                </div>`);

        $('i', $tab).click(function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            // Get adjacent tabs
            var $prev = $tab.prev('.nav-item');
            var $next = $tab.next('.nav-item');

            $tab.tab('dispose');
            $tab.remove();
            $tabContent.remove();

            if ($('a', $tab).hasClass('active')) {
                if ($('.nav-item', $codeTabs).length === 1) {
                    // There's no tabs left. Add a blank tab
                    $plusTab.click();
                } else {
                    // Show the previous tab; or if first tab then show next to the right.
                    if ($prev.length) {
                        $('a', $prev).click();
                    } else {
                        $('a', $next).click();
                    }
                }
            }
        });

        $tab.insertBefore($('.nav-item:last', $codeTabs));
        $tabContent.insertBefore($('.tab-pane:last', $codeTabsContent));

        var mime = 'text/x-sql';
        var theme = 'twilight';

        var editor = CodeMirror($('.editor-subpane', $tabContent)[0], {
            mode: mime,
            indentWithTabs: true,
            smartIndent: true,
            lineNumbers: true,
            matchBrackets: true,
            autofocus: true,
            theme: theme
        });
        $('a', $tab).click();


        /** result slider **/
        (function () {
            var $dynoStyle = $('<style/>');
            $dynoStyle.prependTo($tabContent);
            $resultSlider = $('.result-slider', $tabContent);

            $resultSlider.draggable({
                axis: 'y',
                containment: 'parent',
                drag: function (event, ui) {
                    // Current top (position: absolute)
                    // Includes navbar (56px), toolbar (53.5), tabs (42px) = total (151.5px)
                    var top = Math.floor(ui.offset.top);
                    // Constrain movement (minimium is 150 height for editor subpane)
                    if (top < 300) return false;

                    // Result subpane does not include navbar (top - navbar + slider)

                    // Result slider is 10px 2 x (border 2px + padding 3px)
                    // Only partially hide it
                    $dynoStyle.html(`#${id} .editor-subpane {
                            height: ${top - 151}px;
                        }
                        #${id} .result-subpane {
                            margin-top: ${top - 56 + 9}px;
                        }`);

                    editor.setSize('100%', `${top - 151}px`);
                }
            });
        })();
    }

    /** Connection Information Dialog **/
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
            connections.forEach(function (connection, idx) {
                $selectConnections.append(`<option value="${idx}">${connection.name}</option>`);
            });
            $name.val('Server ' + (connections.length + 1));
        }

        $dlg.on('show.bs.modal', function (evt) {
            initDlgValues();
        }).on('hidden.bs.modal', function () {
            reset();
        });

        $selectConnections.change(function () {
            var idx = +($selectConnections.val());

            if (idx === -1) {
                $deleteBtn.addClass('hidden');
                $name.val('Server ' + (connections.length + 1));
                $server.val('');
                $username.val('');
                $password.val('');
                $connStr.val('');
            } else {
                var conn = connections[idx];
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

        $('.server, .username, .password, .connection-string', $dlg).keyup(debounce(function () {
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

        $('input', $dlg).on('keyup', debounce(function () {
            $(this).change();
        }, 500));

        $deleteBtn.click(function () {
            var idx = +($selectConnections.val());
            if (idx !== -1) {
                connections.splice(idx, 1);
                if (idx === opts.selectedConnIdx) {
                    opts.selectedConnIdx = -1;
                    app.emit('connection-selected', opts.selectedConnIdx);
                } else if (idx < opts.selectedConnIdx) {
                    opts.selectedConnIdx--;
                }
                reset();
                initDlgValues();
                window.localStorage.setItem('connections', JSON.stringify(connections));
            }
        });

        $saveBtn.click(function () {
            var idx = +($selectConnections.val());
            if (idx === -1) {
                connections.push({
                    name: $name.val(),
                    server: $server.val(),
                    username: $username.val(),
                    password: $password.val(),
                    raw: $connStr.val()
                });
                // Sort connections by name
                connections.sort(function (a, b) {
                    var keyA = a.name.toLowerCase(),
                        keyB = b.name.toLowerCase();

                    if (keyA < keyB) return -1;
                    if (keyA > keyB) return 1;
                    return 0;
                });

                // Adjust selectedConnIdx
                if (currentConnection) {
                    idx = connections.indexOf(currentConnection);
                    if (idx !== -1) {
                        opts.selectedConnIdx = idx;
                    }
                }

                app.emit('connection-added');
                $dlg.modal('hide');
            } else {
                var conn = connections[idx];
                if (conn) {
                    conn.name = $name.val();
                    conn.server = $server.val();
                    conn.username = $username.val();
                    conn.password = $password.val();
                    conn.raw = $connStr.val();
                    app.emit('connection-updated', conn, idx);
                }
            }

            window.localStorage.setItem('connections', JSON.stringify(connections));
        });
    });

    // Inits
    (function () {
        var savedData;

        // Get saved connections
        try {
            savedData = window.localStorage.getItem('connections');
            if (savedData) {
                var conns = JSON.parse(savedData);
                if (Array.isArray(conns)) {
                    connections = conns;
                }
            }
        } catch (e) {
            console.error('Failed to load saved connections.');
            console.error(e);
        }

        // Get saved options
        try {
            savedData = localStorage.getItem('options');
            if (savedData) {
                var savedOpts = JSON.parse(savedData);
                if (typeof (savedOpts) === 'object' && savedOpts !== null) {
                    opts = savedOpts;

                    currentConnection = connections[opts.selectedConnIdx];
                }
            }
        } catch (e) {
            console.error('Failed to load saved options.');
            console.error(e);
        }

        // Setup alert dialog
        window.bsDialog = window.bsDialog || (function () {
            var $alertDlg = $('#alert-modal');

            var bsAlert = function (type, msg, title, opts, callback) {
                if (typeof (title) === 'object' || typeof (title) === 'function') {
                    callback = opts;
                    opts = title;
                    title = null;
                }
                if (typeof (opts) === 'function') {
                    callback = opts;
                    opts = {};
                }
                opts = opts || {};
                callback = callback || function () { }

                if (type === 'alert') {
                    opts = Object.assign({
                        cancel: false,
                        ok: 'Ok'
                    }, opts);
                } else if (type === 'confirm') {
                    opts = Object.assign({
                        cancel: 'Cancel',
                        ok: 'Ok',
                        backdrop: 'static',
                        keyboard: false
                    }, opts);
                }

                if (title) {
                    if (opts.isHtml) {
                        $('.modal-header', $alertDlg).empty().removeClass('hidden').html(title);
                    } else {
                        $('.modal-header', $alertDlg).empty().removeClass('hidden').text(title);
                    }
                } else {
                    $('.modal-header', $alertDlg).empty().addClass('hidden');
                }

                if (opts.isHtml) {
                    $('.modal-body', $alertDlg).empty().html(msg);
                } else {
                    $('.modal-body', $alertDlg).empty().text(msg);
                }

                if (opts.cancel === false) {
                    $('.cancel-btn', $alertDlg).addClass('hidden');
                } else {
                    $('.cancel-btn', $alertDlg).empty().removeClass('hidden').text(opts.cancel || 'Cancel').off('click').one('click', function () {
                        $alertDlg.modal('hide');
                        callback(false);
                    });
                }
                if (opts.ok === false) {
                    $('.ok-btn', $alertDlg).addClass('hidden');
                } else {
                    $('.ok-btn', $alertDlg).empty().removeClass('hidden').text(opts.ok || 'Ok').focus().off('click').one('click', function () {
                        $alertDlg.modal('hide');
                        callback(true);
                    });
                }

                $alertDlg.modal({
                    backdrop: opts.backdrop === false ? false : opts.backdrop || true,
                    keyboard: typeof (opts.keyboard) === 'boolean' ? opts.keyboard : true
                }).modal('show');
            };

            return bsAlert;
        })();

        window.bsAlert = window.bsAlert || window.bsDialog.bind(this, 'alert');

        window.bsConfirm = window.bsConfirm || window.bsDialog.bind(this, 'confirm');

        // Setup loading div
        window.loading = (function () {
            $container = $('.loader-container');
            $spinner = $('.loader', $container);
            $msg = $('.msg', $container);

            return {
                show: function (opts) {
                    if (typeof (opts) === 'string') {
                        opts = {
                            msg: opts
                        };
                    }
                    opts = opts || {};

                    if (opts.msg) {
                        $msg.text(opts.msg);
                    } else {
                        $msg.empty();
                    }

                    $container.show();
                },
                hide: function (opts) {
                    $container.hide();
                }
            }
        })();
    })();
}(window));