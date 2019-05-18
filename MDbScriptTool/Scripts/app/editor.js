/// <reference path="app.js" />

/**
 * Editor instance
 */
(function (app, window, $) {
    var $content = $('.content');
    var $instanceContainer = $('.instance-container', $content);
    // Includes the navbar, content padding, toolbar, and tab
    var containerOffset = $instanceContainer.offset().top;

    var resizeEditor = app.debounce(function ($instance) {
        if ($instance && $instance.length) {
            var id = $instance[0].id;
            var containerHeight = $instanceContainer.height();
            var $slider = $('.slider', $instance);
            // Result slider is 10px = 2 * (border 2px + padding 3px)
            var sliderHeight = $slider.outerHeight(true);

            // Current top (position: absolute) relative to parent
            var top = $slider.position().top;

            // Don't allow slider to go outside container
            if (top > containerHeight - sliderHeight) {
                top = containerHeight - sliderHeight;
                
                $slider.css('top', top + 'px');
            }
            if (top < 0) {
                top = 0;
                $slider.css('top', top + 'px');
            }

            var editorHeight = top;

            var resultHeight = containerHeight - editorHeight - sliderHeight;
            if (resultHeight < 0) resultHeight = 0;
            // TODO: Hard coded 21...need to figure out a way to get this value dynamic on-render [os.on('sql-exe-db-batch-result')]
            var resultHeaderHeight = $('.result-sets-container .result-sets-header', $instance).outerHeight(true) || 21;

            console.log('containerOffSet: %s, containerHeight: %s, top: %s, editorHeight: %s, resultHeight: %s, resultHeaderHeight: %s',
                containerOffset,
                containerHeight,
                top,
                editorHeight,
                resultHeight,
                resultHeaderHeight
            );
            $('style', $instance).html(`
            #${id} .editor {
                height: ${editorHeight}px;
            }
            #${id} .result {
                height: ${resultHeight}px;
                margin-top: ${sliderHeight}px;
            }
            #${id} .result .result-set {
                max-height: ${resultHeight - resultHeaderHeight}px;
            }`);

            var editor = $instance.data('editor');

            if (editor) {
                editor.setSize('100%', `${editorHeight}px`);
            }
        }
    }, 0);

    app.on('new-instance', function (instance) {
        var $instance = $(`<div class="tab-pane instance fade" id="${instance.id}" role="tabpanel" aria-labelledby="${instance.id}-tab">
                    <style></style>
                    <div class="editor"></div>
                    <div class="slider slider-h">
                        <div></div>
                    </div>
                    <div class="result"></div>
                </div>`);

        $instance.appendTo($instanceContainer);

        // Initialize codemirror editor
        var mime = 'text/x-mssql';
        var theme = 'twilight';

        var editor = CodeMirror($('.editor', $instance)[0], {
            mode: mime,
            indentWithTabs: true,
            smartIndent: true,
            lineNumbers: true,
            matchBrackets: true,
            autofocus: true,
            theme: theme
        });
        $instance.data('editor', editor);

        if (instance.code) {
            editor.setValue(instance.code);
        }

        editor.on('change', app.debounce(function () {
            instance.code = editor.getValue();
            app.saveState('instances');
        }, 5000));

        // Initialize slider
        $('.slider', $instance).draggable({
            axis: 'y',
            containment: 'parent',
            drag: function (event, ui) {
                resizeEditor($instance);
            }
        });
    });

    app.on('tab-active', function (id) {
        var $instance = $('#' + id, $instanceContainer);

        if ($instance.length) {
            resizeEditor($instance);

            var editor = $instance.data('editor');

            if (editor) {
                editor.refresh();
                editor.focus();
                // Set the cursor at the end of existing content
                //editor.setCursor(editor.lineCount(), 0);
            }
        }
    });

    $(window).on('resize', function () {
        var $instance = $('.instance.active', $instanceContainer);
        resizeEditor($instance);
    });
}(app, window, window.jQuery));
