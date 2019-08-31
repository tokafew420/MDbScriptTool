(function (window, app, os, $) {
    var document = window.document;
    var localStorage = window.localStorage;

    // Initalize app object
    // Inherit event emitter
    EventEmitter.call(app);
    Object.assign(app, EventEmitter.prototype);

    /* Common/Generic Utilities */
    (function () {
        /**
         *  A function that takes in a wrapper function which will delay the execution
         *  of the original function until a specific amount of time has passed.
         *  Generally used to prevent a function from running multiple times in quick
         *  sucession.
         * https://davidwalsh.name/javascript-debounce-function
         * 
         * @param {function} func The function to run.
         * @param {number} wait The time in milliseconds to wait before running.
         * @param {boolean} immediate Whether to run immediately.
         * @returns {function} A wrapper function.
         */
        app.debounce = function (func, wait, immediate) {
            var timeout;
            return function () {
                var context = this, args = arguments;
                var later = function () {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        };

        /**
         * Download the specified text as a file.
         * 
         * @param {string} text The text to download.
         * @param {string} filename The file name or full path include.
         * @param {string} mime The file mime type.
         */
        app.downloadText = function (text, filename, mime) {
            mime = mime || 'text/plain';
            var blob = new Blob([text], { type: 'text/plain' });
            var downloadLink = document.createElement('a');
            downloadLink.download = filename;

            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.webkitURL.createObjectURL(blob);

            downloadLink.click();
        };

        /**
         * A case insensitive and numeric aware compare. (using 'en' Collator)
         * 
         * @param {string} x The first string to compare.
         * @param {string} y The second string to compare.
         * @returns {number} -1 if the first string is less than the second string; 1 if
         *  the first string is greater than the second string; otherwise 0 if the strings are "equal"
         */
        app.compare = new Intl.Collator('en', {
            sensitivity: 'base',
            numeric: true
        }).compare;

        /**
         * Copy the specified text to the clipboard.
         * https://stackoverflow.com/a/30810322
         * 
         * @param {string} text The text to copy.
         * @returns {boolean} true if the copy operation was successful, otherwise false.
         */
        app.copyToClipboard = function (text) {
            var textArea = document.createElement('textarea');

            //
            // *** This styling is an extra step which is likely not required. ***
            //
            // Why is it here? To ensure:
            // 1. the element is able to have focus and selection.
            // 2. if element was to flash render it has minimal visual impact.
            // 3. less flakyness with selection and copying which **might** occur if
            //    the textarea element is not visible.
            //
            // The likelihood is the element won't even render, not even a
            // flash, so some of these are just precautions. However in
            // Internet Explorer the element is visible whilst the popup
            // box asking the user for permission for the web page to
            // copy to the clipboard.
            //

            // Place in top-left corner of screen regardless of scroll position.
            textArea.style.position = 'fixed';
            textArea.style.top = 0;
            textArea.style.left = 0;

            // Ensure it has a small width and height. Setting to 1px / 1em
            // doesn't work as this gives a negative w/h on some browsers.
            textArea.style.width = '2em';
            textArea.style.height = '2em';

            // We don't need padding, reducing the size if it does flash render.
            textArea.style.padding = 0;

            // Clean up any borders.
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';

            // Avoid flash of white box if rendered for any reason.
            textArea.style.background = 'transparent';


            textArea.value = text;

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                var successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (err) {
                console.error('Copy failed', err);
                document.body.removeChild(textArea);
                return false;
            }
        };

        /**
         * Escapes the HTML string by replace the '<' and '>' characters.
         * 
         * @param {string} html The HTML string to escape.
         * @returns {string} The escaped HTML string.
         */
        app.escapeHtml = function (html) {
            if (typeof html === 'string') {
                return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            return html;
        };

        /**
         * Exclude the specified properties of an object.
         * 
         * @param {object} obj The source object.
         * @param {Array|string} props The property (or list or properties) to exclude.
         * @returns {object} A new object with only the wanted properties.
         */
        app.exclude = function (obj, props) {
            if (typeof props === 'string') props = [props];

            return Object.keys(obj).reduce(function (acc, prop) {
                if (!props.includes(prop)) {
                    acc[prop] = obj[prop];
                }
                return acc;
            }, {});
        };

        /**
         * Finds the element/property in an array or object by a property key and value.
         * 
         * @param {Array|Object} arr The array or object to search.
         * @param {string} key The lookup property key name.
         * @param {any} val The lookup property value.
         * @returns {any} The object referenced by the found index or property name. Else
         *  if no match is found then return undefined.
         */
        app.findBy = function (arr, key, val) {
            var idx = app.indexBy(arr, key, val);

            return (arr || {})[idx];
        };

        function _s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        /**
        * Generates a random guid.
        * 
        * @returns {string} A guid. Format: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        */
        app.guid = function () {
            return _s4() + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + _s4() + _s4();
        };

        /**
         * Finds the index of an element in an array or object by a property key and value.
         * 
         * @param {Array|Object} arr The array or object to search.
         * @param {string} key The lookup property key name.
         * @param {any} val The lookup property value.
         * @returns {number|string} If an array is searched then the index of the found element
         *  is returned. If an object is searched then the property name of the found property
         *  is returned. Otherwise if no match is found then return -1.
         */
        app.indexBy = function (arr, key, val) {
            var i, ii, k;

            if (arr) {
                if (Array.isArray(arr)) {
                    for (i = 0, ii = arr.length; i < ii; i++) {
                        if (arr[i] && arr[i][key] === val) return i;
                    }
                } else if (typeof arr === 'object') {
                    var keys = Object.keys(arr);
                    for (i = 0, ii = keys.length; i < ii; i++) {
                        k = keys[i];
                        if (arr[k] && arr[k][key] === val) return k;
                    }
                }
            }

            return -1;
        };

        /**
         * Get the last item in the array.
         * 
         * @param {Array} arr The array to pick from
         * @returns {any} The last array element or null if the array is empty.
         */
        app.last = function (arr) {
            return arr && arr.length ? arr[arr.length - 1] : null;
        };

        /**
         * A no-op function.
         **/
        app.noop = function () { };

        /**
         * A function that executes the first function parameter and return its result.
         * If a function is not found then return the 1st arguments.
         *
         *@returns {any} The result of the 1st function or the 1st argument. 
         **/
        app.op = function () {
            var args = [].slice.call(arguments);

            for (var i = 0, ii = args.length; i < ii; i++) {
                if (typeof args[i] === 'function') {
                    return args[i]();
                }
            }

            return args[0];
        };

        /**
         * Open a file a the specified path.
         * 
         * @param {string} path The path to the file.
         * @param {Function} callback The callback function which will receive text in the file.
         */
        app.openFile = function (path, callback) {
            callback = callback || app.noop;
            if (!path) {
                callback(new Error('Missing argument file path'));
            }
            if (path.indexOf('http') !== 0) {
                // Append filesystem schema
                // Add guid to disable chrome caching
                path = 'fs://' + path + '?' + app.guid();
            }
            $.ajax({
                type: 'GET',
                dataType: 'text',
                url: path
            }).always(function (res, textStatus, jqXhr) {
                if (textStatus === 'success') {
                    callback(null, res);
                } else {
                    callback(new Error(res && res.responseText || 'Failed to open file'));
                }
            });
        };

        /**
         * Pick out the specified properties of an object.
         * 
         * @param {object} obj The source object.
         * @param {Array|string} props The property (or list or properties) to pick out.
         * @returns {object} A new object with only the wanted properties.
         */
        app.pick = function (obj, props) {
            if (typeof props === 'string') props = [props];

            return props.reduce(function (acc, prop) {
                acc[prop] = obj[prop];
            }, {});
        };

        /**
         * Finds the element/property in an array or object by a property key and value.
         * 
         * @param {Array|Object} arr The array or object to search.
         * @param {string} key The lookup property key name.
         * @param {any} val The lookup property value.
         * @returns {any} The object referenced by the found index or property name. Else
         *  if no match is found then return undefined.
         */
        app.removeBy = function (arr, key, val) {
            var idx = app.indexBy(arr, key, val);
            var obj = arr[idx];

            if (obj) arr.splice(idx, 1);

            return obj;
        };
    }());


    /* App setup */
    (function () {
        Object.assign(app, {
            connection: null,   // THe current active connection
            connections: [],    // Holds all defined connections
            instance: null,     // The current active instance
            instances: [],      // Holds all instances
            settings: {},       // Settings object
            ui: {               // Settings object related to the ui
                sidebarCollapsed: false
            },
            savedStates: ['connections', 'instances', 'settings', 'ui'] // States to save
        });

        // Creates a connection object with only properties relevant for the instance.
        function _createInstanceConnection(connection) {
            if (connection) {
                return {
                    id: connection.id,
                    dbs: (connection.dbs || []).map(function (db) { return { name: db.name, checked: db.checked }; }),
                    search: connection.search
                };
            }
            return null;
        }

        // Restore the state of the connection to reflect the instance's stored connection state.
        function _restoreInstanceConnection(connection, instanceConnection) {
            (connection.dbs || []).forEach(function (db) {
                db.checked = !!(app.findBy(instanceConnection.dbs, 'name', db.name) || {}).checked;
            });
            connection.search = instanceConnection.search;

            return connection;
        }

        // Create a new instance object.
        function _createInstance(instance) {
            return Object.assign({
                id: 'instance-' + app.guid(),
                name: 'New',
                active: true,
                pending: 0,
                original: null,
                code: '',
                dirty: false,
                connections: [],
                connection: null
            }, instance);
        }

        /**
         * Creates a new instance.
         * 
         * @param {any} instance Optional. The initial instance properties.
         * @returns {object} The newly created instance.
         * @event create-instance|instance-created
         * @type {object} The newly created instance.
         */
        app.createInstance = function (instance) {
            var conn = _createInstanceConnection(app.connection);
            var conns = conn ? [conn] : [];

            instance = Object.assign(_createInstance(), {
                connections: conns,
                connection: conn
            }, instance);

            if (!instance.original) {
                instance.original = SparkMD5.hash(instance.code || '');
            }

            app.emit('create-instance', instance);

            app.instances.push(instance);

            app.emit('instance-created', instance);

            app.saveState('instances');

            return instance;
        };

        /**
         * Remove an instance.
         * 
         * @param {any} instance This instance to remove or the instance id.
         * @returns {object} The removed instance or null if nothing was removed.
         * @event remove-instance|instance-removed
         * @type {object} instance The instance to remove.
         */
        app.removeInstance = function (instance) {
            if (typeof instance === 'string') {
                instance = app.findBy(app.instances, 'id', instance);
            }

            var idx = app.instances.indexOf(instance);

            if (idx !== -1) {
                instance = app.instances[idx];
                app.emit('remove-instance', instance);

                app.instances.splice(idx, 1);
                if (app.instance === instance) {
                    app.instance = null;
                }
                app.saveState('instances');

                app.emit('instance-removed', instance);

                if (app.instances.length && app.instance === null) {
                    // Switch to previous instance (to left) or next instance (to right)
                    app.switchInstance(app.instances[idx - 1] || app.instances[idx]);
                } else if (!app.instances.length) {
                    // Create new empty instance
                    app.switchInstance(app.createInstance());
                }

                return instance;
            }

            return null;
        };

        /**
         * Switch to a different instance.
         * 
         * @param {object} instance The instance to switch to.
         * @returns {object} The instance that was switched to or null if no switch happened.
         * @event switch-instance|instance-switched
         * @type {object} The target instance being switch to.
         * @type {object} The previous instance.
         */
        app.switchInstance = function (instance) {
            if (typeof instance === 'string') {
                instance = app.findBy(app.instances, 'id', id);
            }

            if (instance && instance !== app.instance) {
                var prev = app.instance;

                app.emit('switch-instance', instance, prev);

                app.instances.forEach(function (i) {
                    i.active = i === instance;
                });

                app.instance = instance;

                // Update connection
                if (instance.connection) {
                    var conn = app.findBy(app.connections, 'id', instance.connection.id);

                    if (conn) {
                        app.switchConnection(conn);
                    } else {
                        app.removeBy(instance.connections, 'id', instance.connection.id);
                        instance.connection = null;
                        app.switchConnection(null);
                    }
                } else {
                    app.switchConnection(null);
                }

                app.emit('instance-switched', instance, prev);
                app.saveState('instances');

                return instance;
            }

            return null;
        };

        /**
         * Saves the application state.
         * 
         * @param {string} key Optional If provided, only save the particular state property.
         * @event save-state|state-saved
         * @type {Array} An array of states saved
         */
        app.saveState = function (key) {
            var states = app.savedStates;
            if (key && typeof key === 'string') states = [key];

            app.emit('save-state', states);

            states.forEach(function (key) {
                if (key === 'instances') {
                    var instances = app.instances.map(function (instance) {
                        return app.exclude(instance, ['editor', 'pending', 'result', 'totalRows', '$editor', '$instance', '$tab', '$result', '$slider']);
                    });
                    localStorage.setItem('app-' + key, JSON.stringify(instances));
                } else {
                    localStorage.setItem('app-' + key, JSON.stringify(app[key]));
                }
            });

            app.emit('state-saved', states);
        };

        /**
         * Saves the connection object.
         * 
         * @param {object} conn The connection object.
         * @event update-connection|connection-updated
         * @type {object} The updated connection
         * @event add-connection|connection-added
         * @type {object} The added connection
         * @type {boolean} Whether the connection should be selected.
         */
        app.saveConnection = function (conn) {
            var existingConn = app.findBy(app.connections, 'id', conn.id);

            if (existingConn) {
                app.emit('update-connection', conn);
            } else {
                app.emit('add-connection', conn);
            }

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
                return app.compare(a.name, b.name);
            });

            app.saveState('connections');

            if (existingConn) {
                app.emit('connection-updated', conn);
            } else {
                app.emit('connection-added', conn);
            }
        };

        /**
         * Removes a connection.
         * 
         * @param {object|string} conn The connection object to remove or the connection id of the connection to remove.
         * @event remove-connection|connection-removed
         * @type {object} The connection object being removed.
         */
        app.removeConnection = function (conn) {
            if (typeof conn === 'string') {
                conn = app.findBy(app.connections, 'id', conn);
            }
            var idx = app.connections.indexOf(conn);

            if (idx !== -1) {
                app.emit('remove-connection', conn);

                app.instances.forEach(function (instance) {
                    if (instance.connection && instance.connection.id === conn.id) {
                        instance.connection = null;
                    }
                    app.removeBy(instance.connections, 'id', conn.id);
                });

                app.connections.splice(idx, 1);

                if (conn === app.connection) {
                    app.connection = null;
                }

                app.saveState('connections');

                app.emit('connection-removed', conn);
            } else {
                console.warn('app.removeConnection: Connection not found.');
            }
        };

        /**
         * Switch to a different connection.
         * 
         * @param {object} conn The connection to switch to.
         * @returns {object} The connection that was switched to.
         * @event switch-connection|connection-switched
         * @type {object} The target instance being switch to.
         * @type {object} The previous instance.
         */
        app.switchConnection = function (conn) {
            if (typeof conn === 'string') {
                conn = app.findBy(app.connections, 'id', conn);
            }

            var prev = app.connection;

            if (conn && app.instance) {
                let instConn = app.findBy(app.instance.connections, 'id', conn.id);

                if (instConn) {
                    conn = _restoreInstanceConnection(conn, instConn);
                }
            }

            app.emit('switch-connection', conn, prev);

            if (conn && app.instance) {
                app.instance.connection = _createInstanceConnection(conn);

                app.removeBy(app.instance.connections, 'id', conn.id);
                app.instance.connections.push(app.instance.connection);
            }

            app.connection = conn;

            app.emit('connection-switched', conn, prev);
            app.saveState('instances');

            return conn;
        };

        /**
         * Refresh the current connection's database list.
         */
        app.refreshDbs = function () {
            if (app.connection && app.connection.raw) {
                app.emit('fetch-connection-dbs', app.connection);
                app.loading.show('Getting Databases...');
                os.emit('fetch-connection-dbs', app.connection.raw, app.connection.id);
            }
        };
        os.on('connection-dbs-fetched', function (err, dbs, id) {
            var connection = app.findBy(app.connections, 'id', id);
            dbs = dbs || [];

            if (err) {
                console.log(err);
                app.alert(err.Message, 'Error Listing Databases');
            } else {
                if (connection) {
                    // Pull out properties
                    connection.dbs = dbs.map(function (db) {
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


                    if (app.instance) {
                        // Reapply checked databaases
                        var instanceConn = app.findBy(app.instance.connections, 'id', connection.id) || {};
                        (instanceConn.dbs || []).forEach(function (db) {
                            (app.findBy(connection.dbs, 'name', db.name) || {}).checked = !!db.checked;
                        });
                    }

                    app.saveState('connections');
                }
            }
            app.loading.hide();
            app.emit('connection-dbs-fetched', connection || id, err, dbs);
        });

        /**
         * Save the current instance sql to a file.
         *
         * @param {boolean} saveAs true to invoke "Save As"
         **/
        app.saveInstanceToFile = function (saveAs) {
            if (app.instance) {
                var instance = app.instance;
                var sql = instance.editor.getValue();

                app.emit('saving-instance-file', instance);

                var filename = (saveAs ? 'saveas:' : 'save:') + (instance.path || 'new.sql');

                app.downloadText(sql, encodeURIComponent(filename), 'application/sql');

                os.once('download-completed', function (complete, download) {
                    if (complete) {
                        instance.path = download.FullPath.replace(/\\/g, '/');
                        instance.name = instance.path.split('/').pop();
                        instance.dirty = false;

                        app.saveState('instances');
                    }
                    app.emit('instance-file-saved', instance, complete);
                });
            }
        };

        /**
         * Force the app to redraw (re-render).
         */
        app.redraw = function () {
            app.emit('redraw');
        };
        $(window).on('resize', app.redraw);

        /**
         * Executes the given sql. If not arguments are provided, then the sql from the current instance is executed.
         * 
         * @param {string} connectionString The target server connection string.
         * @param {Array} dbs A list of databases on the target server to execute the sql.
         * @param {string} sql The sql to execute.
         * @param {string} id The id of the execution.
         * @returns {boolean} true if some sql was submitted for execution.
         *
         * @event execute-sql If called with no arguments
         * @type {object} The target instance being executed.
         * @type {object} The target connection used for the execution.
         * @type {Array} The array of database names.
         * @type {string} The sql being executed.
         */
        app.executeSql = function (connectionString, dbs, sql, id) {
            if (connectionString && typeof connectionString === 'string') {
                os.emit('execute-sql', connectionString, dbs, sql, id);
                return true;
            } else {
                if (app.instance && app.connection) {
                    sql = app.instance.editor.getSelection();

                    if (!sql) sql = app.instance.editor.getValue();
                    sql = (sql || '').trim();

                    if (sql) {
                        dbs = (app.connection.dbs || [])
                            .filter(function (d) { return d.checked; })
                            .map(function (db) { return db.name; });

                        if (dbs.length) {
                            (app.connection.confirmSql ? app.confirm : app.op)(`Confirm SQL execution against <strong>${dbs.length}</strong> database(s) on <strong>${app.connection.name}</strong>.`, 'Confirm', {
                                yes: 'Execute',
                                html: true
                            }, function (confirmed) {
                                if (!app.connection.confirmSql || confirmed) {
                                    app.emit('execute-sql', app.instance, app.connection, dbs, sql);

                                    app.instance.pending = 1;
                                    app.instance.totalRows = null;

                                    return app.executeSql(app.connection.raw, dbs, sql, app.instance.id);
                                }
                            });

                            return !app.connection.confirmSql;
                        }
                    }
                }
            }

            return false;
        };

        os.on('sql-exe-db-begin', function (err, id, db) {
            var instance = app.findBy(app.instances, 'id', id);

            if (instance) {
                instance.pending++;
            }
            app.emit('execute-sql-db-begin', instance, err, db);
        }).on('sql-exe-db-batch-result', function (err, id, db, batchNum, result) {
            var instance = app.findBy(app.instances, 'id', id);

            if (instance) {
                var _result = instance.result = instance.result || {};
                var _db = _result[db] = _result[db] || [];

                _db.push({
                    error: err,
                    result: result
                });

                if (!err && result) {
                    instance.totalRows = instance.totalRows || 0;
                    instance.totalRows += result.length - 1;
                }
            }

            app.emit('sql-executed-db-batch', instance || id, err, db, result);
        }).on('sql-exe-db-complete', function (err, id, db) {
            var instance = app.findBy(app.instances, 'id', id);

            if (instance) {
                instance.pending--;
                if (instance.pending < 0) instance.pending = 0;
            }
            app.emit('execute-sql-db-progress', instance || id, err, db);
        }).on(['sql-exe-complete'], function (err, id) {
            // This event only fires when the entire batch failed to execute.
            if (err) {
                console.log(err);
                app.alert(err.Message, 'Error Executing SQL');
            }

            var instance = app.findBy(app.instances, 'id', id);

            if (instance) {
                instance.pending = 0;
            }
            app.emit('sql-executed', instance || id, err);
        });

        /**
         * Parses the given sql. If not arguments are provided, then the sql from the current instance is parsed.
         * 
         * @param {string} connectionString The target server connection string.
         * @param {string} sql The sql to parse.
         * @param {string} id The id of the execution.
         * @returns {boolean} true if some sql was submitted for parsing.
         *
         * @event parse-sql Only if called with no arguments
         * @type {object} The target instance being parsed.
         * @type {object} The target connection used for the execution.
         * @type {string} The sql being parsed.
         */
        app.parseSql = function (connectionString, sql, id) {
            if (connectionString && typeof connectionString === 'string') {
                os.emit('parse-sql', app.connection.raw, sql, id);
                return true;
            } else {
                if (app.instance && app.connection) {
                    sql = app.instance.editor.getSelection();

                    if (!sql) sql = app.instance.editor.getValue();
                    sql = (sql || '').trim();

                    if (sql) {
                        app.emit('parse-sql', app.instance, app.connection, sql);

                        app.instance.totalRows = null;
                        app.instance.pending = 1;
                        app.parseSql(app.connection.raw, sql, app.instance.id);
                    }
                }
            }

            return false;
        };

        os.on('sql-parse-complete', function (err, batchId, errors) {
            var instance = app.findBy(app.instances, 'id', batchId);

            if (instance) {
                instance.pending = 0;
            }

            app.emit('sql-parsed', instance, err, errors);
        });

        // Inits

        // Mirgation from v0.3.12
        // TODO: Remove after 4.x
        app.savedStates.forEach(function (key) {
            savedState = localStorage.getItem(`app-state-${key}`);

            if (savedState) {
                localStorage.removeItem(`app-state-${key}`);
                localStorage.setItem(`app-${key}`, savedState);
            }
        });

        // Get saved state
        app.savedStates.forEach(function (key) {
            var savedState = localStorage.getItem(`app-${key}`);

            try {
                var state = JSON.parse(savedState);
                if (state) {
                    if (typeof state === 'object') {
                        Object.assign(app[key], state);
                    } else {
                        app[key] = state;
                    }
                }
            } catch (e) {
                console.error(`Failed to load saved state. [${key}]`, e);
            }
        });

        $(function () {
            function alertError(err) {
                app.alert('<p>Failed to load custom script: </p>' +
                    '<p class="text-danger">' + err.message + '</p>', {
                        html: true
                    });
            }
            function alertGlobalError(message, source, lineno, colno, err) {
                app.alert('<p>Failed to load custom script: </p>' +
                    '<p class="text-danger">' + message + '</p>' +
                    '<div><strong>Source: </strong>' + source + '</div>' +
                    '<div><strong>Line: </strong>' + lineno + '</div>' +
                    '<div><strong>Column: </strong>' + colno + '</div>', {
                        html: true
                    });
            }

            // Initialize addons
            var addonJs = app.settings.addonJs;
            if (addonJs) {
                app.openFile(addonJs, function (err, res) {
                    if (!err) {
                        res = `(function (window, app, os, $) {
                            try { ${res} } catch (err) { (${alertError.toString()}(err)); }
                        }(window, window.app = window.app || {}, window.os, jQuery));`;

                        var $onerror = $(`<script>window.onerror = ${alertGlobalError.toString()};</script>`);
                        var $cleanup = $(`<script>window.onerror = null;</script>`);

                        $('body').append($onerror);
                        $('body').append(`<script>${res}</script>`);
                        $('body').append($cleanup);

                        $onerror.remove();
                        $cleanup.remove();
                    } else {
                        app.alert(`Failed to load custom script: [${app.settings.addonJs}]`);
                    }
                });
            }
            var addonCss = app.settings.addonCss;
            if (addonCss) {
                if (addonCss.indexOf('http') !== 0) {
                    // Append filesystem schema
                    // Add guid to disable chrome caching
                    addonCss = 'fs://' + addonCss + '?' + app.guid();
                }
                $('head').append(`<link rel="stylesheet" href="${addonCss}" />`);
            }

            // Initialize saved instances
            if (app.instances.length) {
                app.instances = app.instances.map(function (instance) {
                    instance = _createInstance(instance);

                    if (instance.connection) {
                        // Restore connection/connections reference
                        instance.connection = app.findBy(instance.connections, 'id', instance.connection.id);
                    }

                    app.emit('create-instance', instance);
                    app.emit('instance-created', instance);

                    return instance;
                });
            } else {
                app.createInstance();
            }

            // Set active instance
            var activeInstances = app.instances.filter(function (i) { return i && i.active; });
            app.switchInstance(app.last(activeInstances.length ? activeInstances : app.instances));
        });
    }());

    /* UI Utilities */
    (function () {
        /*
         * Shows the element hidden by hide() by removing the .hidden class.
         * 
         * @param {any} selectors List of any valid jQuery selector.
         * @returns {any} The jQuery wrapped selector.
         */
        app.show = function () {
            return $.apply(null, arguments).removeClass('hidden').css('display', '');
        };
        $.fn.appShow = function () {
            return app.show(this);
        };

        /**
         * Hides the element by adding the .hidden class.
         * 
         * @param {any} selectors List of any valid jQuery selector.
         * @returns {any} The jQuery wrapped selector.
         */
        app.hide = function () {
            return $.apply(null, arguments).addClass('hidden').css('display', '');
        };
        $.fn.appHide = function () {
            return app.hide(this);
        };

        // Setup alert dialog
        app.dialog = (function () {
            var $alertDlg = $('#alert-modal');

            var bsAlert = function (type, msg, title, opts, callback) {
                if (typeof title === 'object' || typeof title === 'function') {
                    callback = opts;
                    opts = title;
                    title = null;
                }
                if (typeof opts === 'function') {
                    callback = opts;
                    opts = {};
                }
                opts = opts || {};
                callback = callback || function () { };

                if (type === 'alert') {
                    opts = Object.assign({
                        cancel: false,
                        no: false,
                        yes: 'Ok',
                        backdrop: 'static'
                    }, opts);
                } else if (type === 'confirm') {
                    opts = Object.assign({
                        cancel: 'Cancel',
                        no: false,
                        yes: 'Ok',
                        backdrop: 'static',
                        keyboard: false
                    }, opts);
                }

                var fn = opts.html ? 'html' : 'text';

                if (title) {
                    app.show($('.modal-header', $alertDlg).empty())[fn](title);
                } else {
                    app.hide('.modal-header', $alertDlg).empty();
                }

                $('.modal-body', $alertDlg).empty()[fn](msg);

                if (opts.cancel === false) {
                    app.hide('.cancel-btn', $alertDlg);
                } else {
                    $('.cancel-btn', $alertDlg).empty().removeClass('hidden').text(opts.cancel || 'Cancel').off('click').one('click', function () {
                        $alertDlg.modal('hide');
                        callback();
                    });
                }
                if (opts.no === false) {
                    app.hide('.no-btn', $alertDlg);
                } else {
                    $('.no-btn', $alertDlg).empty().removeClass('hidden').text(opts.no || 'No').off('click').one('click', function () {
                        $alertDlg.modal('hide');
                        callback(false);
                    });
                }
                if (opts.yes === false) {
                    app.hide('.yes-btn', $alertDlg);
                } else {
                    $('.yes-btn', $alertDlg).empty().removeClass('hidden').text(opts.yes || 'Ok').off('click').one('click', function () {
                        $alertDlg.modal('hide');
                        callback(true);
                    });
                }

                $alertDlg.modal({
                    backdrop: opts.backdrop === false ? false : opts.backdrop || true,
                    keyboard: typeof opts.keyboard === 'boolean' ? opts.keyboard : true
                }).modal('show');
            };

            return bsAlert;
        })();

        // Shortcut for dialog of type alert
        app.alert = app.dialog.bind(this, 'alert');

        // Shortcut for dialog of type confirm
        app.confirm = app.dialog.bind(this, 'confirm');

        // Setup loading div
        app.loading = (function () {
            var $container = $('.loader-container');
            var $spinner = $('.loader', $container);
            var $msg = $('.msg', $container);

            return {
                show: function (opts) {
                    if (typeof opts === 'string') {
                        opts = {
                            msg: opts
                        };
                    }
                    opts = opts || {};

                    if (opts.msg) {
                        $msg.text(opts.msg);
                    } else {
                        $msg.empty();
                    }

                    $container.show();
                },
                hide: function (opts) {
                    $container.hide();
                }
            };
        })();

        $('body').on('shown.bs.modal', '.modal', function () {
            // Make modals draggable
            $('.modal-content', this).draggable({
                addClasses: false,
                containment: 'body',
                handle: '.modal-header'
            });
            // Auto-focus on the specified element when a modal is open
            $('.auto-focus', this).focus();
        }).on('hidden.bs.modal', '.modal', function () {
            // Reposition modals
            $('.modal-content', this)
                .draggable('destroy')
                .css({
                    top: '',
                    left: ''
                });
        });
    }());

    /* Configure CodeMirror */
    (function () {
        var cmds = CodeMirror.commands;
        var Pos = CodeMirror.Pos;

        cmds.executeSql = function (cm) {
            $('.content .content-toolbar .execute-btn').click();
        };

        cmds.parseSql = function (cm) {
            $('.content .content-toolbar .parse-btn').click();
        };

        cmds.newFile = function (cm) {
            $('.content .content-toolbar .new-file-btn').click();
        };

        cmds.openFile = function (cm) {
            $('.content .content-toolbar .open-file-btn').click();
        };

        cmds.saveFile = function (cm) {
            $('.content .content-toolbar .save-file-btn').click();
        };

        cmds.saveAsFile = function (cm) {
            $('.content .content-toolbar .save-as-file-btn').click();
        };

        CodeMirror.defineExtension('appToggleComment', function (opts) {
            opts = opts || {};

            var cm = this;
            var minLine = Infinity, ranges = cm.listSelections(), mode = opts.mode;
            for (var i = ranges.length - 1; i >= 0; i--) {
                var from = ranges[i].from(), to = ranges[i].to();
                if (from.line >= minLine) continue;
                if (to.line >= minLine) to = Pos(minLine, 0);
                minLine = from.line;

                if (mode === "un") {
                    cm.uncomment(from, to, opts);
                } else {
                    cm.lineComment(from, to, opts);
                }
            }
        });

        cmds.comment = function (cm) {
            cm.appToggleComment();
        };

        cmds.uncomment = function (cm) {
            cm.appToggleComment({ mode: 'un' });
        };

        var appKeyMap = CodeMirror.keyMap.app = {
            // Commands defined in /Scripts/CodeMirror/keymap/sublime.js
            'Shift-Tab': 'indentLess',
            'Alt-Up': 'swapLineUp',
            'Alt-Down': 'swapLineDown',
            'Ctrl-U': 'downcaseAtCursor',
            'Shift-Ctrl-U': 'upcaseAtCursor',
            'Ctrl-/': 'toggleComment',
            'Shift-Ctrl-D': 'duplicateLine',
            // Custom commands
            'Ctrl-E': 'executeSql',
            'Ctrl-P': 'parseSql',
            'Ctrl-N': 'newFile',
            'Ctrl-O': 'openFile',
            'Ctrl-S': 'saveFile',
            'Shift-Ctrl-S': 'saveAsFile',
            'Ctrl-K Ctrl-C': 'comment',
            'Ctrl-K Ctrl-U': 'uncomment',
            fallthrough: 'default'
        };

        // Must call from Multi-stroke key bindings
        CodeMirror.normalizeKeyMap(appKeyMap);
    }());

    $(function () {
        // Initialize all tooltips
        $('[data-toggle="tooltip"]').tooltip({
            boundary: 'window',
            tigger: 'hover'
        }).on('mouseleave click', function () {
            $(this).tooltip('hide');
        });

        // Prevent right-click context menu
        $(window.document).on('contextmenu', '.no-context-menu', function () {
            return false;
        });
    });
}(window, window.app = window.app || {}, window.os, jQuery));
