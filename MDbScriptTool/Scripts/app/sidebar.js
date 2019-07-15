/// <reference path="app.js" />
/**
 * Sidebar
 */
(function (app, window, $) {
    var $sidebar = $('.sidebar');
    var $connectionSelect = $('.select-connection', $sidebar);
    var $dbLst = $('.db-lst', $sidebar);
    var $additionalCtrls = $('#additional-ctrls', $sidebar);
    var $filterInputGrp = $('#db-list-filter', $additionalCtrls);
    var $filterInput = $('#db-list-filter-input', $filterInputGrp);
    var $filterClear = $('#db-list-filter-clear', $filterInputGrp);
    var $showToggles = $('.link-btn', $additionalCtrls);
    var $statusbar = $('#sidebar-statusbar', $sidebar);
    var $statusText = $('.status-text', $statusbar);

    var removeAnimateTimer;

    // Toggle collapse on navbar's sidebar toggle click
    app.on('sidebar-collapse-toggled', function (collapsed) {
        clearTimeout(removeAnimateTimer);

        if (collapsed) {
            $sidebar.addClass('animate-250 collapsed');
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

    $showToggles.on('click', function (e) {
        e.preventDefault();

        var $this = $(this);
        $showToggles.removeClass('active');
        $this.addClass('active');

        if ($this.hasClass('show-selected')) {
            $dbLst.removeClass('show-unselected').addClass('show-selected');
        } else if ($this.hasClass('show-unselected')) {
            $dbLst.removeClass('show-selected').addClass('show-unselected');
        } else {
            $dbLst.removeClass('show-unselected show-selected');
        }
    });

    var updateStatusText = app.debounce(function () {
        if (app.state.currentConnection && app.state.currentConnection.dbs) {
            var matchedTxt = '';
            var visible;
            var total = app.state.currentConnection.dbs.length;
            var selected = app.state.currentConnection.dbs.filter(function (d) { return d.checked; }).length;

            if ($filterInput.val()) {
                visible = $('.db-lst-item input[type="checkbox"]:visible', $dbLst).length;
                matchedTxt = `Matched <strong>${visible}</strong> - `;
            } else {
                visible = total;
            }

            $statusText.html(`${matchedTxt}Selected <strong>${selected}</strong>/<strong>${total}</strong>`);

            app.emit('db-list-selection-changed', total, selected, visible || total);
        }
    }, 200);

    function renderDbList(dbLst) {
        $dbLst.empty();
        // Reset filter input
        $filterInput.val('').change();
        // Reset show toggles to All
        $showToggles.removeClass('active');
        $showToggles.filter('.show-all').addClass('active');
        $dbLst.removeClass('show-unselected show-selected');

        if (dbLst) {
            dbLst.forEach(function (db, idx) {
                var $item = $(`<li class="db-lst-item ${db.checked ? 'active' : ''}">
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
                    var $this = $(this);
                    $this.closest('.db-lst-item').toggleClass('active', db.checked = $this.is(':checked'));
                });

                $item.data('app-db', db);
            });

            app.show($additionalCtrls);
            updateStatusText();
            app.emit('db-list-rendered', dbLst);
        } else {
            app.hide($additionalCtrls);
        }
    }

    app.on('toggle-all-databases', function (checked) {
        checked = !!checked;

        $('.db-lst-item input[type="checkbox"]', $dbLst).prop('checked', checked).change();
    });

    // Update selected db text
    $dbLst.on('change', '.db-lst-item input[type="checkbox"]', updateStatusText);

    // Save state on db toggles
    $dbLst.on('change', '.db-lst-item input[type="checkbox"]', app.debounce(function () {
        app.saveState('connections');
    }, 1000));

    app.on('sort-db-list', function (asc) {
        asc = asc ? 1 : -1;
        var dbs = $('.db-lst-item', $dbLst).filter(function () {
            return $('label', $(this)).text() !== 'master';
        }).get().sort(function (a, b) {
            return app.compare($('label', a).text(), $('label', b).text()) * asc;
        });

        $.each(dbs, function (idx, db) {
            $dbLst.append(db);
        });
    });

    os.on('database-list', function (err, dbs) {
        app.loading.hide();
        if (err) {
            console.log(err);
            return app.alert(err.Message, 'Error Listing Databases');
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
                return app.compare(a.name, b.name);
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
    $filterInput.on('keydown change input', app.debounce(function () {
        var searchTxt = $filterInput.val().trim().toLowerCase();

        if (searchTxt) {
            $filterInputGrp.addClass('has-search-term');
            $('.db-lst-item', $dbLst).each(function () {
                var $item = $(this);

                if ($('label', $item).text().toLowerCase().indexOf(searchTxt) !== -1) {
                    app.show($item);
                } else {
                    app.hide($item);
                }
            });
        } else {
            $filterInputGrp.removeClass('has-search-term');
            app.show('.db-lst-item', $dbLst);
        }
        updateStatusText();
    }, 200));

    $filterClear.on('click', function () {
        $filterInput.val('').change();
    });

    app.on('update-sidebar-status', function (html) {
        $statusText.html(html);
    });

    function runQuery(sql, db) {
        if (sql) {
            sql = '-- Database: ' + db.name + '\r\n' + sql + '\r\n';
            app.once('instance-created', function ($inst) {
                app.emit('execute-instance', $inst, [db.name]);
            });
            app.newInstance({
                code: sql
            });
        }
    }

    $.contextMenu.types.filter = function (item, opts, root) {
        // this === item.$node
        var $this = this;

        function runFilteredQuery(val) {
            // do some funky stuff
            if (root.$trigger && root.$trigger[0]) {
                var db = $(root.$trigger[0]).data('app-db');

                if (db && item.sql) {
                    runQuery(item.sql.replace('{0}', val), db);
                }
            }
        }
        
        var $filter = $(`<div class="input-group input-group-sm">
            <input type="text" class="form-control" placeholder="Filter" aria-label="Filter" aria-describedby="run-query-filter">
            <div class="input-group-append">
                <button class="btn btn-outline-secondary" type="button" id="run-query-filter"><i class="fa fa-angle-double-right" aria-hidden="true"></i></button>
            </div>
        </div>`);

        $filter.appendTo(this)
            .on('click', 'button', function () {
                runFilteredQuery($('input', $filter).val());
                root.$menu.trigger('contextmenu:hide');
            });

        $this.addClass('custom-filter fa fa-filter')
            .on('mouseup.contextMenu', function (e) {
                // Ignore click events on this submenu
                e.stopImmediatePropagation();
            })
            .on('contextmenu:focus', function (e) {
                // setup some awesome stuff
            }).on('contextmenu:blur', function (e) {
                // tear down whatever you did
            }).on('keydown', function (e) {
                if (e.keyCode === 13) {
                    runFilteredQuery($('input', $filter).val());
                    root.$menu.trigger('contextmenu:hide');
                }
            });
    };

    $.contextMenu({
        selector: '.sidebar .db-lst .db-lst-item',
        callback: function (key, opts, e) {
            if (key === 'copy') {
                app.copyToClipboard($(this).text().trim());
            } else {
                var db = $(this).data('app-db');
                if (db && opts.commands && opts.commands[key] && opts.commands[key].sql) {
                    runQuery(opts.commands[key].sql, db);
                }
            }
        },
        zIndex: function ($trigger, opt) {
            return 500;
        },
        selectableSubMenu: true,
        items: {
            copy: { name: 'Copy', icon: 'fa-copy', accesskey: 'c' },
            sep1: '---------',
            tables: {
                name: 'Tables',
                icon: 'fa-table',
                accesskey: 't',
                items: {
                    'tables-all': {
                        name: 'All',
                        icon: 'fa-globe',
                        sql: 'SELECT * FROM sys.tables'
                    },
                    'tables-filter': {
                        type: 'filter',
                        sql: "SELECT * FROM sys.tables WHERE [name] LIKE '%{0}%'"
                    }
                }
            },
            procedures: {
                name: 'Stored Procedures',
                icon: 'fa-code',
                accesskey: 's',
                items: {
                    'procedures-all': {
                        name: 'All',
                        icon: 'fa-globe',
                        sql: 'SELECT * FROM sys.procedures'
                    },
                    'procedures-filter': {
                        type: 'filter',
                        sql: "SELECT * FROM sys.procedures WHERE [name] LIKE '%{0}%'"
                    }
                }
            },
            functions: {
                name: 'Functions',
                icon: 'fa-flash',
                accesskey: 'f',
                items: {
                    'functions-all': {
                        name: 'All',
                        icon: 'fa-globe',
                        sql: "SELECT * FROM sys.all_objects WHERE type IN ('FN','AF','FS','FT','IF','TF')"
                    },
                    'functions-filter': {
                        type: 'filter',
                        sql: "SELECT * FROM sys.all_objects WHERE type IN ('FN','AF','FS','FT','IF','TF') AND [name] LIKE '%{0}%'"
                    }
                }
            }
        }
    });

    // Initializations
    if (app.state.currentConnection) renderDbList(app.state.currentConnection.dbs);
}(app, window, window.jQuery));
