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
        var instance = app.createInstance();
        // Let the editor instance create itself first.
        setTimeout(function () {
            app.switchInstance(instance);
        }, 0);
    });

    // Close the tab when the 'x' is clicked
    $tabs.on('click', '.instance-tab i.fa-times', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this);
        var instance = $this.closest('.instance-tab').data('instance');

        app.removeInstance(instance);
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
            <a class="nav-link" id="${instance.id}-tab" data-toggle="tab" href="#${instance.id}" role="tab" aria-controls="${instance.id}" aria-selected="false">${instance.name} <i class="spinner fa fa-circle-o-notch spin text-accent-0" aria-hidden="true">&nbsp;</i><i class="close-instance fa fa-times" aria-hidden="true"></i></a>
        </li>`).data('instance', instance);

            $tab.insertBefore($('.nav-item:last', $tabs));
        }
    }).on('remove-instance', function (instance) {
        if (instance && instance.$tab) {
            var $tab = instance.$tab;

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
    });
}(window, window.app = window.app || {}, window.os, jQuery));
