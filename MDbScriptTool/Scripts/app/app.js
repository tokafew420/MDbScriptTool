/// <reference path="utils.js" />

(function (window) {
    var app = window.app = window.app || {};

    // Inherit event emitter
    EventEmitter.call(app);
    Object.assign(app, EventEmitter.prototype);

    /**
     * @type {object} state Contains the application state.
     */
    app.state = {
        connections: [],
        currentConnectionId: '',
        currentConnection: null,
        dbs: [],
        instances: [],
        settings: {},
        ui: {
            sidebarCollapsed: false
        }
    };

    /**
     * Creates a new instance.
     * 
     * @param {any} instance Optional. The initial instance properties.
     * @event new-instance 
     * @type {object} instance The newly created instance.
     */
    app.newInstance = function (instance) {
        var inst = Object.assign({
            id: 'instance' + app.utils.guid(),
            name: 'New *',
            active: true,
            pending: 0,
            code: ''
        }, instance);
        app.state.instances.push(inst);

        app.saveState('instances');
        app.emit('new-instance', inst);
    };

    /**
     * Saves the application state.
     * 
     * @param {string} key Optional If provided, only save the particular state property.
     * @event saved-state
     */
    app.saveState = function (key) {
        if (key) {
            localStorage.setItem('app-state-' + key, JSON.stringify(app.state[key]));
            console.log('saved state: ' + JSON.stringify(app.state[key]));
        } else {
            Object.keys(app.state).forEach(function (key) {
                if (key === 'currentConnection') return;    // Ignored
                localStorage.setItem('app-state-' + key, JSON.stringify(app.state[key]));
            });
            console.log('saved state: ' + JSON.stringify(app.state));
        }

        app.emit('saved-state', key || 'all');
    };

    /**
     * Gets the connection specified by the id.
     * 
     * @param {string} id The connection id.
     * @returns {object} The connection object, or null if not found.
     */
    app.getConnection = function (id) {
        var filtered = app.state.connections.filter(function (conn) {
            return conn.id === id;
        });

        if (filtered.length) return filtered[0];
        return null;
    };

    /**
     * Saves the connection object.
     * 
     * @param {object} conn The connection object.
     * @param {boolean} isSelected Whether the connection should be selected.
     * @event connection-updated
     * @type {object} The updated connection
     * @event connection-added
     * @type {object} The added connection
     * @type {boolean} Whether the connection should be selected.
     */
    app.saveConnection = function (conn, isSelected) {
        var existingConn = app.getConnection(conn.id);

        if (existingConn) {
            existingConn.name = conn.name;
            existingConn.server = conn.server;
            existingConn.username = conn.username;
            existingConn.password = conn.password;
            existingConn.raw = conn.raw;
        } else {
            app.state.connections.push(conn);
        }

        app.state.connections.sort(function (a, b) {
            return app.utils.compare(a.name, b.name);
        });

        app.saveState('connections');

        if (existingConn) {
            app.emit('connection-updated', conn);
        } else {
            app.emit('connection-added', conn, isSelected);
        }
    };

    /**
     * Removes a connection.
     * 
     * @param {object|string} conn The connection object to remove or the connection id of the connection to remove.
     * @event connection-removed
     * @type {object} The removed connection object.
     */
    app.removeConnection = function (conn) {
        if (typeof conn === 'string') {
            conn = app.getConnection(conn);
        }
        var idx = app.state.connections.indexOf(conn);

        if (idx !== -1) {
            app.state.connections.splice(idx, 1);

            if (conn === app.state.currentConnection) {
                app.setCurrentConnection(null);
            }

            app.saveState('connections');

            app.emit('connection-removed', conn);
        } else {
            console.warn('app.removeConnection: Connection not found.');
        }
    };

    /**
     * Sets the specified connection as the current connection.
     * 
     * @param {object} conn The connection object.
     */
    app.setCurrentConnection = function (conn) {
        if (conn !== app.state.currentConnection) {
            var previousConnection = app.state.currentConnection;

            if (conn) {
                app.state.currentConnection = conn;
                app.state.currentConnectionId = conn.id;
            } else {
                app.state.currentConnection = null;
                app.state.currentConnectionId = '';
            }

            app.saveState('currentConnectionId');
            app.emit('connection-changed', app.state.currentConnection, previousConnection);
        }
    };

    // Inits

    // Get saved state
    Object.keys(app.state).forEach(function (key) {
        if (key === 'currentConnection') return;    // Ignored

        var savedState = window.localStorage.getItem('app-state-' + key);

        try {
            var state = JSON.parse(savedState);
            if (state) {
                if (typeof state === 'object') {
                    Object.assign(app.state[key], state);
                } else {
                    app.state[key] = state;
                }
            }
        } catch (e) {
            console.error(`Failed to load saved state. [${key}]`);
            console.error(e);
        }
    });

    // Verify database connections
    if (Array.isArray(app.state.connections)) {
        app.state.connections.forEach(function (c) {
            if (!c.id || c.id.length !== 36) {
                c.id = app.utils.guid();
            }
        });
    } else {
        app.state.connections = [];
    }

    $(function () {
        // Set the current connection
        if (app.state.currentConnectionId) {
            app.setCurrentConnection(app.getConnection(app.state.currentConnectionId));
        }

        // Initialize saved instances
        if (app.state.instances.length) {
            app.state.instances.forEach(function (instance) {
                app.emit('new-instance', instance);
            });
        } else {
            app.newInstance();
        }
    });
}(window));