/// <reference path="app.js" />

/**
 * Result pane in each instance
 */
(function (window, app, os, $) {
    // Formats a SQLError to show only relevant information.
    function formatSqlError(errs) {
        return errs.map(function (e) {
            var msg1 = [];
            var msg = [];
            if (typeof e.Class === 'number') msg1.push('Class: ' + e.Class); // Severity level 
            if (e.Number) msg1.push('Number: ' + e.Number);  // Ignore 0
            if (e.State) msg1.push('State: ' + e.State); // Ignore 0

            if (msg1.length) {
                msg.push(msg1.join(' '));
            }

            if (typeof e.LineNumber === 'number') msg.push('Line number: ' + e.LineNumber);
            if (e.Procedure) msg.push('Procedure: ' + e.Procedure);
            if (e.Message) msg.push(e.Message);

            return msg.join('\n');
        });
    }

    var noose = new Noose({
        classes: {
            noose: 'noose',
            selected: false
        },
        compute: false,
        ctrl: false,
        select: 'th,td',
        stop: function (e, coors, selected) {
            if (app.instance) {
                let $resultset = $(this.currentTarget);
                let resultset = $resultset.data('result');

                if (resultset) {
                    this.compute();
                    selected = this.selected;

                    if (selected && selected.length) {
                        if (!resultset.selected) {
                            resultset.selected = {
                                type: '',
                                set: []
                            };
                        }

                        let $first = $(selected[0]);
                        let selectMap = resultset.selected;

                        if ($first.is('th.column-header.row-number')) {
                            selectMap.type = selectMap.type === 'table' ? '' : 'table';

                            $('.selected', $resultset).removeClass('selected');
                            $('tbody', $resultset).toggleClass('selected', selectMap.type === 'table');
                        } else {
                            if (!e.ctrlKey) {
                                selectMap = resultset.selected = {
                                    type: '',
                                    set: []
                                };
                            }

                            if ($first.is('th.column-header')) {
                                if (selectMap.type !== 'column') {
                                    selectMap.type = 'column';
                                    selectMap.set = [];
                                    $('.selected', $resultset).removeClass('selected');
                                }

                                $(selected).filter('th.column-header').each(function () {
                                    let $th = $(this);
                                    let idx = +$th.attr('data-idx');
                                    let mapIdx = selectMap.set.indexOf(idx);

                                    // +2 to account for row number column
                                    if (mapIdx === -1) {
                                        $('tbody td:nth-child(' + (idx + 2) + ')', $resultset).addClass('selected');
                                        selectMap.set.push(idx);
                                    } else {
                                        $('tbody td:nth-child(' + (idx + 2) + ')', $resultset).removeClass('selected');
                                        selectMap.set.splice(mapIdx, 1);
                                    }
                                });
                            } else if ($first.is('th.row-number')) {
                                if (selectMap.type !== 'row') {
                                    selectMap.type = 'row';
                                    selectMap.set = [];
                                    $('.selected', $resultset).removeClass('selected');
                                }

                                $(selected).filter('th.row-number').each(function () {
                                    let $th = $(this);
                                    let idx = +$th.parent().attr('data-idx');
                                    let mapIdx = selectMap.set.indexOf(idx);

                                    if (mapIdx === -1) {
                                        $th.addClass('selected');
                                        selectMap.set.push(idx);
                                    } else {
                                        $th.removeClass('selected');
                                        selectMap.set.splice(mapIdx, 1);
                                    }
                                });
                            } else {
                                if (selectMap.type !== 'cell') {
                                    selectMap.type = 'cell';
                                    selectMap.set = [];
                                    $('.selected', $resultset).removeClass('selected');
                                }

                                $(selected).each(function () {
                                    let $td = $(this);
                                    let $row = $td.parent();
                                    let cIdx = $('td', $row).index($td);
                                    let rIdx = +$row.attr('data-idx');
                                    let id = `${rIdx},${cIdx}`;
                                    let mapIdx = selectMap.set.indexOf(id);

                                    if (mapIdx === -1) {
                                        $td.addClass('selected');
                                        selectMap.set.push(id);
                                    } else {
                                        $td.removeClass('selected');
                                        selectMap.set.splice(mapIdx, 1);
                                    }
                                });
                            }

                            selectMap.set.sort(app.compare);
                        }
                    } else {
                        $('.selected', $resultset).removeClass('selected');
                    }
                }
            }
        }
    });
    noose.containers.forEach(function (container) { noose.deregister(container); });

    app.on('parse-sql', function (instance, connection, sql) {
        if (instance && instance.$result) {
            $('.result-set', instance.$result).each(function () {
                noose.deregister(this);
            });

            instance.$result.empty();
        }
    }).on('sql-parsed', function (instance, err, errors) {
        if (instance && instance.$result) {
            instance.$result.append(`<div id="${instance.id}-parse-result" class="parse-result"><div class="result-sets-header">Parse Result</div></div>`);

            var $msg = $('.parse-result', instance.$result);

            if (err) {
                if (err.Errors && err.Errors.length) {
                    $msg.append(`<div class="result-text"><pre class="text-danger">${formatSqlError(err.Errors).join('\n\n')}</pre></div>`);
                } else {
                    $msg.append(`<div class="result-text text-danger">${err.Message}</div>`);
                }
            } else if (errors && errors.length) {
                $msg.append(`<div class="result-text"><pre class="text-danger">${formatSqlError(errors).join('\n\n')}</pre></div>`);
            } else {
                $msg.append('<div class="result-text">Command(s) completed successfully</div>');
            }

            app.emit('update-content-status', '');
        }
    });

    app.on('execute-sql', function (instance, connection, dbs, sql) {
        if (instance && instance.$result) {
            $('.result-set', instance.$result).each(function () {
                noose.deregister(this);
            });

            instance.$result.empty();
        }
    }).on('sql-executed-db-batch', function (instance, err, db, result) {
        if (instance && instance.$result && db && db.id) {
            var $dbTable = $('#r' + db.id, instance.$result);
            if ($dbTable.length === 0) {
                var exportBtn = `<a href="#" class="export-btn d-none" data-toggle="tooltip" title="Export Database Results"><i class="fa fa-download"></i></a>`;
                instance.$result.append(`<div id="r${db.id}" class="result-sets-container" tabindex="0"><div class="result-sets-header"><div class="header-text mr-2"><span class="db-name">${db.label || db.name}</span><span class="result-sets-meta"></span></div>${exportBtn}</div></div>`);
                $dbTable = $('#r' + db.id, instance.$result);

                $('.export-btn', instance.$result).tooltip();
            }

            if (err) {
                if (err.Errors && err.Errors.length) {
                    $dbTable.append(`<div class="result-text error" tabindex="0"><pre class="text-danger">${formatSqlError(err.Errors).join('\n\n')}</pre></div>`);
                } else {
                    $dbTable.append(`<div class="result-text error text-danger" tabindex="0">${err.Message}</div>`);
                }
            } else if (result && result.length && result[0].length) {
                $('.export-btn', instance.$result).removeClass('d-none');
                var $table = $('<div class="result-set" tabindex="0"><table class="table table-sm table-striped table-hover table-dark table-bordered"><thead><tr><th class="column-header row-number" data-idx="-1"></th></tr></thead><tbody></tbody></table></div>');
                $table.data('result', result);

                $('thead tr', $table).append(result[0].map(function (columnName, idx) {
                    if (columnName) {
                        return '<th class="column-header" data-idx="' + idx + '">' + columnName + '</th>';
                    } else {
                        return '<th class="column-header unnamed" data-idx="' + idx + '">(No Name)</th>';
                    }
                }).join(''));

                $dbTable.append($table);

                if (result.length > 1) {
                    var vTable = new VirtualTable(instance, $table, result);
                    $table.data('virtual-table', vTable);

                    noose.register($table[0]);
                }
                // Key maps
                app.mapKeys($table, 'Ctrl-C', function (e) {
                    var $this = $(e.target);
                    var result = $this.data('result');

                    if (result && result.selected) {
                        var selectedData = app.getSelectedResults(result, result.selected);

                        app.copyToClipboard(app.resultToText(selectedData));
                    }
                });
            } else {
                let $successText = $('.result-text.success', $dbTable);
                if ($successText.length) {
                    let successCt = +$successText.attr('data-count');
                    $successText.attr('data-count', ++successCt);
                    $successText.html(`<strong>${successCt}</strong> Commands completed successfully`);
                } else {
                    $dbTable.append('<div class="result-text success" tabindex="0" data-count="1"><strong>1</strong> Command completed successfully</div>');
                }
            }

            var meta = instance.results[db.id] || {};
            var metas = [''];
            if (meta) {
                if (meta.totalRows !== null && meta.totalRows >= 0) {
                    metas.push(`Total Rows: <strong>${meta.totalRows}</strong>`);
                }
                if (meta.affectedRows !== null && meta.affectedRows >= 0) {
                    metas.push(`Rows Affected: <strong>${meta.affectedRows}</strong>`);
                }
                metas.push(`Time: <strong>${app.msToTime(meta.time)}</strong>`);
            }
            $('.result-sets-meta', $dbTable).html(metas.join(' - '));

            app.updateStatusBarForInstance(instance);
        }
    }).on('execute-sql-db-complete', function (instance, err, db) {
        if (err) {
            if (instance && instance.$result && db && db.id) {
                var $dbTable = $('#r' + db.id, instance.$result);
                if ($dbTable.length === 0) {
                    instance.$result.append(`<div id="r${db.id}" class="result-sets-container" tabindex="0"><div class="result-sets-header"><span class="db-name">${db.label || db.name}</span></div></div>`);
                    $dbTable = $('#r' + db.id, instance.$result);
                }

                if (err.Errors && err.Errors.length) {
                    $dbTable.append(`<div class="result-text" tabindex="0"><pre class="text-danger">${formatSqlError(err.Errors).join('\n\n')}</pre></div>`);
                } else {
                    $dbTable.append(`<div class="result-text text-danger" tabindex="0">${err.Message}</div>`);
                }
            }
        }
    }).on('sql-executed', function (instance, err) {
        if (instance && instance.$result) {
            app.redraw();
        }
    }).on('instance-slider-moved', function (instance) {
        if (instance && instance.$result) {
            $('.result-set', instance.$result).each(function () {
                var vTable = $(this).data('virtual-table');

                if (vTable) {
                    vTable.resize(instance).update(true);
                }
            });
        }
    });

    app.on('remove-instance', function (instance) {
        if (instance && instance.$result) {
            $('.result-set', instance.$result).each(function () {
                noose.deregister(this);
            });
        }
    });

    $('.instance-container').on('click', '.instance .export-btn', function (e) {
        e.preventDefault();
        var $btn = $(this).tooltip('hide');
        var instance = $btn.closest('.instance').data('instance');
        var dbId = $btn.closest('.result-sets-container').attr('id').substr(1);
        if (instance) {
            app.downloadToCsv(instance, dbId);
        }
    });

    var VirtualTable = window.VirtualTable = function (instance, $table, data) {
        if (!(this instanceof VirtualTable)) {
            return new VirtualTable(instance, $table, data);
        }
        var that = this;
        that.container = $('tbody', $table)[0]; // Container for dynamic rows
        that.data = data || [];
        that.len = that.data.length - 1;    // Number of rows (minus 1 for header row)
        that.rowHeight = 22;                // Row height. TODO: Dynamically determine value.
        that.chunksPerBlock = 3;            // Number of chunks in a block
        that.blockNum = 0;                  // Current block number
        that.top = 0;                       // Current top position
        that.topOffset = 0;                 // Amount of space from top of block to top of container
        that.bottomOffset = 0;              // Amount of space from bottom of block to bottom of container

        that.resize(instance).update(true);

        $table.on('scroll', function (e) {
            that.top = e.target.scrollTop;
            that.update();
        });
    };

    VirtualTable.prototype = {
        getBlockNum: function () {
            // Get the current block number.
            return Math.floor(this.top / this.blockHeight) || 0;
        },
        resize: function (instance) {
            this.viewHeight = instance.$result.height();                        // View port height
            this.rowsPerChunk = Math.ceil(this.viewHeight / this.rowHeight);
            this.chunkHeight = this.rowsPerChunk * this.rowHeight;
            this.rowsPerBlock = this.rowsPerChunk * this.chunksPerBlock;
            this.blockHeight = this.chunksPerBlock * this.chunkHeight;

            return this;
        },
        update: function (force) {
            // Only update if block number change (or force)
            if (this.blockNum === (this.blockNum = this.getBlockNum()) && !force) {
                return this;
            }

            var start = 0;
            var end = this.len;
            var topOffset = 0;
            var bottomOffset = 0;
            var rows = [];

            // block number === Infinity when the block height is 0
            if (this.blockNum === Infinity) {
                start = end = NaN;
                topOffset = this.len * this.rowHeight;
            } else if (this.len >= this.rowsPerBlock) {
                start = Math.max(this.rowsPerBlock * this.blockNum, 0);
                end = Math.min(start + this.rowsPerBlock + this.rowsPerChunk, this.len);
                topOffset = this.rowHeight * start;
                bottomOffset = (this.len - end) * this.rowHeight;
            }

            // If changed
            if (force ||
                topOffset !== this.topOffset ||
                bottomOffset !== this.bottomOffset) {

                this.topOffset = topOffset;
                this.bottomOffset = bottomOffset;

                if (topOffset > 0) {
                    if (start % 2 === 0) {
                        // Add one row to keep table stripe consistent
                        rows.push('<tr class="hidden"></tr>');
                    }
                    // Row for spacing
                    rows.push(`<tr style="height: ${topOffset}px;"></tr>`);
                }

                // Account for header row in data set (+1)
                start++;
                end++;

                let selected = this.data.selected || {};
                let selectedType = selected.type;
                let selectedSet = selected.set || [];
                for (var i = start; i < end; i++) {
                    this.data[i] && rows.push(this.createRow(this.data, i, selectedType, selectedSet));
                }

                if (bottomOffset > 0) {
                    rows.push(`<tr style="height: ${bottomOffset}px;"></tr>`);
                }
                this.container.innerHTML = rows.join('');
            }

            return this;
        },
        createRow: function (result, rIdx, selectedType, selectedSet) {
            let rowSelected = selectedType === 'row' && selectedSet.indexOf(rIdx) !== -1 ? 'selected' : '';

            return `<tr data-idx="${rIdx}"><th class="row-number ${rowSelected}">${rIdx}</th>` + result[rIdx].map(function (data, cIdx) {
                let classes = [];
                let attrs = [];

                /* eslint-disable no-extra-parens */
                if ((selectedType === 'column' && selectedSet.indexOf(cIdx) !== -1) ||
                    (selectedType === 'cell' && selectedSet.indexOf(`${rIdx},${cIdx}`) !== -1)) {
                    /* eslint-enable no-extra-parens */
                    classes.push('selected');
                }
                if (data === null) {
                    data = 'NULL';
                    classes.push('null');
                } else if (typeof data === 'boolean') {
                    data = data ? 1 : 0;
                    attrs.push('data-type="bit"');
                } else {
                    data = app.escapeHtml(data);
                }

                return `<td class="${classes.join(' ')}" ${attrs.join(' ')}>${data}</td>`;
            }).join('') + '</tr>';
        }
    };

    $.contextMenu({
        selector: '.content .result .result-set',
        zIndex: function ($trigger, opt) {
            return 500;
        },
        callback: function (key, opts, e) {
            var $this = $(this);
            var result = $this.data('result');
            var selectedData = app.getSelectedResults(result, result.selected, key === 'copyHeader');

            app.copyToClipboard(app.resultToText(selectedData));
        },
        selectableSubMenu: true,
        items: {
            copy: {
                name: 'Copy',
                icon: 'fa-clone',
                accesskey: 'c',
                disabled: function (key, opts) {
                    var $this = $(this);
                    var result = $this.data('result');

                    return !(result && result.selected && result.selected.type !== '');
                }
            },
            copyHeader: {
                name: 'Copy include Headers',
                icon: 'fa-copy',
                accesskey: 'h',
                disabled: function (key, opts) {
                    var $this = $(this);
                    var result = $this.data('result');

                    return !(result && result.selected && result.selected.type !== '');
                }
            },
            sep1: '---------',
            export: {
                name: 'Export',
                icon: 'fa-download',
                accesskey: 'x',
                items: {
                    'export-table': {
                        name: 'Table Result',
                        icon: 'fa-th',
                        accesskey: 't',
                        callback: function () {
                            var $this = $(this);
                            var result = $this.data('result');

                            app.exportCsv(result);
                        }
                    },
                    'export-database': {
                        name: 'Databse Results',
                        icon: 'fa-database',
                        accesskey: 'd',
                        callback: function () {
                            $('.export-btn', $(this).closest('.result-sets-container')).click();
                        }
                    },
                    'export-all': {
                        name: 'All Results',
                        icon: 'fa-cubes',
                        accesskey: 'a',
                        callback: function () {
                            if (app.instance) {
                                app.downloadToCsv(app.instance);
                            }
                        }
                    }
                }
            }
        }
    });
}(window, window.app = window.app || {}, window.os, jQuery));
