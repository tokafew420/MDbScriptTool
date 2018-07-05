var utils = (function (window) {
    var utils = {};

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
    utils.debounce = function debounce(func, wait, immediate) {
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

    utils.guid = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    utils.escapeHtml = function (html) {
        if (typeof html === 'string') {
            return html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        return html;
    };

    return utils;
}(window));