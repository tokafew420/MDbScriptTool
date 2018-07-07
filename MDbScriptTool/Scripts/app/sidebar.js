/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Sidebar
 */
(function (window) {
    var $sidebar = $('.sidebar');
    var $connectionSelect = $('.select-connection', $sidebar);
    var $dbLst = $('.db-lst', $sidebar);

    $(function () {
        // Toggle collapse on navbar's sidebar toggle click
        app.on('navbar-sidebar-toggled', function (sidebarCollapsed) {
            $sidebar.addClass('animating').toggleClass('collapsed');

            if (!sidebarCollapsed) {
                $sidebar.removeClass('animating');
            }
        });

        // Resize sidebar on slider dragger
        app.on('sidebar-slider-dragged', function (left) {
            $sidebar.css('width', left + 'px');
        });

        // Set the connection select to the specified value
        function setConnectionSelect(val) {
            $connectionSelect.val(val);
            $('option', $connectionSelect).prop('selected', false);
            if (typeof val !== 'undefined' && val !== null) {
                $(`option[value="${val}"]`, $connectionSelect).prop('selected', true);
            }
        }

        // Set the connection select to "select" and clear the db list
        function resetConnectionSelect() {
            app.setCurrentConnection(null);
            setConnectionSelect('select');
            $dbLst.empty();
        }

        // Handle connection selection
        $connectionSelect.change(function () {
            var selectedConnId = $('.select-connection option:selected').val();

            // Clear db list
            if (selectedConnId === 'select') return resetConnectionSelect();

            // Open connection dialog
            if (selectedConnId === 'new') {
                if (app.state.currentConnectionId) {
                    // Go back to previously selected connection
                    setConnectionSelect(app.state.currentConnectionId);
                } else {
                    setConnectionSelect('select');
                }
                app.emit('open-connection-info-modal');
            } else {
                // List databases
                var conn = app.getConnection(selectedConnId);
                if (conn) {
                    app.setCurrentConnection(conn);
                    renderDbList(app.currentConnection.dbs);
                } else {
                    resetConnectionSelect();
                }
            }
        });

        app.on(['connection-added', 'connection-updated', 'connection-removed'], function () {
            renderConnectionSelect();
        });

        function renderConnectionSelect() {
            var selectedVal = $('option:selected', $connectionSelect).text;
            $connectionSelect.html('<option value="select">Select Connection</option><option value="new">New...</option>');

            app.connections.forEach(function (c) {
                $('<option value="' + c.id + '">' + c.name + '</option>').appendTo($connectionSelect);
            });

            if (app.currentConnection) {
                setConnectionSelect(app.currentConnection.id);
            } else {
                resetConnectionSelect();
            }
        }

        function renderDbList(dbLst) {
            $dbLst.empty();

            if (dbLst) {
                dbLst.forEach(function (db, idx) {
                    var $item = $(`<li class="db-lst-item active">
                            <input type="checkbox" ${db.checked ? 'checked' : ''}/><span class="db-name">${db.name}</span>
                        </li>`);

                    if (db.name === 'master') {
                        // master database always on top
                        $item.prependTo($dbLst);
                    } else {
                        $item.appendTo($dbLst);
                    }

                    $('input', $item).change(function () {
                        db.checked = $(this).is(':checked');
                        localStorage.setItem('connections', JSON.stringify(app.connections));
                    });
                });
            }
        }

        if (app.connections.length) renderConnectionSelect();
        if (app.currentConnection) renderDbList(app.currentConnection.dbs);

        function selectAll() {
            $('.db-lst-item input[type="checkbox"]', $dbLst).prop('checked', true);
            app.currentConnection.dbs.forEach(function (db) {
                db.checked = true;
            });

            localStorage.setItem('connections', JSON.stringify(app.connections));
        }

        function unselectAll() {
            $('.db-lst-item input[type="checkbox"]', $dbLst).prop('checked', false);
            app.currentConnection.dbs.forEach(function (db) {
                db.checked = false;
            });

            localStorage.setItem('connections', JSON.stringify(app.connections));
        }


        /** sidebar toolbar **/
        (function () {
            // Refresh database list
            $('.sidebar-toolbar .refresh-databases-btn').click(function () {
                if (app.currentConnection) {
                    if (app.currentConnection.raw) {
                        loading.show('Getting Databases...');
                        scriptEvent.emit('list-databases', app.currentConnection.raw);
                    }
                } else {
                    bsAlert('No connection selected');
                }
            });

            systemEvent.on('database-list', function (err, dbLst) {
                loading.hide();
                if (err) {
                    console.log(err);
                    return bsAlert('Error Listing Databases', err.message);
                }
                if (dbLst && dbLst.length) {
                    // Pull out properties
                    dbLst = dbLst.map(function (db) {
                        return {
                            name: db.name,
                            create_date: db.create_date,
                            compatibility_level: db.compatibility_level,
                            is_read_only: db.is_read_only,
                            state: db.state,    // 0 = ONLINE
                            recovery_model: db.recovery_model,   // 1 = FULL
                            is_encrypted: db.is_encrypted,
                            // Don't check master by default
                            checked: db.name !== 'master'
                        };
                    }).sort(function (a, b) {
                        // Sort by database name, case insensitive and accounting for numerics
                        return app.comparer(a.name, b.name);
                    });

                    app.currentConnection.dbs = dbLst;
                    localStorage.setItem('connections', JSON.stringify(app.connections));
                    renderDbList(app.currentConnection.dbs);
                }
            });

            // Select all databases
            $('.sidebar-toolbar .check-all-databases-btn').click(function () {
                selectAll();
            });

            // Unselect all databases
            $('.sidebar-toolbar .uncheck-all-databases-btn').click(function () {
                unselectAll();
            });
        })();
    });

}(window));