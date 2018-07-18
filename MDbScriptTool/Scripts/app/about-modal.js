/// <reference path="app.js" />

/**
 * About Modal
 */
(function (window) {
    $(function () {
        var $dlg = $('#about-modal');
        var $appVersion = $('#app-version', $dlg);
        var $cefVersion = $('#cef-version', $dlg);
        var $chromiumVersion = $('#chromium-version', $dlg);
        var $jqueryVersion = $('#jquery-version', $dlg);
        var $bootstrapVersion = $('#bootstrap-version', $dlg);
        var $codemirrorVersion = $('#codemirror-version', $dlg);

        function setAppCefVersion() {
            scriptEvent.emit('get-versions');
        }

        systemEvent.on('versions', function (versions) {
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

        function setChromiumVersion() {
            var match = navigator.userAgent.match(/Chrom(e|ium)\/([0-9\.]+)\s/);

            if (match[2]) {
                $chromiumVersion.text(match[2]);
            } else {
                $chromiumVersion.text('Unknown');
            }
        }

        function setJQueryVersion() {
            if ($.fn.jquery) {
                $jqueryVersion.text($.fn.jquery);
            } else {
                $jqueryVersion.text('Unknown');
            }
        }

        function setBootstrapVersion() {
            if ($.fn.modal.Constructor.VERSION) {
                $bootstrapVersion.text($.fn.modal.Constructor.VERSION);
            } else {
                $bootstrapVersion.text('Unknown');
            }
        }

        function setCodeMirrorVersion() {
            if (CodeMirror.version) {
                $codemirrorVersion.text(CodeMirror.version);
            } else {
                $codemirrorVersion.text('Unknown');
            }
        }
        $dlg.one('show.bs.modal', function (evt) {
            setAppCefVersion();
            setChromiumVersion();
            setJQueryVersion();
            setBootstrapVersion();
            setCodeMirrorVersion();
        });
    });
}(window));