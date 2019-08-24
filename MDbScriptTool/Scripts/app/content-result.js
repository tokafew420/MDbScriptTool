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
                }).join());

                $('tbody', $table).append(result.map(function (row, idx) {
                    if (idx === 0) {
                        // Skip the header row
                        return '';
                    }

                    return `<tr><th class="row-number">${idx}</th>` + row.map(function (data) {
                        if (data === null) {
                            return '<td class="null">NULL</td>';
                        } else if (typeof data === 'boolean') {
                            return `<td data-type="bit">${data ? 1 : 0}</td>`;
                        } else {
                            return `<td>${app.escapeHtml(data)}</td>`;
                        }
                    }).join() + '</tr>';
                }).join());

                $dbTable.append($table);

                app.emit('update-content-status', `Total Rows: <strong>${instance.totalRows}</strong>`);
            } else {
                $dbTable.append('<div class="result-text">Command(s) completed successfully</div>');
            }
        }
    }).on('sql-executed', function (instance, err) {
        if (instance && instance.$result) {
            app.redraw();
        }
    });
}(window, window.app = window.app || {}, window.os, jQuery));
