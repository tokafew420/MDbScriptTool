(function (window) {
    // Register script event object that interops with the .Net side.
    (async function () {
        await CefSharp.BindObjectAsync("scriptEvent");
    })();

    // Event Emitter polyfill if needed
    // https://gist.github.com/mudge/5830382
    if (typeof window.EventEmitter !== 'function') {
        var EventEmitter = window.EventEmitter = class EventEmitter {
            constructor() {
                this.events = [];
            }
            on(event, listener) {
                if (typeof this.events[event] !== 'object') {
                    this.events[event] = [];
                }

                this.events[event].push(listener);

                return this;
            }
            removeListener(event, listener) {
                var idx;

                if (typeof this.events[event] === 'object') {
                    idx = this.events[event].indexOf(listener);

                    if (idx > -1) {
                        this.events[event].splice(idx, 1);
                    }
                }

                return this;
            }
            emit(event) {
                var i, listeners, length, args = [].slice.call(arguments, 1);

                if (typeof this.events[event] === 'object') {
                    listeners = this.events[event].slice();
                    length = listeners.length;

                    for (i = 0; i < length; i++) {
                        listeners[i].apply(this, args);
                    }
                }

                return this;
            }
            once(event, listener) {
                this.on(event, function g() {
                    this.removeListener(event, g);
                    listener.apply(this, arguments);
                });

                return this;
            }
        };
    }

    // Define global system event emitter.
    window.systemEvent = new window.EventEmitter();

    // Setup alert dialog
    window.bsDialog = window.bsDialog || (function () {
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
                    ok: 'Ok'
                }, opts);
            } else if (type === 'confirm') {
                opts = Object.assign({
                    cancel: 'Cancel',
                    ok: 'Ok',
                    backdrop: 'static',
                    keyboard: false
                }, opts);
            }

            if (title) {
                if (opts.isHtml) {
                    $('.modal-header', $alertDlg).empty().removeClass('hidden').html(title);
                } else {
                    $('.modal-header', $alertDlg).empty().removeClass('hidden').text(title);
                }
            } else {
                $('.modal-header', $alertDlg).empty().addClass('hidden');
            }

            if (opts.isHtml) {
                $('.modal-body', $alertDlg).empty().html(msg);
            } else {
                $('.modal-body', $alertDlg).empty().text(msg);
            }

            if (opts.cancel === false) {
                $('.cancel-btn', $alertDlg).addClass('hidden');
            } else {
                $('.cancel-btn', $alertDlg).empty().removeClass('hidden').text(opts.cancel || 'Cancel').off('click').one('click', function () {
                    $alertDlg.modal('hide');
                    callback(false);
                });
            }
            if (opts.ok === false) {
                $('.ok-btn', $alertDlg).addClass('hidden');
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

    window.bsAlert = window.bsAlert || window.bsDialog.bind(this, 'alert');

    window.bsConfirm = window.bsConfirm || window.bsDialog.bind(this, 'confirm');

    // Setup loading div
    window.loading = (function () {
        $container = $('.loader-container');
        $spinner = $('.loader', $container);
        $msg = $('.msg', $container);

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
}(window));