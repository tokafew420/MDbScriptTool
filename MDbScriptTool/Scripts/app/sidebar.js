/// <reference path="app.js" />
/**
 * Sidebar
 */
(function (window, app, os, $) {
    var $sidebar = $('.sidebar');
    var $connectionSelect = $('.select-connection', $sidebar);
    var $dbLst = $('.db-lst', $sidebar);
    var $additionalCtrls = $('#additional-ctrls', $sidebar);
    var $filterInputGrp = $('#db-list-filter', $additionalCtrls);
    var $filterInput = $('#db-list-filter-input', $filterInputGrp);
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
        if (app.connection && app.connection.dbs) {
            var matchedTxt = '';
            var visible;
            var total = app.connection.dbs.length;
            var selected = app.connection.dbs.filter(function (d) { return d.checked; }).length;

            if (app.instance.connection.search) {
                visible = $('.db-lst-item input[type="checkbox"]:visible', $dbLst).length;
                matchedTxt = `Matched <strong>${visible}</strong> - `;
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
                                <input type="checkbox" class="custom-control-input" id="${db.id}" ${db.checked ? 'checked' : ''}>
                                <label class="custom-control-label" for="${db.id}">${db.label || db.name}</label>
                            </div>
                        </li>`);

                if (db.name === 'master') {
                    // master database always on top
                    $item.prependTo($dbLst);
                } else {
                    $item.appendTo($dbLst);
                }

                $item.data('db', db);
            });

            app.show($additionalCtrls);
            updateStatusText();
            app.emit('db-list-rendered', dbLst);
        } else {
            app.hide($additionalCtrls);
        }
    }

    /**
     * Refresh the database list labels.
     **/
    app.refreshDbLabels = function () {
        if (app.connection && app.connection.dbs) {
            app.connection.dbs.forEach(function (db) {
                $('.db-lst-item label[for="' + db.id + '"]').text(db.label || db.name);
            });
        }
    };

    app.on('toggle-databases', function (mode, checked) {
        checked = !!checked;
        if (mode === 'all') {
            // [Un]Toggle all databases
            $('.db-lst-item input[type="checkbox"]', $dbLst).prop('checked', checked).change();
        } else if (mode === 'inverse') {
            // Do inverse selection
            $('.db-lst-item input[type="checkbox"]', $dbLst).each(function () {
                var $this = $(this);
                $this.prop('checked', !$this.prop('checked'));
            }).change();
        } else if (Array.isArray(mode)) {
            // Toggle by database name
            $('.db-lst-item input[type="checkbox"]', $dbLst).each(function () {
                var $this = $(this);
                var $item = $this.closest('.db-lst-item');
                var db = $item.data('db');

                if (db && mode.indexOf(db.name) !== -1) {
                    $this.prop('checked', checked);
                }
            }).change();
        }
    });

    // Set checked state
    $dbLst.on('change', '.db-lst-item input[type="checkbox"]', function () {
        var $this = $(this);
        var checked = $this.is(':checked');
        var $item = $this.closest('.db-lst-item');
        var db = $item.data('db');

        db.checked = checked;
        $item.toggleClass('active', checked);

        var instDb = app.findBy(app.instance.connection.dbs, 'name', db.name) || {};
        instDb.checked = checked;

        // Update selected db text
        updateStatusText();
    }).on('change', '.db-lst-item input[type="checkbox"]', app.debounce(function () {
        app.saveState('instances');
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

    app.on('connection-dbs-fetched', function (connection, err, dbs) {
        if (!err && connection && connection.dbs) {
            renderDbList(connection.dbs);
        }
    });

    app.on('connection-switched', function (current, previous) {
        renderDbList(current && current.dbs);
        if (app.instance && app.instance.connection) {
            $filterInput.val(app.instance.connection.search || '').change();
        }
    });

    // Filter db list when entering search text
    $filterInput.on('keydown change input', app.debounce(function () {
        var searchTxt = $filterInput.val().trim().toLowerCase();

        if (searchTxt) {
            $('.db-lst-item', $dbLst).each(function () {
                var $item = $(this);

                if ($('label', $item).text().toLowerCase().indexOf(searchTxt) !== -1) {
                    app.show($item);
                } else {
                    app.hide($item);
                }
            });
        } else {
            app.show('.db-lst-item', $dbLst);
        }
        if (app.instance && app.instance.connection) {
            app.instance.connection.search = searchTxt;
        }
        updateStatusText();
    }, 200));

    app.on('update-sidebar-status', function (html) {
        $statusText.html(html);
    });

    function runQuery(sql, db) {
        if (sql) {
            sql = '-- Database: ' + (db.label || db.name) + '\r\n' + sql + '\r\n';
            app.once('instance-created', function (inst) {
                app.switchInstance(inst);
            }).once('instance-switched', function (inst) {
                $('.db-lst-item input[type="checkbox"]', $dbLst).prop('checked', false).change();
                $('#' + db.id, $dbLst).prop('checked', true).change();
                setTimeout(function () {
                    app.executeSql();
                }, 100);
            });
            app.createInstance({
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
                var db = $(root.$trigger[0]).data('db');

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
                var db = $(this).data('db');
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
            views: {
                name: 'Views',
                icon: 'fa-th',
                accesskey: 'v',
                items: {
                    'views-all': {
                        name: 'All',
                        icon: 'fa-globe',
                        sql: 'SELECT * FROM sys.views'
                    },
                    'views-filter': {
                        type: 'filter',
                        sql: "SELECT * FROM sys.views WHERE [name] LIKE '%{0}%'"
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

    // Key maps
    app.mapKeys($sidebar, 'Ctrl-A', function (e) {
        e.preventDefault(); // Prevent select all

        app.emit('toggle-databases', true);
    }).mapKeys($sidebar, 'Shift-Ctrl-A', function (e) {
        app.emit('toggle-databases', false);
    }).mapKeys($sidebar, 'Ctrl-N', function () {
        $('.sidebar-toolbar .new-connection-btn', $sidebar).click();
    }).mapKeys($sidebar, 'Ctrl-O', function () {
        $('.content .content-toolbar .open-file-btn').click();
    }).mapKeys($sidebar, 'Ctrl-Q', function () {
        if (app.instance && app.instance.$tab) {
            $('i.fa-times', app.instance.$tab).click();
        }
    }).mapKeys($sidebar, 'Ctrl-R', function () {
        $('.refresh-databases-btn', $sidebar).click();
    }).mapKeys($sidebar, 'Ctrl-S', function () {
        $('.content .content-toolbar .save-file-btn').click();
    }).mapKeys($sidebar, 'Shift-Ctrl-S', function () {
        $('.content .content-toolbar .save-as-file-btn').click();
    }).mapKeys($sidebar, 'Ctrl-X', function () {
        $('.sidebar-toolbar .edit-connection-btn', $sidebar).click();
    });

    // Initializations
    if (app.connection) renderDbList(app.connection.dbs);
}(window, window.app = window.app || {}, window.os, jQuery));
