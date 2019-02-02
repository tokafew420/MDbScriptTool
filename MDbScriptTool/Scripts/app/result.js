/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Result pane in each instance
 */
(function (window) {
    var $content = $('.content');

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

    os.on('sql-exe-db-batch-result', function (err, batchId, db, batchNum, result) {
        var $pane = $('#' + batchId);
        var $resultPane = $('.result', $pane);

        var $dbTable = $('#' + db, $resultPane);
        if ($dbTable.length === 0) {
            $resultPane.append(`<div id="${db}"><div class="dbname">${db}</div></div>`);
            $dbTable = $('#' + db, $resultPane);
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
                return '<th>' + columnName + '</th>';
            }).join());

            $('tbody', $table).append(result.map(function (row, idx) {
                if (idx === 0) {
                    // Skip the header row
                    return '';
                }

                return `<tr><th class="row-number">${idx}</th>` + row.map(function (data) {
                    if (data === null) {
                        return '<td class="null">NULL</td>';
                    } else {
                        return '<td>' + app.utils.escapeHtml(data) + '</td>';
                    }
                }).join() + '</tr>';
            }).join());

            $dbTable.append($table);
        } else {
            $dbTable.append('<div class="result-text">Command(s) completed successfully</div>');
        }
    });
}(window));