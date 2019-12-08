/**
 * Noose
 * 
 * version: 1.2.1
 */

(function (factory, window, document) {
    if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory(window, document);
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(() => {
            return factory(window, document);
        });
    } else {
        window.Noose = factory(window, document);
    }
}(function (window, document) {
    'use strict';

    function noop() {}
    const _min = Math.min;
    const _max = Math.max;
    const _unit = 'px';

    // Default options
    const defaults = {
        // Classes for styling
        classes: {
            noose: 'noose',
            selected: 'selected'
        },
        // Enable/disable computing of selected elements
        compute: true,
        // Containing element for the noose
        container: 'body',
        // Array of containers registered on this instance.
        containers: [],
        // Enable/disable support for ctrl key
        ctrl: true,
        // Whether the noose is enabled
        enabled: true,
        // The selection mode, part or whole
        mode: 'touch',
        // On noose move
        move: noop,
        // The amount of pixels to scroll
        scroll: 10,
        // The edge offset when scrolling should happen
        scrollEdge: 10,
        // The scrollbar size
        scrollbar: 17,
        // Elements to select
        select: '*',
        // Enabled/disable support for shift key
        shift: true,
        // On noose-ing start handler
        start: noop,
        // On noose-ing stop handler
        stop: noop,
        // Styles for the noose
        style: {
            border: '1px dotted #000',
            zIndex: 1000
        },
        // Throttle calls to compute selection
        throttle: 200
    };

    class Noose {
        constructor(container, opts) {
            const self = this;
            // Parse arguments
            if (typeof container === 'object' && container != null && !(container instanceof HTMLElement)) {
                opts = container;
                container = null;
            }
            opts = self.opts = Object.assign({}, defaults, opts);
            // Container must be positioned (anything but static)
            if (typeof container === 'string' || container instanceof HTMLElement) {
                opts.container = container;
            }
            // Get containers
            if (opts.container instanceof HTMLElement) {
                self.containers = [opts.container];
            } else if (typeof opts.container === 'string') {
                self.containers = Array.prototype.slice.call(document.querySelectorAll(opts.container));
            } else {
                throw new Error('Invalid container option');
            }
            // Setup states
            self.coors = {
                // Relative to document top left origin
                pointer: {},
                // Relative to container
                noose: {},
                // Relative to document top left origin
                container: {}
            };
            // Create noose
            const noose = self.noose = document.createElement('div');
            noose.style.position = 'absolute';
            noose.style.zIndex = opts.style.zIndex;
            noose.style.border = opts.style.border;
            if (opts.classes.noose) {
                noose.classList.add(opts.classes.noose);
            }
            let started = false; // Flag for noose-ing started
            let throttled = false;
            self._onStart = function (e) {
                const sameContainer = e.currentTarget === self.currentTarget;
                if (opts.enabled &&
                    (!started || !sameContainer) &&
                    (e.type !== 'mousedown' || e.which === 1)) {
                    started = true;
                    const element = self.currentTarget = e.currentTarget;
                    const cCoors = self.coors.container;
                    const pCoors = self.coors.pointer;
                    const nCoors = self.coors.noose;

                    // Initialize container values
                    const style = window.getComputedStyle(element);
                    if (style.position === 'static') {
                        console.warn('Container is not a positioned element. This may cause issues positioning the noose and/or selecting elements.');
                    }
                    // Does the container have scrollbars
                    if (opts.scroll > 0 && opts.scrollEdge > 0) {
                        cCoors.scrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && element.scrollHeight > element.clientHeight;
                        cCoors.scrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && element.scrollWidth > element.clientWidth;
                    } else {
                        cCoors.scrollX = false;
                        cCoors.scrollY = false;
                    }
                    // Set the max allowed scroll amount
                    cCoors.maxScrollY = cCoors.scrollY && element.scrollHeight - element.clientHeight || 0;
                    cCoors.maxScrollX = cCoors.scrollX && element.scrollWidth - element.clientWidth || 0;

                    // Get previous start coors in case we need to restore them
                    const pStart = pCoors.start;
                    const pEnd = pCoors.end;

                    // Reset start positions
                    pCoors.start = null;
                    nCoors.start = null;

                    self.updateContainerPosition().updatePointerPosition(e);
                    // If the scrollbar was click then don't start
                    if (opts.scrollbar &&
                        ((cCoors.scrollX && pCoors.end.x > (cCoors.x + cCoors.w - opts.scrollbar) ||
                            cCoors.scrollY && pCoors.end.y > (cCoors.y + cCoors.h - opts.scrollbar)))) {
                        started = false;
                        pCoors.start = pStart;
                        pCoors.end = pEnd;
                        return;
                    }

                    // Shift key is pressed, continue noose from previous opposing corner
                    if (opts.shift && sameContainer && e.shiftKey && pStart) {
                        const nTop = nCoors.top;
                        const nBottom = nCoors.bottom;
                        const midX = Math.floor((pStart.x + pEnd.x) / 2);
                        const midY = Math.floor((pStart.y + pEnd.y) / 2);

                        nCoors.start = {};
                        if (pCoors.start.x >= midX && pCoors.start.y < midY) {
                            // 1st quadrant
                            pCoors.start.x = _min(pStart.x, pEnd.x);
                            pCoors.start.y = _max(pStart.y, pEnd.y);
                            nCoors.start.x = nTop.x;
                            nCoors.start.y = nBottom.y;
                        } else if (pCoors.start.x < midX && pCoors.start.y <= midY) {
                            // 2nd quadrant
                            pCoors.start.x = _max(pStart.x, pEnd.x);
                            pCoors.start.y = _max(pStart.y, pEnd.y);
                            nCoors.start = nBottom;
                        } else if (pCoors.start.x <= midX && pCoors.start.y > midY) {
                            // 3rd quadrant
                            pCoors.start.x = _max(pStart.x, pEnd.x);
                            pCoors.start.y = _min(pStart.y, pEnd.y);
                            nCoors.start.x = nBottom.x;
                            nCoors.start.y = nTop.y;
                        } else if (pCoors.start.x > midX && pCoors.start.y >= midY) {
                            // 4th quadrant
                            pCoors.start.x = _min(pStart.x, pEnd.x);
                            pCoors.start.y = _min(pStart.y, pEnd.y);
                            nCoors.start = nTop;
                        }
                    }

                    if (opts.ctrl && sameContainer && e.ctrlKey) {
                        self.lastSelection = self.selected || [];
                    } else {
                        self.lastSelection = [];
                    }

                    noose.style.display = 'none';

                    if (opts.start.apply(self, [e, self.coors]) === false) {
                        started = false;
                        pCoors.start = pStart;
                        pCoors.end = pEnd;
                        return;
                    }

                    element.appendChild(noose);
                }
            };
            self._onMove = function (e) {
                if (opts.enabled) {
                    if (started && e.currentTarget === self.currentTarget) {
                        e.cancelable && e.preventDefault();
                        if (e.type !== 'scroll') {
                            self.updatePointerPosition(e);
                        }
                        self.updateContainerPosition().updateNoosePosition();
                        // Draw noose
                        let nTop = self.coors.noose.top;
                        let nBottom = self.coors.noose.bottom;
                        noose.style.left = nTop.x + _unit;
                        noose.style.top = nTop.y + _unit;
                        noose.style.width = (nBottom.x - nTop.x) + _unit;
                        noose.style.height = (nBottom.y - nTop.y) + _unit;
                        noose.style.display = 'block';

                        // Scroll container
                        let element = self.currentTarget;
                        let cCoors = self.coors.container;
                        let pEnd = self.coors.pointer.end;
                        if (cCoors.scrollY && (pEnd.y - cCoors.y < opts.scrollEdge))
                            element.scrollTop -= opts.scroll;
                        else if (cCoors.scrollY && element.scrollTop < cCoors.maxScrollY && (cCoors.y + cCoors.h - pEnd.y < opts.scrollEdge))
                            element.scrollTop += opts.scroll;
                        else if (cCoors.scrollX && (pEnd.x - cCoors.x < opts.scrollEdge))
                            element.scrollLeft -= opts.scroll;
                        else if (cCoors.scrollX && element.scrollLeft < cCoors.maxScrollX && (cCoors.x + cCoors.w - pEnd.x < opts.scrollEdge))
                            element.scrollLeft += opts.scroll;

                        if (opts.compute) {
                            // Compute selection
                            if (opts.throttle) {
                                // Throttle calls to compute
                                if (!throttled) {
                                    throttled = true;
                                    setTimeout(function () {
                                        throttled && self.compute() && opts.move.apply(self, [e, self.coors, self.selected]);
                                        throttled = false;
                                    }, opts.throttle);
                                }
                            } else {
                                self.compute();
                                opts.move.apply(self, [e, self.coors, self.selected]);
                            }
                        }
                    }
                }
            };
            self._onEnd = function (e) {
                if (self.opts.enabled &&
                    started &&
                    (e.type !== 'mouseup' || e.which === 1)) {
                    started = false;
                    if (e.currentTarget === self.currentTarget) {
                        self.updateContainerPosition().updatePointerPosition(e).updateNoosePosition();
                        throttled = false; // Don't run throttled compute after noose action already completed
                        opts.compute && self.compute(true);
                        setTimeout(function () {
                            opts.stop.apply(self, [e, self.coors, self.selected]);
                        }, 0);
                        self.currentTarget.removeChild(noose);
                    }
                }
            };
            // Register handlers
            self.containers.forEach(container => {
                self._register(container);
            });

            return self;
        }
        /**
         * Destroy this Noose instance.
         *
         * @returns {Noose} This instance.
         */
        destroy() {
            const self = this;
            self.containers.forEach(container => {
                self._deregister(container);
            });
            self.noose.remove();
            self.noose = null;

            return self;
        }
        /**
         * Update the current container's position.
         * 
         * @returns {Noose} This instance.
         */
        updateContainerPosition() {
            const cCoors = this.coors.container;
            const rect = this.currentTarget.getBoundingClientRect();
            // Get position relative to the document's top left origin
            cCoors.x = rect.left + window.pageXOffset;
            cCoors.y = rect.top + window.pageYOffset;
            cCoors.w = rect.width;
            cCoors.h = rect.height;

            return this;
        }
        /**
         * Update the current pointer (mouse/touch) position.
         *
         * @param {Event} e The event that prompted recalculation of the noose (ie: mousemove, touchmove, or scroll).
         * @returns {Noose} This instance.
         */
        updatePointerPosition(e) {
            const root = e && e.touches && e.touches[0] || e;
            const pCoors = this.coors.pointer;

            if (root && typeof root.pageX === 'number') {
                // Get position relative to the document's top left origin

                // Current position is always end
                pCoors.end = {
                    x: root.pageX,
                    y: root.pageY
                };
                // Keep start static
                if (!pCoors.start) {
                    pCoors.start = pCoors.end;
                }
            }

            return this;
        }
        /**
         * Updates the noose top/bottom position.
         *
         * @returns {Noose} This instance.
         */
        updateNoosePosition() {
            const element = this.currentTarget;
            const pEnd = this.coors.pointer.end;
            const cCoors = this.coors.container;
            const nCoors = this.coors.noose;
            // Pointer and container are both relative to document top left origin.
            // The noose is positioned absolute relative to the container. So that's
            // (pointer - container), and also account for the container's scroll position.
            const endX = _max(pEnd.x - cCoors.x + element.scrollLeft, 0);
            const endY = _max(pEnd.y - cCoors.y + element.scrollTop, 0);

            if (!nCoors.start) {
                // Keep start position static
                nCoors.start = {
                    x: endX,
                    y: endY
                };
            }

            // Determine top and bottom of the noose
            // top < bottom
            nCoors.top = {
                x: _min(nCoors.start.x, endX),
                y: _min(nCoors.start.y, endY)
            };
            nCoors.bottom = {
                x: _min(_max(nCoors.start.x, endX), element.scrollWidth),
                y: _min(_max(nCoors.start.y, endY), element.scrollHeight)
            };

            return this;
        }
        /**
         * Compute the selected elements within the noose region.
         *
         * @returns {Noose} This instance.
         */
        compute() {
            const self = this;
            // Only do if select is enabled
            if (self.opts.select) {
                const className = self.opts.classes.selected;
                const container = self.currentTarget;
                const elements = container.querySelectorAll(self.opts.select);
                const nTop = self.coors.noose.top;
                const nBottom = self.coors.noose.bottom;
                const offsetX = self.coors.container.x;
                const offsetY = self.coors.container.y;

                self.selected = [];

                Array.prototype.forEach.call(elements, function (element) {
                    if (element === self.noose) return; // Don't include noose

                    let include;
                    // Get absolute position of element relative to container
                    const rect = element.getBoundingClientRect();
                    const topX = rect.left + window.pageXOffset - offsetX + container.scrollLeft;
                    const topY = rect.top + window.pageYOffset - offsetY + container.scrollTop;
                    const bottomX = rect.width + topX;
                    const bottomY = rect.height + topY;

                    if (self.opts.mode === 'fit') {
                        // Include is entire element is within noose
                        include = nTop.x <= topX && nTop.y <= topY && nBottom.x >= bottomX && nBottom.y >= bottomY;
                    } else {
                        // Include if partially touching
                        include = !(nTop.x > bottomX || nTop.y > bottomY || nBottom.x < topX || nBottom.y < topY);
                    }

                    const idx = self.lastSelection.indexOf(element);

                    if (include && idx === -1 || !include && idx !== -1) {
                        className && element.classList.add(className);
                        self.selected.push(element);
                    } else {
                        className && element.classList.remove(className);
                    }
                });
            }

            return self;
        }
        _deregister(container) {
            container.removeEventListener('mousedown', this._onStart);
            container.removeEventListener('touchstart', this._onStart);
            container.removeEventListener('mousemove', this._onMove);
            container.removeEventListener('touchmove', this._onMove);
            container.removeEventListener('scroll', this._onMove);
            container.removeEventListener('mouseup', this._onEnd);
            container.removeEventListener('touchend', this._onEnd);

            delete container.noose;

            return this;
        }
        /**
         * Deregister a container from the Noose instance.
         * 
         * @param {HTMLElement} container The container to remove.
         * @returns {Noose} This instance.
         */
        deregister(container) {
            var idx = this.containers.indexOf(container);
            if (idx > -1 && typeof container.removeEventListener === 'function') {
                this._deregister(container);
                this.containers.splice(idx, 1);
            }
            return this;
        }
        _register(container) {
            // Fixing chrome mobile touch event issue
            // https://developers.google.com/web/updates/2017/01/scrolling-intervention
            container.addEventListener('mousedown', this._onStart);
            container.addEventListener('touchstart', this._onStart, false);
            container.addEventListener('mousemove', this._onMove);
            container.addEventListener('touchmove', this._onMove, false);
            container.addEventListener('scroll', this._onMove);
            container.addEventListener('mouseup', this._onEnd);
            container.addEventListener('touchend', this._onEnd, false);

            return container.noose = this;
        }
        /**
         * Register a container to the Noose instance.
         * 
         * @param {HTMLElement} container The container to register.
         * @returns {Noose} This instance.
         */
        register(container) {
            var idx = this.containers.indexOf(container);
            if (idx === -1 && typeof container.addEventListener === 'function') {
                this._register(container);
                this.containers.push(container);
            }
            return this;
        }
        /**
         * Get the current version.
         */
        static get version() {
            return '1.2.1';
        }
    }

    return Noose;
}, window, document));
