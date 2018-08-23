/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Result pane in each instance
 */
(function (window) {
    var $content = $('.content');

    systemEvent.on('sql-execute-result', function (err, batchId, db, result) {
        console.log(result);
        var $pane = $('#' + batchId);
        var $resultPane = $('.result', $pane);

        var $dbTable = $('#' + db, $resultPane);
        if ($dbTable.length === 0) {
            $resultPane.append(`<div id="${db}"><div class="dbname">${db}</div></div>`);
            $dbTable = $('#' + db, $resultPane);
        }
        if (result && result.length) {
            var $table = $('<div class="result-set"><table border="1"><thead><tr><th class="row-number"></th></tr></thead><tbody></tbody></table></div>');

            $('thead tr', $table).append(result[0].map(function (columnName) {
                return '<th>' + columnName + '</th>';
            }).join());

            $('tbody', $table).append(result.map(function (row, idx) {
                if (idx === 0) {
                    // Skip the header row
                    return '';
                }

                return `<tr><td class="row-number">${idx}</td>` + row.map(function (data) {
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