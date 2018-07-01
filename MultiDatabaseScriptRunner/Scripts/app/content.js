/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Content
 */
(function (window) {
    var $content = $('.content');

    $(function () {
        // Toggle collapse on navbar's sidebar toggle click
        app.on('navbar-sidebar-toggled', function (sidebarCollapsed) {
            $content.addClass('animating').toggleClass('full');

            if (!sidebarCollapsed) {
                $content.removeClass('animating');
            }
        });

        app.on('sidebar-slider-dragged', function (left) {
            $content.css('margin-left', (left + 6) + 'px'); // eslint-disable-line no-extra-parens
        });
    });


    /** Content toolbar **/
    $(function () {
        var $toolbar = $('.content-toolbar', $content);

        /** Execute button **/
        var $executeBtn = $('.execute-btn', $toolbar);

        $executeBtn.click(function () {
            var $activePane = $('.code-panes .tab-pane.active', $content);

            if ($activePane.length) {
                var editor = $('.CodeMirror', $activePane)[0].CodeMirror;
                var sql = editor.getSelection();

                if (!sql) sql = editor.getValue();
                sql = (sql || '').trim();

                if (sql && sql.trim() !== '') {
                    if (app.currentConnection) {
                        var dbs = (app.currentConnection.dbs || []).filter(d => d.checked);

                        if (dbs.length) {
                            $('.result-subpane', $activePane).empty();
                            $executeBtn.prop('disabled', true);
                            var batchId = $activePane.attr('id');

                            app.emit('execute-sql', batchId);
                            scriptEvent.emit('execute-sql', app.currentConnection.raw, dbs.map(db => db.name), sql, batchId);
                        }
                    }
                }
            }
        });

        systemEvent.on('sql-execute-begin', function (batchId, db) {
            var $pane = $('#' + batchId);
            var pending = $pane.data('pending-job');
            if (pending) {
                pending++;
            } else {
                pending = 1;
            }

            $pane.data('pending-job', pending);

            if ($('.code-panes .tab-pane.active', $content).attr('id') === batchId) {
                $executeBtn.prop('disabled', true);
            }
        });
        systemEvent.on('sql-execute-result', function (batchId, db, result) {
            var $pane = $('#' + batchId);
            var $resultPane = $('.result-subpane', $pane);

            var $dbTable = $('#' + db, $resultPane);
            if ($dbTable.length === 0) {
                $resultPane.append(`<div id="${db}">${db}</div>`);
                $dbTable = $('#' + db, $resultPane);
            }
            if (result && result.length) {
                var $table = $('<table class="result-set" border="1"><thead></thead><tbody></tbody></table>');
                var keys = Object.keys(result[0]);

                $('thead', $table).append(keys.map(function (k) {
                    return '<th>' + k + '</th>';
                }).join());

                $('tbody', $table).append(result.map(function (row) {
                    return '<tr>' + keys.map(function (k) {
                        if (row[k] === null) {
                            return '<td class="null">NULL</td>';
                        } else {
                            return '<td>' + utils.escapeHtml(row[k]) + '</td>';
                        }
                    }).join() + '</tr>';
                }).join());

                $dbTable.append($table);
            }
        });
        systemEvent.on('sql-execute-complete', function (batchId, db) {
            var $pane = $('#' + batchId);
            var pending = $pane.data('pending-job');
            if (pending) {
                pending--;
            } else {
                pending = 0;
            }

            $pane.data('pending-job', pending);

            if (pending === 0 && $('.code-panes .tab-pane.active', $content).attr('id') === batchId) {
                $executeBtn.prop('disabled', false);
            }
        });
    });

    /** Content tabs **/
    $(function () {
        var $codeTabs = $('.code-tabs');
        var $codeTabsContent = $('.code-panes');
        var $plusTab = $('.plus-tab', $codeTabs);

        $plusTab.click(function () {
            newEditor('New *', 'editor' + utils.guid());

        }).click();
    });

    function newEditor(name, id) {
        var $codeTabs = $('.code-tabs');
        var $codeTabsContent = $('.code-panes');
        var $plusTab = $('.plus-tab', $codeTabs);

        var $tab = $(`<li class="nav-item">
                   <a class="nav-link" id="${id}-tab" data-toggle="tab" href="#${id}" role="tab" aria-controls="${id}" aria-selected="false">${name} <i class="fa fa-times" aria-hidden="true"></i></a>
               </li>`);

        var $tabContent = $(`<div class="tab-pane fade" id="${id}" role="tabpanel" aria-labelledby="${id}-tab">
                    <div class="editor-subpane"></div>
                    <div class="result-slider">
                        <div></div>
                    </div>
                    <div class="result-subpane"></div>
                </div>`);

        $('i', $tab).click(function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            // Get adjacent tabs
            var $prev = $tab.prev('.nav-item');
            var $next = $tab.next('.nav-item');

            $tab.tab('dispose');
            $tab.remove();
            $tabContent.remove();

            if ($('a', $tab).hasClass('active')) {
                if ($('.nav-item', $codeTabs).length === 1) {
                    // There's no tabs left. Add a blank tab
                    $plusTab.click();
                } else {
                    // Show the previous tab; or if first tab then show next to the right.
                    if ($prev.length) {
                        $('a', $prev).click();
                    } else {
                        $('a', $next).click();
                    }
                }
            }
        });

        $tab.insertBefore($('.nav-item:last', $codeTabs));
        $tabContent.insertBefore($('.tab-pane:last', $codeTabsContent));

        var mime = 'text/x-sql';
        var theme = 'twilight';

        var editor = CodeMirror($('.editor-subpane', $tabContent)[0], {
            mode: mime,
            indentWithTabs: true,
            smartIndent: true,
            lineNumbers: true,
            matchBrackets: true,
            autofocus: true,
            theme: theme
        });
        $('a', $tab).click();


        /** result slider **/
        (function () {
            var $dynoStyle = $('<style/>');
            $dynoStyle.appendTo($tabContent);
            $resultSlider = $('.result-slider', $tabContent);

            $resultSlider.draggable({
                axis: 'y',
                containment: 'parent',
                drag: function (event, ui) {
                    // Current top (position: absolute)
                    // Includes navbar (56px), toolbar (53.5), tabs (42px) = total (151.5px)
                    var top = Math.floor(ui.offset.top);
                    // Constrain movement (minimium is 150 height for editor subpane)
                    if (top < 300) return false;

                    // Result subpane does not include navbar (top - navbar + slider)

                    // Result slider is 10px 2 x (border 2px + padding 3px)
                    // Only partially hide it
                    $dynoStyle.html(`#${id} .editor-subpane {
                            height: ${top - 151}px;
                        }
                        #${id} .result-subpane {
                            margin-top: ${top - 56 + 9}px;
                        }`);

                    editor.setSize('100%', `${top - 151}px`);
                }
            });
        })();
    }
}(window));