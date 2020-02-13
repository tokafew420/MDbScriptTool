/// <reference path="app.js" />

/**
 * Sidebar toolbar
 */
(function (window, app, os, $) {
    var sidebarToolbar = app.sidebarToolbar = app.sidebarToolbar || {};

    var $sidebar = $('.sidebar');
    var $toolbar = $('.sidebar-toolbar', $sidebar);
    var $connectionSelect = $('.select-connection', $sidebar);
    // Connection buttons
    var $newConnectionBtn = $('.new-connection-btn', $toolbar);
    var $editConnectionBtn = $('.edit-connection-btn', $toolbar);
    var $refreshDbsBtn = $('.refresh-databases-btn', $toolbar);
    // Db list buttons
    var $toggleAllDbBtn = $('.toggle-all-db-btn', $toolbar);
    var totalDbs = 0;
    var selectedDbs = 0;

    $newConnectionBtn.on('click', function () {
        app.emit('open-connections-modal');
    });

    $editConnectionBtn.on('click', function () {
        if (app.connection) {
            app.emit('open-connections-modal', app.connection);
        }
    });

    // Refresh database list
    $refreshDbsBtn.on('click', function () {
        if (app.connection) {
            app.refreshDbs();
        } else {
            app.alert('No connection selected', 'Oops!');
        }
    });

    function _setToggleAllDbBtnState(allChecked) {
        if (allChecked) {
            $toggleAllDbBtn.attr('data-original-title', 'Uncheck all databases (Shift-Ctrl-A)');
            $('i', $toggleAllDbBtn).removeClass('fa-check-square-o').addClass('fa-square-o');
        } else {
            $toggleAllDbBtn.attr('data-original-title', 'Check all databases (Ctrl-A)');
            $('i', $toggleAllDbBtn).removeClass('fa-square-o').addClass('fa-check-square-o');
        }
    }

    // Toggle all databases selection
    $toggleAllDbBtn.on('mousedown', function (evt) {
        var $this = $(this);
        var $i = $('i', $this);

        if (evt.which === 1) {
            // Left click
            if ($i.hasClass('fa-check-square-o')) {
                app.emit('toggle-databases', 'all', true);
                _setToggleAllDbBtnState(true);
            } else {
                app.emit('toggle-databases', 'all', false);
                _setToggleAllDbBtnState(false);
            }
        }
    });

    // Reset select all icon. Only "unselect all" when all dbs are selected.
    app.on('db-list-selection-changed', function (total, selected, visible) {
        totalDbs = total;
        selectedDbs = selected;

        _setToggleAllDbBtnState(total === selected);
    });

    // Sort database list
    $('.sort-db-list-btn', $toolbar).on('click', function () {
        var $this = $(this);
        var $i = $('i', $this);

        if ($i.hasClass('fa-sort-alpha-asc')) {
            app.emit('sort-db-list', false);
            $this.attr('data-original-title', 'Sort databases DESC').tooltip('show');
            $i.removeClass('fa-sort-alpha-asc').addClass('fa-sort-alpha-desc');
        } else {
            app.emit('sort-db-list', true);
            $this.attr('data-original-title', 'Sort databases ASC').tooltip('show');
            $i.removeClass('fa-sort-alpha-desc').addClass('fa-sort-alpha-asc');
        }
    });

    // Reset to sort asc icon
    app.on('db-list-rendered', function (dbLst) {
        $('.sort-db-list-btn', $toolbar).attr('data-original-title', 'Sort databases ASC');
        $('.sort-db-list-btn i', $toolbar).removeClass('fa-sort-alpha-desc').addClass('fa-sort-alpha-asc');
    });

    // Set the connection select to "select" and clear the db list
    function resetConnectionSelect(isTrusted) {
        if (isTrusted) {
            // Only switch if it's a user generated event
            app.switchConnection(null);
        }
        $editConnectionBtn.prop('disabled', true);
        $refreshDbsBtn.prop('disabled', true);
        $connectionSelect.val('');
        app.emit('update-sidebar-status', '');
    }

    // Handle connection selection
    $connectionSelect.on('change', function (e) {
        // isTrusted === true when the change event was caused by user select
        var isTrusted = e.originalEvent && e.originalEvent.isTrusted;
        var selectedConnId = $('option:selected', $connectionSelect).val();

        // Clear db list
        if (selectedConnId === '') return resetConnectionSelect(isTrusted);

        // List databases
        var conn = app.findBy(app.connections, 'id', selectedConnId);
        if (conn) {
            $editConnectionBtn.prop('disabled', false);
            $refreshDbsBtn.prop('disabled', false);
            if (isTrusted) {
                // Only switch if it's a user generated event
                app.switchConnection(conn);
            }
        } else {
            $('option:selected', $connectionSelect).remove();
            resetConnectionSelect(isTrusted);
        }
    });


    function renderConnectionSelect() {
        $connectionSelect.html('<option value="">Select Connection</option>');

        app.connections.forEach(function (c) {
            $('<option value="' + c.id + '">' + c.name + '</option>').appendTo($connectionSelect);
        });

        if (app.connection) {
            $connectionSelect.val(app.connection.id).change();
        } else {
            resetConnectionSelect(false);
        }
    }

    app.on(['connection-added', 'connection-updated', 'connection-removed'], function (conn) {
        renderConnectionSelect();
    }).on('connection-switched', function (current, previous) {
        $connectionSelect.val((current || {}).id).change();
    });

    // Expose 
    sidebarToolbar.toggleDatabase = {
        contextMenu: {
            callback: function (key, opts, e) {
                if (key === 'selectAll') {
                    app.emit('toggle-databases', 'all', true);
                } else if (key === 'selectNone') {
                    app.emit('toggle-databases', 'all', false);
                } else if (key === 'selectInverse') {
                    app.emit('toggle-databases', 'inverse');
                }
            },
            zIndex: function ($trigger, opt) {
                return 500;
            },
            items: {
                selectAll: { name: 'Select All', icon: 'fa-check-square-o', accesskey: 'a', disabled: function (key, opts) { return totalDbs === selectedDbs; } },
                selectNone: { name: 'De-select All', icon: 'fa-square-o', accesskey: 'd', disabled: function (key, opts) { return selectedDbs === 0; } },
                selectInverse: { name: 'Inverse Selection', icon: 'fa-exchange', accesskey: 'i' }
            }
        }
    };

    $.contextMenu({
        selector: '.sidebar .sidebar-toolbar .toggle-all-db-btn',
        build: function ($trigger, e) {
            return sidebarToolbar.toggleDatabase.contextMenu;
        }
    });

    // Initialization
    if (app.connections.length) renderConnectionSelect();
}(window, window.app = window.app || {}, window.os, jQuery));
