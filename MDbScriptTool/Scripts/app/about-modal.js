/// <reference path="app.js" />

/**
 * About Modal
 */
(function (window) {
    var $dlg = $('#about-modal');
    var $appVersion = $('#app-version', $dlg);
    var $cefVersion = $('#cef-version', $dlg);
    var $chromiumVersion = $('#chromium-version', $dlg);
    var $jqueryVersion = $('#jquery-version', $dlg);
    var $bootstrapVersion = $('#bootstrap-version', $dlg);
    var $codemirrorVersion = $('#codemirror-version', $dlg);

    // Set the version information from the .NET side.
    os.on('versions', function (err, versions) {
        if (versions) {
            if (versions.App) {
                $appVersion.text(versions.App);
            } else {
                $appVersion.text('Unknown');
            }
            if (versions.Cef) {
                $cefVersion.text(versions.Cef);
            } else {
                $cefVersion.text('Unknown');
            }
        }
    });

    // Set the chromium version
    function setChromiumVersion() {
        var match = navigator.userAgent.match(/Chrom(e|ium)\/([0-9\.]+)\s/);

        if (match[2]) {
            $chromiumVersion.text(match[2]);
        } else {
            $chromiumVersion.text('Unknown');
        }
    }

    // Set the jQuery version
    function setJQueryVersion() {
        if ($.fn.jquery) {
            $jqueryVersion.text($.fn.jquery);
        } else {
            $jqueryVersion.text('Unknown');
        }
    }

    // Set the Bootstrap version
    function setBootstrapVersion() {
        if ($.fn.modal.Constructor.VERSION) {
            $bootstrapVersion.text($.fn.modal.Constructor.VERSION);
        } else {
            $bootstrapVersion.text('Unknown');
        }
    }

    // Set the CodeMirror version
    function setCodeMirrorVersion() {
        if (CodeMirror.version) {
            $codemirrorVersion.text(CodeMirror.version);
        } else {
            $codemirrorVersion.text('Unknown');
        }
    }

    $dlg.one('show.bs.modal', function (evt) {
        os.emit('get-versions');
        setChromiumVersion();
        setJQueryVersion();
        setBootstrapVersion();
        setCodeMirrorVersion();
    });
}(window));