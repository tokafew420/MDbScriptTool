(function (window) {
    // Event Emitter polyfill if needed
    // https://gist.github.com/mudge/5830382
    if (typeof window.EventEmitter !== 'function') {
        var EventEmitter = window.EventEmitter = function EventEmitter() {
            this.events = [];
        };
        EventEmitter.prototype.on = function (events, listener) {
            var that = this;
            if (typeof events === 'string') {
                events = [events];
            }
            events.forEach(function (event) {
                if (typeof that.events[event] !== 'object') {
                    that.events[event] = [];
                }

                that.events[event].push(listener);
            });

            return this;
        };
        EventEmitter.prototype.removeListener = function (event, listener) {
            var idx;

            if (typeof this.events[event] === 'object') {
                idx = this.events[event].indexOf(listener);

                if (idx > -1) {
                    this.events[event].splice(idx, 1);
                }
            }

            return this;
        };
        EventEmitter.prototype.emit = function (event) {
            var i, listeners, length, args = [].slice.call(arguments, 1);

            if (typeof this.events[event] === 'object') {
                listeners = this.events[event].slice();
                length = listeners.length;

                for (i = 0; i < length; i++) {
                    listeners[i].apply(this, args);
                }
            }

            return this;
        };
        EventEmitter.prototype.once = function (event, listener) {
            this.on(event, function g() {
                this.removeListener(event, g);
                listener.apply(this, arguments);
            });

            return this;
        };
    }
}(window));