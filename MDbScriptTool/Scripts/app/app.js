(function (window, app, os, $) {
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
        * Generates a random guid.
        * 
        * @returns {string} A guid. Format: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        */
        app.guid = function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
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
         * Finds the element/property in an array or object by a property key and value.
         * 
         * @param {Array|Object} arr The array or object to search.
         * @param {string} key The lookup property key name.
         * @param {any} val The lookup property value.
         * @returns {any} The object referenced by the found index or property name. Else
         *  if no match is found then return null.
         */
        app.findBy = function (arr, key, val) {
            var idx = app.indexBy(arr, key, val);

            if (idx === -1) return null;

            return arr[idx];
        };
    }());


    /* App setup */
    (function () {
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
                id: 'instance' + app.guid(),
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
                return app.compare(a.name, b.name);
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
                    c.id = app.guid();
                }
            });
        } else {
            app.state.connections = [];
        }

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
            var addonJs = app.state.settings.addonJs;
            if (addonJs) {
                if (addonJs.indexOf('http') !== 0) {
                    // Append filesystem schema
                    // Add guid to disable chrome caching
                    addonJs = 'fs://' + addonJs + '?' + app.guid();
                }
                $.ajax({
                    type: "GET",
                    dataType: "text",
                    url: addonJs
                }).always(function (res, textStatus, jqXhr) {
                    if (textStatus === 'success') {
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
                        app.alert(`Failed to load custom script: [${app.state.settings.addonJs}]`);
                    }
                });
            }
            var addonCss = app.state.settings.addonCss;
            if (addonCss) {
                if (addonCss.indexOf('http') !== 0) {
                    // Append filesystem schema
                    // Add guid to disable chrome caching
                    addonCss = 'fs://' + addonCss + '?' + app.guid();
                }
                $('head').append(`<link rel="stylesheet" href="${addonCss}" />`);
            }

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

        /**
         * Hides the element by adding the .hidden class.
         * 
         * @param {any} selectors List of any valid jQuery selector.
         * @returns {any} The jQuery wrapped selector.
         */
        app.hide = function () {
            return $.apply(null, arguments).addClass('hidden').css('display', '');
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
                        ok: 'Ok',
                        backdrop: 'static'
                    }, opts);
                } else if (type === 'confirm') {
                    opts = Object.assign({
                        cancel: 'Cancel',
                        ok: 'Ok',
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
                        callback(false);
                    });
                }
                if (opts.ok === false) {
                    app.hide('.ok-btn', $alertDlg);
                } else {
                    $('.ok-btn', $alertDlg).empty().removeClass('hidden').text(opts.ok || 'Ok').focus().off('click').one('click', function () {
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
    }());

    $(function () {
        // Initialize all tooltips
        $('[data-toggle="tooltip"]').tooltip({
            boundary: 'window',
            tigger: 'hover'
        }).on('mouseleave', function () {
            $(this).tooltip('hide');
        });

        // Prevent right-click context menu
        $(window.document).on('contextmenu', '.no-context-menu', function () {
            return false;
        });
    });
}(window, window.app = window.app || {}, window.os, jQuery));
