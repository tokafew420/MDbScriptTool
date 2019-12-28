// Adapted from CodeMirror's dialog.js addon, found in CodeMirror/addon/dialog/dialog.js
// and CodeMirror's search.js addon, found in CodeMirror/search/search.js

// Open a search dialog on the top right of the editor. Relies on searchcursor addon and cm-search.css.

(function (mod) {
    if (typeof exports === 'object' && typeof module === 'object') // CommonJS
        mod(require('codemirror'), require('./searchcursor'));
    else if (typeof define === 'function' && define.amd) // AMD
        define(['codemirror', './searchcursor'], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function (CodeMirror) {
    'use strict';

    /**
     * Create the regex search query.
     * 
     * @param {string|RegExp} query The search query.
     * @param {boolean} caseSensitive Whether the query is case sensitive.
     * @returns {RegExp} The query as a RegExp.
     */
    function createQuery(query, caseSensitive) {
        if (query) {
            if (typeof query === 'string')
                query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
            else if (query instanceof RegExp)
                query = new RegExp(query.source, caseSensitive ? 'g' : 'gi');
        }

        return query;
    }

    /**
     * Adds the overlay (highlight) to the matches found
     * 
     * @param {object} state The state object
     * @returns {object} A cm tokenization function.
     */
    function searchOverlay(state) {
        var query = createQuery(state.query, state.caseSensitive);

        return {
            token: function (stream) {
                query.lastIndex = stream.pos;
                var match = query.exec(stream.string);
                if (match && match.index === stream.pos) {
                    stream.pos += match[0].length || 1;
                    return 'searching'; // The class
                } else if (match) {
                    stream.pos = match.index;
                } else {
                    stream.skipToEnd();
                }
            }
        };
    }

    /**
     * Init the search state.
     */
    function searchState() {
        this.posFrom = this.posTo = null;
        this.lastQuery = this.query = this.replaceText = this.queryText = null;
        this.dialog = this.overlay = null;
        this.caseSensitive = this.regex = this.opened = this.matches = null;
    }

    /**
     * Get the search state.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     * @returns {object} The search state.
     */
    function getSearchState(cm) {
        return cm.state.search || (cm.state.search = new searchState());
    }

    /**
     * Get a search cursor instance.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     * @param {string|RegExp} query The search query.
     * @param {boolean} caseSensitive Whether the query is case sensitive.
     * @param {any} pos The current cursor position.
     * @returns {SearchCursor} A SearchCursor instance.
     */
    function getSearchCursor(cm, query, caseSensitive, pos) {
        return cm.getSearchCursor(query, pos, { caseFold: !caseSensitive, multiline: true });
    }

    /**
     * Handles the keydown event on the search/replace inputs.
     * 
     * @param {Event} event The keydown event.
     * @param {CodeMirror} cm The CodeMirror instance.
     * @returns {boolean} true if no additional action should be taken.
     */
    function onInputKeyDown(event, cm) {
        var state = getSearchState(cm);
        var keyName = CodeMirror.keyName(event);
        var extra = cm.getOption('extraKeys');
        // eslint-disable-next-line no-extra-parens
        var cmd = (extra && extra[keyName]) || CodeMirror.keyMap[cm.getOption('keyMap')][keyName];

        if (event.keyCode === 27) { // Close on ESC
            event.target.blur();
            CodeMirror.e_stop(event);
            closeDialog(cm);
            return true;
        } else if (cmd === 'find' && state.replace) {
            CodeMirror.e_stop(event);
            doSearch(cm);
        } else if (cmd === 'findNext' || cmd === 'findPrev') {
            CodeMirror.e_stop(event);
            startSearch(cm, state, event.target.value);
            cm.execCommand(cmd);
        } else if (cmd === 'replace' && !state.replace) {
            CodeMirror.e_stop(event);
            doReplace(cm);
        }
    }

    /**
     * Handles events when the search input changes.
     *
     * @param {Event} event The event.
     * @param {CodeMirror} cm The CodeMirror instance.
     * @param {string} query The new query.
     */
    function onSearchInputChange(event, cm, query) {
        var state = getSearchState(cm);
        if (query !== state.queryText) {
            // Start search immediately when search text changes
            startSearch(cm, state, query);

            var keyName = CodeMirror.keyName(event);
            var extra = cm.getOption('extraKeys');
            // eslint-disable-next-line no-extra-parens
            var cmd = (extra && extra[keyName]) || CodeMirror.keyMap[cm.getOption('keyMap')][keyName];

            // Don't move to next result when opening the dialog
            if (cmd !== 'find') {
                // Since we are searching a new string, start from the beginning of the
                // previously matched text
                state.posTo = state.posFrom;
                findNext(cm, false);
            }
        }
    }

    /**
     * Creates/shows the search/replace dialog.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     * @param {boolean} replace Whether to show the replace controls.
     * @param {string} query The search query.
     */
    function createDialog(cm, replace, query) {
        let wrapper = cm.getWrapperElement();
        let state = getSearchState(cm);
        let dialog = state.dialog;
        let searchInput;

        // First time, create the dialog 
        if (!dialog) {
            dialog = state.dialog = document.createElement('div');

            dialog.className = 'cm-search-dialog';

            dialog.innerHTML = '<button type="button" class="btn btn-sm close-btn" data-toggle="tooltip" title="Close" tabindex="9"><i class="fa fa-times" aria-hidden="true"></i></button>' +
                '<div class="find-row">' +
                '    <div class="input-wrapper">' +
                '        <div class="input-group input-group-sm clearable">' +
                '          <input type="search" class="form-control" placeholder="Search" tabindex="1" spellcheck="false">' +
                '          <div class="input-group-append">' +
                '            <button class="btn btn-secondary clear-search-btn" type="button">' +
                '              <i class="fa fa-remove"></i>' +
                '            </button>' +
                '          </div>' +
                '        </div>' +
                '    </div>' +
                '    <div class="btn-group" role="group" aria-label="Find Actions">' +
                '        <button type="button" class="btn btn-sm find-prev-btn" data-toggle="tooltip" title="Find Previous (Shift-F3)" tabindex="3"><i class="fa fa-arrow-left fa-fw" aria-hidden="true"></i></button>' +
                '        <button type="button" class="btn btn-sm find-next-btn" data-toggle="tooltip" title="Find Next (F3)" tabindex="4"><i class="fa fa-arrow-right fa-fw" aria-hidden="true"></i></button>' +
                '    </div>' +
                '</div>' +
                '<div class="replace-row">' +
                '    <div class="input-wrapper">' +
                '        <div class="input-group input-group-sm clearable">' +
                '            <input type="text" class="form-control replace-input" placeholder="Replace With..." tabindex="2" spellcheck="false">' +
                '            <div class="input-group-append">' +
                '                <button class="btn btn-secondary clear-replace-btn" type="button">' +
                '                  <i class="fa fa-remove"></i>' +
                '                </button>' +
                '            </div>' +
                '        </div>' +
                '    </div>' +
                '    <div class="btn-group" role="group" aria-label="Replace Actions">' +
                '        <button type="button" class="btn btn-sm replace-next-btn" data-toggle="tooltip" title="Replace" tabindex="5"><i class="fa fa-reply fa-flip-horizontal fa-fw" aria-hidden="true"></i></button>' +
                '        <button type="button" class="btn btn-sm replace-all-btn" data-toggle="tooltip" title="Replace All" tabindex="6"><i class="fa fa-reply-all fa-flip-horizontal fa-fw" aria-hidden="true"></i></button>' +
                '    </div>' +
                '</div>' +
                '<div class="options-row">' +
                '    <div class="btn-group" role="group" aria-label="Search Options">' +
                '        <button type="button" class="btn btn-sm case-sensitive-btn ' + (state.caseSensitive ? 'active' : '') + '" data-toggle="tooltip" title="Case Sensitive" tabindex="7"><i class="fa fa-font fa-fw" aria-hidden="true"></i></button>' +
                '        <button type="button" class="btn btn-sm regex-btn ' + (state.regex ? 'active' : '') + '" data-toggle="tooltip" title="Regex" tabindex="8"><i class="fa fa-code fa-fw" aria-hidden="true"></i></button>' +
                '    </div>' +
                '    <div class="search-message">' +
                '    </div>' +
                '</div>' +
                '<div class="resize-handle"></div>';

            wrapper.appendChild(dialog);

            // Close dialog on ESC
            CodeMirror.on(wrapper, 'keydown', function (e) {
                if (e.keyCode === 27) closeDialog(cm);
            });

            let closeBtn = dialog.getElementsByClassName('close-btn')[0];
            if (closeBtn) {
                // Close dialog on click
                CodeMirror.on(closeBtn, 'click', function () {
                    closeDialog(cm);
                    cm.focus();
                });
                // Cycle tabs
                CodeMirror.on(closeBtn, 'keydown', function (e) {
                    if (e.keyCode === 9 && !e.shiftKey && searchInput) {
                        CodeMirror.e_stop(e);
                        searchInput.focus();
                    }
                });
            }

            searchInput = state.dialog.getElementsByTagName('input')[0];
            CodeMirror.on(searchInput, 'keyup', function (e) { onSearchInputChange(e, cm, searchInput.value); });
            CodeMirror.on(searchInput, 'input', function (e) { onSearchInputChange(e, cm, searchInput.value); });
            CodeMirror.on(searchInput, 'keydown', function (e) {
                if (onInputKeyDown(e, cm, searchInput)) { return; }
                // Find next on Enter
                if (e.keyCode === 13) return findNext(cm, false);
                // Cycle tabs
                if (e.keyCode === 9 && e.shiftKey && closeBtn) {
                    CodeMirror.e_stop(e);
                    closeBtn.focus();
                }
            });

            let clearSearchBtn = dialog.getElementsByClassName('clear-search-btn')[0];
            if (clearSearchBtn) {
                CodeMirror.on(clearSearchBtn, 'click', function () {
                    clearSearch(cm);
                    clearSearchBtn.focus();
                });
            }

            let findNextBtn = dialog.getElementsByClassName('find-next-btn')[0];
            if (findNextBtn) {
                CodeMirror.on(findNextBtn, 'click', function () {
                    findNext(cm, false);
                });
            }

            let findPrevBtn = dialog.getElementsByClassName('find-prev-btn')[0];
            if (findPrevBtn) {
                CodeMirror.on(findPrevBtn, 'click', function () {
                    findNext(cm, true);
                });
            }

            let replaceInput = dialog.getElementsByClassName('replace-input')[0];
            if (replaceInput) {
                CodeMirror.on(replaceInput, 'keydown', function (e) {
                    if (onInputKeyDown(e, cm, replaceInput)) { return; }
                    // Replace next on enter
                    if (e.keyCode === 13) replaceNext(cm);
                });
                // Set state on input change
                CodeMirror.on(replaceInput, 'keyup', function (e) {
                    state.replaceText = replaceInput.value;
                });
                CodeMirror.on(replaceInput, 'input', function (e) {
                    state.replaceText = replaceInput.value;
                });
            }

            let clearReplaceBtn = dialog.getElementsByClassName('clear-search-btn')[0];
            if (clearReplaceBtn) {
                CodeMirror.on(clearReplaceBtn, 'click', function () {
                    clearReplaceBtn.focus();
                });
            }

            let replaceNextBtn = dialog.getElementsByClassName('replace-next-btn')[0];
            if (replaceNextBtn) {
                CodeMirror.on(replaceNextBtn, 'click', function () {
                    replaceNext(cm);
                });
            }

            let replaceAllBtn = dialog.getElementsByClassName('replace-all-btn')[0];
            if (replaceAllBtn) {
                CodeMirror.on(replaceAllBtn, 'click', function () {
                    replaceAll(cm);
                });
            }

            let caseSensitiveBtn = dialog.getElementsByClassName('case-sensitive-btn')[0];
            if (caseSensitiveBtn) {
                CodeMirror.on(caseSensitiveBtn, 'click', function () {
                    // eslint-disable-next-line no-cond-assign
                    if (state.caseSensitive = !state.caseSensitive) {
                        CodeMirror.addClass(caseSensitiveBtn, 'active');
                    } else {
                        CodeMirror.rmClass(caseSensitiveBtn, 'active');
                    }
                    if (state.queryText) {
                        startSearch(cm, state, state.queryText);
                    }
                });
            }

            let regexBtn = dialog.getElementsByClassName('regex-btn')[0];
            if (regexBtn) {
                CodeMirror.on(regexBtn, 'click', function () {
                    // eslint-disable-next-line no-cond-assign
                    if (state.regex = !state.regex) {
                        CodeMirror.addClass(regexBtn, 'active');
                    } else {
                        CodeMirror.rmClass(regexBtn, 'active');
                    }
                    if (state.queryText) {
                        startSearch(cm, state, state.queryText);
                    }
                });
            }

            let resizeHandle = dialog.getElementsByClassName('resize-handle')[0];
            let dragstart = false, initWidth, initX;
            if (resizeHandle) {
                CodeMirror.on(resizeHandle, 'mousedown', function (e) {
                    dragstart = true;
                    initWidth = dialog.offsetWidth;
                    initX = e.x;
                });
                CodeMirror.on(wrapper, 'mousemove', function (e) {
                    if (dragstart) {
                        CodeMirror.e_stop(e);
                        var width = initWidth + (initX - e.x);
                        dialog.style.width = width + 'px';
                    }
                });
                CodeMirror.on(wrapper, 'mouseup', function (e) {
                    if (dragstart) {
                        CodeMirror.e_stop(e);
                        dragstart = false;
                    }
                });
                CodeMirror.on(wrapper, 'mouseout', function (e) {
                    if (wrapper.contains(e.toElement)) return;
                    if (dragstart) {
                        CodeMirror.e_stop(e);
                        dragstart = false;
                    }
                });
            }

            cm.on('change', function () {
                updateMessage(cm);
            });

            // TODO: This should not be here. Move out of CM mod
            $('button', dialog).tooltip({
                boundary: 'window',
                tigger: 'hover'
            }).on('mouseleave click', function () {
                $(this).tooltip('hide');
            });
        } else {
            searchInput = state.dialog.getElementsByTagName('input')[0];
        }

        wrapper.appendChild(state.dialog);
        CodeMirror.addClass(wrapper, 'cm-search-opened');
        state.opened = true;
        if (replace) {
            CodeMirror.addClass(dialog, 'cm-search-replace');
        } else {
            CodeMirror.rmClass(dialog, 'cm-search-replace');
        }
        if (query) {
            searchInput.value = query;
            searchInput.select();
        }
        searchInput.focus();

        return;
    }

    /**
     * Close the search/replace dialog
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     */
    function closeDialog(cm) {
        var state = getSearchState(cm);
        if (state.opened) {
            state.opened = false;
            CodeMirror.rmClass(state.dialog.parentNode, 'cm-search-opened');
            state.dialog.parentNode.removeChild(state.dialog);
            clearSearch(cm);
            cm.focus();
        }
    }

    /**
     * Change simple regex to patterns to string
     * 
     * @param {string} string The string to parse.
     * @returns {string} The parsed string.
     */
    function parseString(string) {
        return (string || '').replace(/\\([nrt\\])/g, function (match, ch) {
            if (ch === 'n') return '\n';
            if (ch === 'r') return '\r';
            if (ch === 't') return '\t';
            if (ch === '\\') return '\\';
            return match;
        });
    }

    /**
     * Parse the query.
     * 
     * @param {object} state The current state object.
     * @param {string} query The query text.
     * @returns {string|RegExp} The parsed query.
     */
    function parseQuery(state, query) {
        if (state.regex) {
            try { query = new RegExp(query, state.caseSensitive ? '' : 'i'); }
            catch (e) {
                // Not a regular expression after all, do a string search
            }
        } else {
            query = parseString(query);
        }
        if (typeof query === 'string' ? query === '' : query.test(''))
            query = /x^/;   // Denotes a null query.
        return query;
    }

    /**
     * Do the search for the query on the current CM instance
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     * @param {object} state The current state object
     * @param {string} query The current query string.
     */
    function startSearch(cm, state, query) {
        state.queryText = query;
        state.query = parseQuery(state, query);
        cm.removeOverlay(state.overlay, !state.caseSensitive);
        if (!(state.query instanceof RegExp && state.query.source === 'x^')) {
            state.overlay = searchOverlay(state);
            cm.addOverlay(state.overlay);
        }

        updateMessage(cm);

        if (cm.showMatchesOnScrollbar) {
            if (state.annotate) { state.annotate.clear(); state.annotate = null; }
            state.annotate = cm.showMatchesOnScrollbar(state.query, !state.caseSensitive);
        }
    }

    /**
     * Update the dialog message with the number of matches found.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     */
    function updateMessage(cm) {
        let state = getSearchState(cm);
        let query = createQuery(state.query, state.caseSensitive);
        let searchMsg = state.dialog.getElementsByClassName('search-message')[0];

        if (searchMsg) {
            if (query && query.source && query.source !== 'x^') {
                state.matches = cm.getValue().match(query) || [];
                if (state.matches.length) {
                    CodeMirror.rmClass(searchMsg, 'no-match');
                    searchMsg.innerHTML = `<strong>${state.matches.length}</strong> matches`;
                } else {
                    CodeMirror.addClass(searchMsg, 'no-match');
                    searchMsg.innerHTML = 'No match found';
                }
            } else {
                state.matches = null;
                CodeMirror.rmClass(searchMsg, 'no-match');
                searchMsg.innerHTML = '';
            }
        }
    }

    /**
     * Open the search dialog.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     */
    function doSearch(cm) {
        var state = getSearchState(cm);

        var q = cm.getSelection() || state.lastQuery;
        if (q instanceof RegExp && q.source === 'x^') q = null;

        // Change opacity if match is behind the dialog
        //if (to.line < 3 && document.querySelector &&
        //    (dialog = cm.display.wrapper.querySelector('.CodeMirror-dialog')) &&
        //    dialog.getBoundingClientRect().bottom - 4 > cm.cursorCoords(to, 'window').top)
        //    (hiding = dialog).style.opacity = .4;

        state.replace = false;
        createDialog(cm, false, q);
        CodeMirror.e_stop(event);
        if (q) {
            startSearch(cm, state, q);
            state.posFrom = state.posTo = cm.getCursor();
        }
    }

    /**
     * Find the next occurrence of the query.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     * @param {boolean} rev Whether to find the previous occurrence.
     * @param {function} callback The callback function.
     */
    function findNext(cm, rev, callback) {
        var state = getSearchState(cm);
        if (state.queryText) {
            cm.operation(function () {
                var cursor = getSearchCursor(cm, state.query, state.caseSensitive, rev ? state.posFrom : state.posTo);
                if (!cursor.find(rev)) {
                    cursor = getSearchCursor(cm, state.query, state.caseSensitive, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
                    if (!cursor.find(rev)) return;
                }
                cm.setSelection(cursor.from(), cursor.to());
                cm.scrollIntoView({ from: cursor.from(), to: cursor.to() }, 20);
                state.posFrom = cursor.from();
                state.posTo = cursor.to();
                if (callback) callback(cursor.from(), cursor.to());
            });
        }
    }

    /**
     * Find the previous occurrence of the query.
     *
     * @param {CodeMirror} cm The CodeMirror instance.
     * @param {function} callback The callback function.
     */
    function findPrev(cm, callback) {
        findNext(cm, true, callback);
    }

    /**
     * Clear the current search.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     */
    function clearSearch(cm) {
        cm.operation(function () {
            var state = getSearchState(cm);
            state.lastQuery = state.queryText;
            if (!state.query) return;
            state.matches = state.query = state.queryText = null;
            cm.removeOverlay(state.overlay);
            if (state.annotate) { state.annotate.clear(); state.annotate = null; }
        });
        updateMessage(cm);
    }

    /**
     * Open the replace dialog.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     */
    function doReplace(cm) {
        if (cm.getOption('readOnly')) return;   // If in read only mode then do nothing
        var state = getSearchState(cm);
        var q = cm.getSelection() || state.lastQuery;

        if (q instanceof RegExp && q.source === 'x^') q = null;

        state.replace = true;
        createDialog(cm, true, q);
    }

    /**
     * Replace the next occurrence.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     */
    function replaceNext(cm) {
        var state = getSearchState(cm);
        if (state.query) {
            var query = state.query;
            var replaceText = state.replaceText || '';
            var cursor = getSearchCursor(cm, query, state.caseSensitive, cm.getCursor('from'));
            var advance = function () {
                var start = cursor.pos.from, match;
                if (!(match = cursor.findNext())) {
                    // If at end of doc then start from beginning
                    cursor = getSearchCursor(cm, query, state.caseSensitive);
                    if (!(match = cursor.findNext())) return;
                }
                cm.setSelection(cursor.from(), cursor.to());
                cm.scrollIntoView({ from: cursor.from(), to: cursor.to() }, 20);

                // Only replace when at occurrence, otherwise just scroll into view
                if (cursor.from().line === start.line && cursor.from().ch === start.ch) {
                    doReplace(match);
                }
            };
            var doReplace = function (match) {
                cursor.replace(typeof query === 'string' ? replaceText :
                    replaceText.replace(/\$(\d)/g, function (_, i) { return match[i]; }));
                updateMessage(cm);
                advance();
            };
            advance();
        }
    }

    /**
     * Replace all occurrences.
     * 
     * @param {CodeMirror} cm The CodeMirror instance.
     */
    function replaceAll(cm) {
        var state = getSearchState(cm);
        if (state.query) {
            var query = state.query;
            var replaceText = state.replaceText || '';
            cm.operation(function () {
                for (var cursor = getSearchCursor(cm, query, state.caseSensitive); cursor.findNext();) {
                    if (typeof query !== 'string') {
                        var match = cm.getRange(cursor.from(), cursor.to()).match(query);
                        cursor.replace(replaceText.replace(/\$(\d)/g, function (_, i) { return match[i]; }));
                    } else cursor.replace(replaceText);
                }
            });
            updateMessage(cm);
        }
    }

    CodeMirror.commands.find = doSearch;
    CodeMirror.commands.findNext = findNext;
    CodeMirror.commands.findPrev = findPrev;
    CodeMirror.commands.clearSearch = clearSearch;
    CodeMirror.commands.replace = doReplace;
    CodeMirror.commands.replaceNext = replaceNext;
    CodeMirror.commands.replaceAll = replaceAll;
});
