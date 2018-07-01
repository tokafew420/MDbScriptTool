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
            app.currentConnection = connections[app.opts.selectedConnIdx];

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

                dbLst.forEach(function (db, idx) {
                    if (typeof db.checked !== 'boolean') db.checked = db.name !== 'master';

                    $('input', $(`<li class="db-lst-item active">
                    <input type="checkbox" ${db.checked ? 'checked' : ''}/><span class="db-name">${db.name}</span>
                </li>`).appendTo($dbLst)).change(function () {
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

        /** sidebar toolbar **/
        (function () {
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
        })();
    });

}(window));