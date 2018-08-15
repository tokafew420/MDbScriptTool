/// <reference path="utils.js" />
/// <reference path="app.js" />

/**
 * Editor instance
 */
(function (window) {
    var $content = $('.content');

    app.on('new-instance', function (instance) {
        var $codeTabsContent = $('.instance-containers', $content);

        var $tabContent = $(`<div class="tab-pane instance fade" id="${instance.id}" role="tabpanel" aria-labelledby="${instance.id}-tab">
                    <div class="editor"></div>
                    <div class="instance-slider">
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
            $resultSlider = $('.instance-slider', $tabContent);

            $resultSlider.draggable({
                axis: 'y',
                containment: 'parent',
                drag: function (event, ui) {
                    // Current top (position: absolute)
                    // Includes navbar (56px), toolbar (53.5), tabs (42px) = total (151.5px)
                    var top = Math.floor(ui.offset.top);
                    // Constrain movement (minimium is 150 height for editor subpane)
                    if (top < 200) return false;

                    // Result subpane does not include navbar (top - navbar + slider)

                    // Result slider is 10px 2 x (border 2px + padding 3px)
                    // Only partially hide it
                    $dynoStyle.html(`#${instance.id} .editor {
                            height: ${top - 151}px;
                        }
                        #${instance.id} .result {
                            margin-top: ${top - 56 + 9}px;
                        }`);

                    editor.setSize('100%', `${top - 151}px`);
                }
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
}(window));