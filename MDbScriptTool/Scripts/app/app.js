/// <reference path="utils.js" />

var app = (function (window) {
    var app = new EventEmitter();

    app.state = {
        currentConnectionId: ''
    };
    app.settings = {
        logging: {}
    };
    app.uiState = {};
    app.connections = [];
    app.dbs = [];
    app.currentConnection;

    app.getConnection = function (id) {
        var filtered = app.connections.filter(function (conn) {
            return conn.id === id;
        });

        if (filtered.length) return filtered[0];
        return null;
    };

    app.saveConnection = function (conn, isSelected) {
        var existingConn = app.getConnection(conn.id);

        if (existingConn) {
            existingConn.name = conn.name;
            existingConn.server = conn.server;
            existingConn.username = conn.username;
            existingConn.password = conn.password;
            existingConn.raw = conn.raw;
        } else {
            app.connections.push(conn);
        }

        app.connections.sort(function (a, b) {
            return app.comparer(a.name, b.name);
        });

        localStorage.setItem('connections', JSON.stringify(app.connections));

        if (existingConn) {
            app.emit('connection-updated', conn);
        } else {
            app.emit('connection-added', conn, isSelected);
        }
    };

    app.removeConnection = function (conn) {
        if (typeof conn === 'string') {
            conn = app.getConnection(conn);
        }
        var idx = app.connections.indexOf(conn);

        if (idx !== -1) {
            app.connections.splice(idx, 1);

            if (conn === app.currentConnection) {
                app.currentConnection = null;
                app.state.currentConnectionId = '';
            }

            localStorage.setItem('connections', JSON.stringify(app.connections));
            app.emit('connection-removed', conn);
        } else {
            console.warn('app.removeConnection: Connection not found.');
        }
    };

    app.setCurrentConnection = function (conn) {
        if (conn) {
            app.currentConnection = conn;
            app.state.currentConnectionId = conn.id;
        } else {
            app.currentConnection = null;
            app.state.currentConnectionId = '';
        }

        localStorage.setItem('state', JSON.stringify(app.state));
    };

    app.comparer = new Intl.Collator('en', {
        sensitivity: 'base',
        numeric: true
    }).compare;

    //app.saveSettings = function () {
    //    localStorage.setItem('settings', JSON.stringify(app.settings));
    //};

    // Inits

    var savedData;

    // Get saved settings
    //try {
    //    savedData = window.localStorage.getItem('settings');
    //    if (savedData) {
    //        var settings = JSON.parse(savedData);
    //        if (typeof settings === 'object' && settings !== null) {
    //            app.settings = settings;
    //        }
    //    }
    //} catch (e) {
    //    console.error('Failed to load saved settings.');
    //    console.error(e);
    //}

    // Get saved connections
    try {
        savedData = window.localStorage.getItem('connections');
        if (savedData) {
            var conns = JSON.parse(savedData);
            if (Array.isArray(conns)) {
                app.connections = conns;

                app.connections.forEach(function (c) {
                    if (!c.id || c.id.length !== 36) {
                        c.id = utils.guid();
                    }
                });
            }
        }
    } catch (e) {
        console.error('Failed to load saved connections.');
        console.error(e);
    }

    // Get saved state
    try {
        savedData = localStorage.getItem('state');
        if (savedData) {
            var savedState = JSON.parse(savedData);
            if (typeof savedState === 'object' && savedState !== null) {
                app.state = savedState;

                if (app.state.currentConnectionId) {
                    app.currentConnection = app.getConnection(app.state.currentConnectionId);
                }
            }
        }
    } catch (e) {
        console.error('Failed to load saved state.');
        console.error(e);
    }

    return app;
}(window));