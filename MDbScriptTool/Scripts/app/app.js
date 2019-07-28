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

            return arr[idx];
        };

        /**
         * Copy the specified text to the clipboard.
         * https://stackoverflow.com/a/30810322
         * 
         * @param {string} text The text to copy.
         * @returns {boolean} true if the copy operation was successful, otherwise false.
         */
        app.copyToClipboard = function (text) {
            var textArea = document.createElement("textarea");

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
    }());


    /* App setup */
    (function () {
        Object.assign(app, {
            connections: [],    // Holds all defined connections
            instance: null,     // The current active instance
            instances: [],      // Holds all instances
            settings: {},       // Settings object
            ui: {               // Settings object related to the ui
                sidebarCollapsed: false
            },
            savedStates: ['connections', 'instances', 'settings', 'ui'] // States to save
        });

        // The current active connection
        var _activeConnection = null;
        Object.defineProperty(app, 'connection', {
            get: function () {
                return _activeConnection;
            },
            set: function (c) {
                if (typeof c === 'string') {
                    c = app.findBy(app.connections, 'id', c);
                }

                if (c !== _activeConnection) {
                    var previousConnection = _activeConnection;

                    _activeConnection = c || null;

                    localStorage.setItem('app-active-connection-id', _activeConnection && _activeConnection.id || '');
                    app.emit('connection-changed', _activeConnection, previousConnection);
                }
            }
        });

        /**
         * Creates a new instance.
         * 
         * @param {any} instance Optional. The initial instance properties.
         * @event create-instance 
         * @type {object} instance The newly created instance.
         */
        app.createInstance = function (instance) {
            var inst = Object.assign({
                id: 'instance-' + app.guid(),
                name: 'New *',
                active: true,
                pending: 0,
                code: ''
            }, instance);
            app.instances.push(inst);

            app.emit('create-instance', inst);
            app.saveState('instances');
        };

        /**
         * Saves the application state.
         * 
         * @param {string} key Optional If provided, only save the particular state property.
         * @event saved-state
         */
        app.saveState = function (key) {
            if (key) {
                localStorage.setItem('app-' + key, JSON.stringify(app[key], function (key, value) {
                    if (['$instance', 'editor'].includes(key)) return undefined;
                    return value;
                }));
            } else {
                app.savedStates.forEach(function (key) {
                    localStorage.setItem('app-' + key, JSON.stringify(app[key], function (key, value) {
                        if (['$instance', 'editor'].includes(key)) return undefined;
                        return value;
                    }));
                });
            }

            app.emit('saved-state', key || 'all');
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
            var existingConn = app.findBy(app.connections, 'id', conn.id);

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
                conn = app.findBy(app.connections, 'id', conn);
            }
            var idx = app.connections.indexOf(conn);

            if (idx !== -1) {
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

        // Mirgation from v0.3.12
        // TODO: Remove after 4.x
        app.savedStates.forEach(function (key) {
            savedState = localStorage.getItem(`app-state-${key}`);
     
            if (savedState) {
                localStorage.removeItem(`app-state-${key}`);
                localStorage.setItem(`app-${key}`, savedState);
            }
        });

        // Inits

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
                if (addonJs.indexOf('http') !== 0) {
                    // Append filesystem schema
                    // Add guid to disable chrome caching
                    addonJs = 'fs://' + addonJs + '?' + app.guid();
                }
                $.ajax({
                    type: 'GET',
                    dataType: 'text',
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

            var lastConnectionId = localStorage.getItem('app-active-connection-id', _activeConnection && _activeConnection.id || '');
            if (lastConnectionId) {
                var conn = app.findBy(app.connections, 'id', lastConnectionId);
                if (conn) app.connection = conn;
            }

            // Initialize saved instances
            if (app.instances.length) {
                app.instances.forEach(function (instance) {
                    app.emit('create-instance', instance);
                });
            } else {
                app.createInstance();
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

    /* Configure CodeMirror */
    (function () {
        var cmds = CodeMirror.commands;
        var Pos = CodeMirror.Pos;

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

        cmds.executeSql = function (cm) {
            $('.content .content-toolbar .execute-btn').click();
        };

        cmds.parseSql = function (cm) {
            $('.content .content-toolbar .parse-btn').click();
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
        }).on('mouseleave', function () {
            $(this).tooltip('hide');
        });

        // Prevent right-click context menu
        $(window.document).on('contextmenu', '.no-context-menu', function () {
            return false;
        });
    });
}(window, window.app = window.app || {}, window.os, jQuery));
