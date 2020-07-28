/// <reference path="app.js" />

/**
 * Content panel instance tabs.
 */
(function (window, app, os, $) {
    var $content = $('.content');
    var $tabs = $('.instance-tabs', $content);
    var $plusTab = $('.plus-tab', $tabs);

    // Create new tab when the '+' is clicked
    $plusTab.click(function () {
        $('.content .content-toolbar .new-file-btn').click();
    });

    // Close the tab when the 'x' is clicked
    $tabs.on('click', '.instance-tab i.fa-times', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this);
        var instance = $this.closest('.instance-tab').data('instance');

        if (instance.dirty) {
            var msg = instance.path ? `Save changes to [${instance.name}]?` : 'Save new file?';
            app.confirm(msg, 'Save File', {
                yes: 'Save',
                no: 'No'
            }, function (save) {
                if (save === true) {
                    app.once('instance-file-saved', function (instance, complete) {
                        if (complete) {
                            app.removeInstance(instance);
                        }
                    });
                    app.saveInstanceToFile();
                } else if (save === false) {
                    app.removeInstance(instance);
                }
            });
        } else {
            app.removeInstance(instance);
        }
    }).on('click', 'a[data-toggle="tab"]', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $tab = $(this).closest('.instance-tab');
        var instance = $tab.data('instance');

        if (!instance.active) {
            app.switchInstance(instance);
        }
    }).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
        // e.target - newly activated tab
        // e.relatedTarget - previous active tab

        var $tab = $(this).closest('.instance-tab');
        var instance = $tab.data('instance');

        if (instance) {
            setTimeout(function () {
                app.redraw();

                if (instance.editor) {
                    instance.editor.refresh();
                    instance.editor.focus();
                }
            }, 0);
        }
    });

    app.on('create-instance', function (instance) {
        if (instance) {
            var $tab = instance.$tab = $(`<li class="nav-item instance-tab">
                <a class="nav-link" id="${instance.id}-tab" data-toggle="tab" href="#${instance.id}" role="tab" aria-controls="${instance.id}" aria-selected="false"><span class="filename">${instance.name}</span><span class="star"> *</span> <i class="spinner fa fa-circle-o-notch spin text-accent-0" aria-hidden="true"></i><i class="close-instance fa fa-times" aria-hidden="true"></i></a>
            </li>`).data('instance', instance);

            $tab.insertBefore($('.nav-item:last', $tabs));

            if (instance.path) {
                $tab.tooltip({
                    boundary: 'window',
                    tigger: 'hover',
                    html: true,
                    title: `<span style="white-space: nowrap;">${instance.path}</span>`
                });
            }
            if (instance.dirty) {
                $tab.addClass('is-dirty');
            }
        }
    }).on('instance-loaded', function (instance) {
        if (instance && instance.$tab) {
            $('.filename', instance.$tab).text(instance.name)

            if (instance.path) {
                instance.$tab.tooltip('dispose')
                    .tooltip({
                        boundary: 'window',
                        tigger: 'hover',
                        html: true,
                        title: `<span style="white-space: nowrap;">${instance.path}</span>`
                    });
            }

            instance.$tab.removeClass('is-dirty');
        }
    }).on('remove-instance', function (instance) {
        if (instance && instance.$tab) {
            var $tab = instance.$tab;

            $tab.tooltip('dispose');
            $tab.tab('dispose').remove();
        }
    }).on('switch-instance', function (instance) {
        if (instance && instance.$tab) {
            $('a', instance.$tab).tab('show');
        }
    }).on(['parse-sql', 'execute-sql'], function (instance) {
        if (instance && instance.$tab) {
            instance.$tab.addClass('executing');
        }
    }).on(['sql-parsed', 'sql-executed'], function (instance) {
        if (instance && instance.$tab) {
            instance.$tab.removeClass('executing');
        }
    }).on('instance-file-saved', function (instance, complete) {
        if (complete && instance && instance.$tab) {
            $('.filename', instance.$tab).text(instance.name);

            if (instance.path) {
                instance.$tab.tooltip('dispose');
                instance.$tab.tooltip({
                    boundary: 'window',
                    tigger: 'hover',
                    html: true,
                    title: `<span style="white-space: nowrap;">${instance.path}</span>`
                });
            }
            instance.$tab.removeClass('is-dirty');
        }
    });

    function nextTab() {
        // Switch to next tab
        if (app.instance) {
            var idx = app.instances.indexOf(app.instance);

            var next = (idx + 1) % app.instances.length;

            next !== idx && app.switchInstance(app.instances[next]);
        }
    }

    function prevTab() {
        // Switch to previous tab
        if (app.instance) {
            var idx = app.instances.indexOf(app.instance);

            var prev = (idx + app.instances.length - 1) % app.instances.length;

            prev !== idx && app.switchInstance(app.instances[prev]);
        }
    }

    app.mapKeys($content, 'Ctrl-Tab', nextTab)
        .mapKeys($('.sidebar'), 'Ctrl-Tab', nextTab)
        .mapKeys($content, 'Shift-Ctrl-Tab', prevTab)
        .mapKeys($('.sidebar'), 'Shift-Ctrl-Tab', prevTab);
}(window, window.app = window.app || {}, window.os, jQuery));
