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
    window.debounce = function debounce(func, wait, immediate) {
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
}(window));