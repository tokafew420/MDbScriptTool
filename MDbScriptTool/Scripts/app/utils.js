(function (window) {
    var app = window.app = window.app || {};
    /**
     * @type {object} A collection of utility functions.
     */
    var utils = app.utils = app.utils || {};

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

    /**
     * A case insensitive and numeric aware compare. (using 'en' Collator)
     * 
     * @param {string} x The first string to compare.
     * @param {string} y The second string to compare.
     * @returns {number} -1 if the first string is less than the second string; 1 if
     *  the first string is greater than the second string; otherwise 0 if the strings are "equal"
     */
    utils.compare = new Intl.Collator('en', {
        sensitivity: 'base',
        numeric: true
    }).compare;

    /**
     * Escapes the HTML string by replace the '<' and '>' characters.
     * 
     * @param {string} html The HTML string to escape.
     * @returns {string} The escaped HTML string.
     */
    utils.escapeHtml = function (html) {
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
    utils.guid = function () {
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
    utils.indexBy = function (arr, key, val) {
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
    utils.findBy = function (arr, key, val) {
        var idx = utils.indexBy(arr, key, val);

        if (idx === -1) return null;

        return arr[idx];
    };
}(window));