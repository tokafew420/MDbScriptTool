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

        // Initialize codemirror editor
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

        editor.on('change', app.debounce(function () {
            instance.code = editor.getValue();
            app.saveState('instances');
        }, 5000));

        /** result slider **/
        (function () {
            var $dynoStyle = $('<style/>');
            $dynoStyle.prependTo($tabContent);
            var $instanceContainer = $('.instance-containers', $content);
            var $resultSlider = $('.slider', $tabContent);

            // Includes the navbar, content padding, toolbar, and tab
            var instanceContainerOffset = $instanceContainer.offset().top;

            function resizeEditor(event, ui) {
                // Current top (position: absolute) relative to window
                var top = Math.floor(ui.offset.top);
                var instanceContainerHeight = $instanceContainer.height();
                var editorHeight = top - instanceContainerOffset;

                // Constrain movement (minimium is 150 height for editor subpane)
                if (editorHeight < 150) return false;

                // Result slider is 10px = 2 * (border 2px + padding 3px)
                var sliderHeight = $resultSlider.outerHeight(true);
                var resultHeight = instanceContainerHeight - editorHeight - sliderHeight;
                // TODO: Hard coded 21...need to figure out a way to get this value dynamic on-render [os.on('sql-exe-db-batch-result')]
                var resultHeaderHeight = $('.result-sets-container .result-sets-header', $tabContent).outerHeight(true) || 21;

                $dynoStyle.html(`#${instance.id} .editor {
                            height: ${editorHeight}px;
                        }
                        #${instance.id} .result {
                            height: ${resultHeight}px;
                            margin-top: ${sliderHeight}px;
                        }
                        #${instance.id} .result .result-set {
                            max-height: ${resultHeight - resultHeaderHeight}px;
                        }`);

                editor.setSize('100%', `${editorHeight}px`);
            }

            $resultSlider.draggable({
                axis: 'y',
                containment: 'parent',
                drag: resizeEditor
            });

            // Initilaize position before any drag
            var onInit = true;
            app.on('tab-active', function (id) {
                if (onInit && id === instance.id) {
                    // TODO: Waiting until on(tab-active) for slider height to be rendered
                    resizeEditor(null, {
                        offset: {
                            // 300 is the initial editor height
                            top: instanceContainerOffset + 300
                        }
                    });
                    onInit = false;
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
                editor.focus();
                // Set the cursor at the end of existing content
                //editor.setCursor(editor.lineCount(), 0);
            }
        }
    });
}(app, window, window.jQuery));
