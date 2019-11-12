/// <reference path="app.js" />

/**
 * Content instance container. Contains the editor and the result set(s).
 */
(function (window, app, os, $) {
    var $content = $('.content');
    var $instanceContainer = $('.instance-container', $content);

    function resizeInstance(instance) {
        if (instance && instance.$instance) {
            var containerHeight = $instanceContainer.height();
            var $slider = instance.$slider;
            // Result slider is 10px = 2 * (border 2px + padding 3px)
            var sliderHeight = $slider.outerHeight(true);

            // Current top (position: absolute) relative to parent
            var top = $slider.position().top;

            // Don't allow slider to go outside container
            if (top > containerHeight - sliderHeight) {
                // Slider bottom is lower then bottom edge of container
                top = containerHeight - sliderHeight;

                // Ignore if container height is smaller than slider height
                if (top >= 0) {
                    $slider.css('top', top);
                }
            }
            // Slider is above the container
            if (top < 0) {
                top = 0;
                $slider.css('top', top);
            }

            var editorHeight = top;

            var resultHeight = containerHeight - editorHeight - sliderHeight;
            if (resultHeight < 0) resultHeight = 0;
            // TODO: Hard coded 21...need to figure out a way to get this value dynamic on-render [os.on('sql-exe-db-batch-result')]
            var resultHeaderHeight = $('.result-sets-container .result-sets-header', instance.$instance).outerHeight(true) || 21;

            instance.$editor.css('height', editorHeight);
            instance.$result.css({
                height: resultHeight,
                'margin-top': sliderHeight
            });
            $('.result-set', instance.$result).css('max-height', resultHeight - resultHeaderHeight);

            if (instance.editor) {
                instance.editor.setSize('100%', `${editorHeight}px`);
            }
        }
    }
    var _delayedResizeInstance = app.debounce(resizeInstance, 200);

    app.on('redraw', function () {
        resizeInstance(app.instance);
        _delayedResizeInstance(app.instance);
    });

    app.on('create-instance', function (instance) {
        var $instance = instance.$instance = $(`<div class="tab-pane instance fade" id="${instance.id}" role="tabpanel" aria-labelledby="${instance.id}-tab">
                    <div class="editor"></div>
                    <div class="slider slider-h">
                        <div></div>
                    </div>
                    <div class="result" tabindex="0"></div>
                </div>`).data('instance', instance);
        $instance.appendTo($instanceContainer);

        instance.$editor = $('.editor', $instance).data('instance', instance);

        // Initialize slider
        instance.$slider = $('.slider', $instance).draggable({
            axis: 'y',
            containment: 'parent',
            drag: function (event, ui) {
                resizeInstance(instance);
            },
            stop: function (event, ui) {
                resizeInstance(instance);
                app.emit('instance-slider-moved', instance);
            }
        }).data('instance', instance);

        instance.$result = $('.result', $instance).data('instance', instance);
    }).on('remove-instance', function (instance) {
        if (instance && instance.$instance) {
            instance.$instance.remove();
        }
    }).on('instance-switched', function (instance, prevInstance) {
        app.updateStatusBarForInstance(instance);
    });

    /**
     * Update the status bar with the current instance's metadata
     * @param {any} instance The  current instance.
     */
    app.updateStatusBarForInstance = function (instance) {
        var metas = [];
        if (instance) {
            if (instance.totalRows !== null && instance.totalRows >= 0) {
                metas.push(`Total Rows: <strong>${instance.totalRows}</strong>`);
            }
            if (instance.affectedRows !== null && instance.affectedRows >= 0) {
                metas.push(`Rows Affected: <strong>${instance.affectedRows}</strong>`);
            }
            metas.push(`Max Time: <strong>${app.msToTime(instance.time)}</strong>`);
        }

        app.emit('update-content-status', metas.join(' - '));
    };

    $instanceContainer.on('dblclick', '.slider.slider-h', function (e) {
        var $slider = $(this);
        var instance = $slider.data('instance');
        var containerHeight = $instanceContainer.height();
        var sliderHeight = $slider.outerHeight(true);
        var top = $slider.position().top;

        var sliderAtBottom = containerHeight - sliderHeight;
        if (top === sliderAtBottom) {
            $slider.css('top', 0);
        } else {
            $slider.css('top', sliderAtBottom);
        }

        resizeInstance(instance);
        app.emit('instance-slider-moved', instance);
    });

    // Toggle collapse on navbar's sidebar toggle click
    var removeAnimateTimer;
    app.on('sidebar-collapse-toggled', function (collapsed) {
        clearTimeout(removeAnimateTimer);

        if (collapsed) {
            $content.addClass('animate-250 full');
        } else {
            $content.addClass('animate-250').removeClass('full');
        }

        removeAnimateTimer = setTimeout(function () {
            $content.removeClass('animate-250');
        }, 300);
    });

    // Adjust margins when sidebar slider is dragged
    app.on('sidebar-slider-dragged', function (left) {
        $content.css('margin-left', left + 6);
    });

    app.on('update-content-status', function (text) {
        $('#content-statusbar .status-text', $content).html(text);
    });

    // Key maps
    app.mapKeys($content, 'Ctrl-N', function () {
        $('.content-toolbar .new-file-btn', $content).click();
    }).mapKeys($content, 'Ctrl-O', function () {
        $('.content-toolbar .open-file-btn', $content).click();
    }).mapKeys($content, 'Ctrl-Q', function () {
        if (app.instance && app.instance.$tab) {
            $('i.fa-times', app.instance.$tab).click();
        }
    }).mapKeys($content, 'Ctrl-S', function () {
        $('.content-toolbar .save-file-btn', $content).click();
    }).mapKeys($content, 'Shift-Ctrl-S', function () {
        $('.content-toolbar .save-as-file-btn', $content).click();
    });
}(window, window.app = window.app || {}, window.os, jQuery));
