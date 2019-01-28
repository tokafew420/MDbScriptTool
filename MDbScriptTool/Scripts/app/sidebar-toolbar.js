/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Sidebar toolbar
 */
(function (window) {
    var $sidebar = $('.sidebar');
    var $toolbar = $('.sidebar-toolbar', $sidebar);
    var $connectionSelect = $('.select-connection', $sidebar);

    // Refresh database list
    $('.refresh-databases-btn', $toolbar).click(function () {
        if (app.state.currentConnection) {
            if (app.state.currentConnection.raw) {
                loading.show('Getting Databases...');
                os.emit('list-databases', app.state.currentConnection.raw);
            }
        } else {
            bsAlert('No connection selected');
        }
    });

    // Select all databases
    $('.check-all-databases-btn', $toolbar).click(function () {
        app.emit('toggle-all-databases', true);
    });

    // Unselect all databases
    $('.uncheck-all-databases-btn', $toolbar).click(function () {
        app.emit('toggle-all-databases', false);
    });

    // Set the connection select to the specified value
    function setConnectionSelect(val) {
        $('option', $connectionSelect).prop('selected', false);

        if (val && val !== 'select') {
            $connectionSelect.val(val);
            $(`option[value="${val}"]`, $connectionSelect).prop('selected', true);
        } else {
            $connectionSelect.val('select');
            $('option[value="select"]', $connectionSelect).prop('selected', true);
        }
    }


    // Set the connection select to "select" and clear the db list
    function resetConnectionSelect() {
        app.setCurrentConnection(null);
        setConnectionSelect('select');
    }

    // Handle connection selection
    $connectionSelect.change(function () {
        var selectedConnId = $('option:selected', $connectionSelect).val();

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
            app.emit('open-connections-modal');
        } else {
            // List databases
            var conn = app.getConnection(selectedConnId);
            if (conn) {
                let previousConnection = app.state.currentConnection;
                app.setCurrentConnection(conn);
            } else {
                resetConnectionSelect();
            }
        }
    });


    function renderConnectionSelect() {
        $connectionSelect.html('<option value="select">Select Connection</option><option value="new">New...</option>');

        app.state.connections.forEach(function (c) {
            $('<option value="' + c.id + '">' + c.name + '</option>').appendTo($connectionSelect);
        });

        if (app.state.currentConnection) {
            setConnectionSelect(app.state.currentConnection.id);
        } else {
            resetConnectionSelect();
        }
    }

    app.on(['connection-added', 'connection-updated', 'connection-removed'], function (conn) {
        renderConnectionSelect();
    });

    app.on('connection-changed', function (current, previous) {
        setConnectionSelect((current || {}).id);
    });

    // Initialization
    if (app.state.connections.length) renderConnectionSelect();
}(window));