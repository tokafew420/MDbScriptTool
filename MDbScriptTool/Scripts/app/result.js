/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Result pane in each instance
 */
(function (window) {
    var $content = $('.content');

    systemEvent.on('sql-execute-result', function (err, batchId, db, result) {
        var $pane = $('#' + batchId);
        var $resultPane = $('.result', $pane);

        var $dbTable = $('#' + db, $resultPane);
        if ($dbTable.length === 0) {
            $resultPane.append(`<div id="${db}"><div class="dbname">${db}</div></div>`);
            $dbTable = $('#' + db, $resultPane);
        }
        if (result && result.length) {
            var $table = $('<div class="result-set"><table border="1"><thead><tr><th class="row-number"></th></tr></thead><tbody></tbody></table></div>');
            var keys = Object.keys(result[0]);

            $('thead tr', $table).append(keys.map(function (k) {
                return '<th>' + k + '</th>';
            }).join());

            $('tbody', $table).append(result.map(function (row, idx) {
                return `<tr><td class="row-number">${idx + 1}</td>` + keys.map(function (k) {
                    if (row[k] === null) {
                        return '<td class="null">NULL</td>';
                    } else {
                        return '<td>' + app.utils.escapeHtml(row[k]) + '</td>';
                    }
                }).join() + '</tr>';
            }).join());

            $dbTable.append($table);
        } else {
            $dbTable.append('<div class="result-text">Command(s) completed successfully</div>');
        }
    });
}(window));