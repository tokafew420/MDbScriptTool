/// <reference path="utils.js" />
var app = (function (window) {
    var app = new EventEmitter();

    app.uiState = {};
    app.connections = [];
    app.opts = {
        selectedConnIdx: -1
    };
    app.dbs = [];
    app.currentConnection;

    // Inits
    (function () {
        var savedData;

        // Get saved connections
        try {
            savedData = window.localStorage.getItem('connections');
            if (savedData) {
                var conns = JSON.parse(savedData);
                if (Array.isArray(conns)) {
                    app.connections = conns;
                }
            }
        } catch (e) {
            console.error('Failed to load saved connections.');
            console.error(e);
        }

        // Get saved options
        try {
            savedData = localStorage.getItem('options');
            if (savedData) {
                var savedOpts = JSON.parse(savedData);
                if (typeof savedOpts === 'object' && savedOpts !== null) {
                    app.opts = savedOpts;

                    app.currentConnection = app.connections[app.opts.selectedConnIdx];
                }
            }
        } catch (e) {
            console.error('Failed to load saved options.');
            console.error(e);
        }
    })();

    return app;
}(window));