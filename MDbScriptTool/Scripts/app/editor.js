/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Editor instance
 */
(function (app, window, $) {
    var $content = $('.content');

    app.on('new-instance', function (instance) {
        var $codeTabsContent = $('.instance-containers', $content);

        var $tabContent = $(`<div class="tab-pane instance fade" id="${instance.id}" role="tabpanel" aria-labelledby="${instance.id}-tab">
                    <div class="editor"></div>
                    <div class="slider slider-h">
                        <div></div>
                    </div>
                    <div class="result"></div>
                </div>`);

        $tabContent.appendTo($codeTabsContent);

        var mime = 'text/x-mssql';
        var theme = 'twilight';

        var editor = CodeMirror($('.editor', $tabContent)[0], {
            mode: mime,
            indentWithTabs: true,
            smartIndent: true,
            lineNumbers: true,
            matchBrackets: true,
            autofocus: true,
            theme: theme
        });

        if (instance.code) {
            editor.setValue(instance.code);
        }

        editor.on('change', app.utils.debounce(function () {
            instance.code = editor.getValue();
            app.saveState('instances');
        }, 1000));

        /** result slider **/
        (function () {
            var $dynoStyle = $('<style/>');
            $dynoStyle.appendTo($tabContent);
            $resultSlider = $('.slider', $tabContent);

            var navbarHeight = $('body .navbar').outerHeight(true);
            // Includes the navbar, content padding, toolbar, and tab
            var instanceContainerOffset = $('.instance-containers', $content).offset().top;

            function resizeEditor(event, ui) {
                // Current top (position: absolute)
                var top = Math.floor(ui.offset.top);
                // Constrain movement (minimium is 150 height for editor subpane)
                if (top < 200) return false;

                // Result subpane does not include navbar (top - navbar + slider)

                // Result slider is 10px = 2 * (border 2px + padding 3px)
                $dynoStyle.html(`#${instance.id} .editor {
                            height: ${top - instanceContainerOffset + 1}px;
                        }
                        #${instance.id} .result {
                            margin-top: ${top - navbarHeight + 9}px;
                        }`);

                editor.setSize('100%', `${top - instanceContainerOffset + 1}px`);
            }

            // Initilaize position before any drag
            resizeEditor(null, {
                offset: {
                    // 300 is the initial editor height
                    top: instanceContainerOffset + 300
                }
            });

            $resultSlider.draggable({
                axis: 'y',
                containment: 'parent',
                drag: resizeEditor
            });
        })();
    });

    app.on('tab-active', function (id) {
        var $cm = $('#' + id + '.instance .CodeMirror', $content);

        if ($cm.length) {
            var editor = $cm[0].CodeMirror;

            if (editor) {
                editor.refresh();
            }
        }
    });
}(app, window, window.jQuery));