/// <reference path="app.js" />

/**
 * About Modal
 */
(function (window, app, os, $) {
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
            $appVersion.text(versions.App || 'Unknown');
            $cefVersion.text(versions.Cef || 'Unknown');
        }
    });

    // Set the chromium version
    function setChromiumVersion() {
        var match = navigator.userAgent.match(/Chrom(e|ium)\/([0-9\.]+)\s/);

        $chromiumVersion.text(match[2] || 'Unknown');
    }

    // Set the jQuery version
    function setJQueryVersion() {
        $jqueryVersion.text($.fn.jquery || 'Unknown');
    }

    // Set the Bootstrap version
    function setBootstrapVersion() {
        $bootstrapVersion.text($.fn.modal.Constructor.VERSION || 'Unknown');
    }

    // Set the CodeMirror version
    function setCodeMirrorVersion() {
        $codemirrorVersion.text(CodeMirror.version || 'Unknown');
    }

    $dlg.one('show.bs.modal', function (evt) {
        os.emit('get-versions');
        setChromiumVersion();
        setJQueryVersion();
        setBootstrapVersion();
        setCodeMirrorVersion();
    });
}(window, window.app = window.app || {}, window.os, jQuery));
