/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Sidebar
 */
(function (window) {
    var $sidebar = $('.sidebar');

    $(function () {

        var $connectionSelect = $('.select-connection', $sidebar);
        var $dbLst = $('.db-lst', $sidebar);

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

        $connectionSelect.change(function () {
            var selectedConnIdx = +($('.select-connection option:selected').val()); // eslint-disable-line no-extra-parens

            app.opts.selectedConnIdx = isNaN(selectedConnIdx) ? -1 : selectedConnIdx;
            app.currentConnection = app.connections[app.opts.selectedConnIdx];

            localStorage.setItem('options', JSON.stringify(app.opts));

            if (app.currentConnection) {
                renderDbList(app.currentConnection.dbs);
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
            app.connections.forEach(function (c, idx) {
                $('<option value="' + idx + '">' + c.name + '</option>').appendTo($connectionSelect);
            });

            $(`option[value="${app.opts.selectedConnIdx}"]`, $connectionSelect).prop('selected', true);
            $connectionSelect.val(app.opts.selectedConnIdx);
        }

        function renderDbList(dbLst) {
            $dbLst.empty();

            if (dbLst) {
                var comparer = new Intl.Collator('en', {
                    sensitivity: 'base',
                    numeric: true
                }).compare;

                // Sort by database name, case insensitive and accounting for numerics
                dbLst.sort(function (a, b) {
                    return comparer(a.name, b.name);
                });

                dbLst.forEach(function (db, idx) {
                    if (typeof db.checked !== 'boolean') db.checked = db.name !== 'master';

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

        systemEvent.on('database-list', function (err, dbLst) {
            loading.hide();
            if (err) {
                console.log(err);
                return bsAlert('Error Listing Databases', err.message);
            }
            if (dbLst && dbLst.length) {
                app.currentConnection.dbs = dbLst;
                localStorage.setItem('connections', JSON.stringify(app.connections));
                renderDbList(app.currentConnection.dbs);
            }
        });

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
                if (app.opts.selectedConnIdx === -1) {
                    bsAlert('No connection selected');
                } else {
                    if (app.currentConnection && app.currentConnection.raw) {
                        loading.show('Getting Databases...');
                        scriptEvent.emit('get-databases', app.currentConnection.raw);
                    }
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