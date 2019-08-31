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

    app.on('parse-sql', function (instance, connection, sql) {
        if (instance) {
            if (instance.$result) {
                instance.$result.empty();
            }
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
            instance.$result.empty();
        }
    }).on('sql-executed-db-batch', function (instance, err, db, result) {
        if (instance && instance.$result) {
            var $dbTable = $('#' + db, instance.$result);
            if ($dbTable.length === 0) {
                var conn = app.findBy(app.connections, 'id', instance.connection.id) || {};
                var conndb = app.findBy(conn.dbs, 'name', db);

                instance.$result.append(`<div id="${db}" class="result-sets-container"><div class="result-sets-header">${conndb && conndb.label || db}</div></div>`);
                $dbTable = $('#' + db, instance.$result);
            }

            if (err) {
                if (err.Errors && err.Errors.length) {
                    $dbTable.append(`<div class="result-text"><pre class="text-danger">${formatSqlError(err.Errors).join('\n\n')}</pre></div>`);
                } else {
                    $dbTable.append(`<div class="result-text text-danger">${err.Message}</div>`);
                }
            } else if (result && result.length && result[0].length) {
                var $table = $('<div class="result-set"><table class="table table-sm table-striped table-hover table-dark table-bordered"><thead><tr><th class="row-number"></th></tr></thead><tbody></tbody></table></div>');

                $('thead tr', $table).append(result[0].map(function (columnName) {
                    if (columnName) {
                        return '<th>' + columnName + '</th>';
                    } else {
                        return '<th class="unnamed">(No Name)</th>';
                    }
                }).join(''));

                $dbTable.append($table);

                if (result.length > 1) {
                    var vTable = new VirtualTable(instance, $table, result);
                    $table.data('virtual-table', vTable);
                }

                app.emit('update-content-status', `Total Rows: <strong>${instance.totalRows}</strong>`);
            } else {
                $dbTable.append('<div class="result-text">Command(s) completed successfully</div>');
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

    var VirtualTable = window.VirtualTable = function (instance, $table, data) {
        if (!(this instanceof VirtualTable)) {
            return new VirtualTable(instance, $table, data);
        }
        var that = this;
        that.container = $('tbody', $table)[0]; // Container for dynamic rows
        that.data = data || [];
        that.len = that.data.length - 1;    // Number of rows (minus 1 for header row)
        that.rowHeight = 22;                  // Row height. TODO: Dynamically determine value.
        that.chunksPerBlock = 3;            // Number of chunks in a block
        that.blockNum = 0;                      // Current block number
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

                for (var i = start; i < end; i++) {
                    this.data[i] && rows.push(this.createRow(this.data, i));
                }

                if (bottomOffset > 0) {
                    rows.push(`<tr style="height: ${bottomOffset}px;"></tr>`);
                }
                this.container.innerHTML = rows.join('');
            }

            return this;
        },
        createRow: function (result, idx) {
            return `<tr><th class="row-number">${idx}</th>` + result[idx].map(function (data) {
                if (data === null) {
                    return '<td class="null">NULL</td>';
                } else if (typeof data === 'boolean') {
                    return `<td data-type="bit">${data ? 1 : 0}</td>`;
                } else {
                    return `<td>${app.escapeHtml(data)}</td>`;
                }
            }).join('') + '</tr>';
        }
    };
}(window, window.app = window.app || {}, window.os, jQuery));
