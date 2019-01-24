/// <reference path="utils.js" />
/// <reference path="app.js" />
/**
 * Sidebar
 */
(function (app, window, $) {
    var $sidebar = $('.sidebar');
    var $connectionSelect = $('.select-connection', $sidebar);
    var $dbLst = $('.db-lst', $sidebar);
    var $filterInputGrp = $('#db-filter', $sidebar);
    var $filterInput = $('#db-filter-input', $filterInputGrp);
    var $filterClear = $('#db-filter-clear', $filterInputGrp);

    var removeAnimateTimer;

    // Toggle collapse on navbar's sidebar toggle click
    app.on('navbar-sidebar-toggled', function (collapsed) {
        clearTimeout(removeAnimateTimer);

        if (collapsed) {
            $sidebar.addClass('animate-250').addClass('collapsed');
        } else {
            $sidebar.addClass('animate-250').removeClass('collapsed');
        }

        removeAnimateTimer = setTimeout(function () {
            $sidebar.removeClass('animate-250');
        }, 300);
    });

    // Resize sidebar on slider dragger
    app.on('sidebar-slider-dragged', function (left) {
        $sidebar.css('width', left + 'px');
    });


    function renderDbList(dbLst) {
        $dbLst.empty();
        $filterInput.val('');

        if (dbLst) {
            dbLst.forEach(function (db, idx) {
                var $item = $(`<li class="db-lst-item active">
                            <div class="custom-control custom-checkbox">
                                <input type="checkbox" class="custom-control-input" id="${db.name}" ${db.checked ? 'checked' : ''}>
                                <label class="custom-control-label" for="${db.name}">${db.name}</label>
                            </div>
                        </li>`);

                if (db.name === 'master') {
                    // master database always on top
                    $item.prependTo($dbLst);
                } else {
                    $item.appendTo($dbLst);
                }

                $('input', $item).change(function () {
                    db.checked = $(this).is(':checked');
                });
            });

            app.utils.show($filterInputGrp);

            app.emit('db-list-rendered', dbLst);
        } else {
            app.utils.hide($filterInputGrp);
        }
    }

    app.on('toggle-all-databases', function (checked) {
        checked = !!checked;

        $('.db-lst-item input[type="checkbox"]', $dbLst).prop('checked', checked);
        app.state.currentConnection.dbs.forEach(function (db) {
            db.checked = checked;
        });

        app.saveState('connections');
    });

    // Save state on db toggles
    $dbLst.on('change', '.db-lst-item input[type="checkbox"]', app.utils.debounce(function () {
        app.saveState('connections');
    }, 1000));

    systemEvent.on('database-list', function (err, dbs) {
        loading.hide();
        if (err) {
            console.log(err);
            return bsAlert(err.Message, 'Error Listing Databases');
        }
        if (dbs && dbs.length) {
            // Pull out properties
            dbs = dbs.map(function (db) {
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
                return app.utils.compare(a.name, b.name);
            });

            app.state.currentConnection.dbs = dbs;
            app.saveState('connections');

            renderDbList(app.state.currentConnection.dbs);
        }
    });

    app.on('connection-changed', function (current, previous) {
        if (current !== previous) {
            if (current) {
                renderDbList(current.dbs);
            } else {
                renderDbList();
            }
        }
    });

    // Filter db list when entering search text
    $filterInput.on('keydown change input', app.utils.debounce(function () {
        var searchTxt = $filterInput.val().trim().toLowerCase();

        if (searchTxt) {
            $filterInputGrp.addClass('has-search-term');
            $('.db-lst-item', $dbLst).each(function () {
                var $item = $(this);

                if ($('label', $item).text().toLowerCase().indexOf(searchTxt) !== -1) {
                    app.utils.show($item);
                } else {
                    app.utils.hide($item);
                }
            });
        } else {
            $filterInputGrp.removeClass('has-search-term');
            app.utils.show('.db-lst-item', $dbLst);
        }
    }, 200));

    $filterClear.on('click', function () {
        $filterInput.val('').change();
    });

    // Initializations
    if (app.state.currentConnection) renderDbList(app.state.currentConnection.dbs);
}(app, window, window.jQuery));