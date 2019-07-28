/// <reference path="app.js" />

/**
 * Content panel instance tabs.
 */
(function (window, app, os, $) {
    var $content = $('.content');
    var $tabs = $('.instance-tabs', $content);
    var $instanceContainer = $('.instance-container', $content);
    var $plusTab = $('.plus-tab', $tabs);

    // Create new tab when the '+' is clicked
    $plusTab.click(function () {
        app.createInstance({
            name: 'New *'
        });
    });

    // Close the tab when the 'x' is clicked
    $tabs.on('click', '.instance-tab i.fa-times', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        // Get adjacent tabs
        var $this = $(this);
        var $tab = $this.closest('.instance-tab');
        var id = $('a', $tab).prop('id').replace('-tab', '');
        var $prev = $tab.prev('.nav-item');
        var $next = $tab.next('.nav-item');

        $tab.tab('dispose');
        $tab.remove();
        $('#' + id, $instanceContainer).remove();

        if ($('a', $tab).hasClass('active')) {
            if ($('.nav-item', $tabs).length === 1) {
                // There's no tabs left. Add a blank tab
                $plusTab.click();
            } else {
                // Show the previous tab; or if first tab then show next to the right.
                if ($prev.length) {
                    $('a', $prev).click();
                } else {
                    $('a', $next).click();
                }
            }
        }

        // Remove instance
        var instanceIdx = app.indexBy(app.instances, 'id', id);

        if (instanceIdx !== -1) {
            app.instances.splice(instanceIdx, 1);
            app.saveState('instances');
        }
    });

    $tabs.on('show.bs.tab', 'a[data-toggle="tab"]', function (e) {
        // e.target - newly activated tab
        // e.relatedTarget - previous active tab

        var $tab = $(e.target);
        var id = $tab.attr('id').replace('-tab', '');

        app.emit('tab-activating', id);
    });

    $tabs.on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
        // e.target - newly activated tab
        // e.relatedTarget - previous active tab

        var $tab = $(e.target);
        var id = $tab.attr('id').replace('-tab', '');

        var instance = app.findBy(app.instances, 'id', id);

        if (instance) {
            if (app.instance) {
                app.instance.active = false;
            }
            instance.active = true;
            app.instance = instance;
        }

        app.saveState('instances');
        app.emit('tab-active', id);
    });

    app.on('create-instance', function (instance) {
        var $tab = $(`<li class="nav-item instance-tab">
            <a class="nav-link" id="${instance.id}-tab" data-toggle="tab" href="#${instance.id}" role="tab" aria-controls="${instance.id}" aria-selected="false">${instance.name} <i class="fa fa-times" aria-hidden="true"></i></a>
        </li>`);

        $tab.insertBefore($('.nav-item:last', $tabs));

        // Let the editor instance create itself first.
        if (instance.active) {
            setTimeout(function () {
                $('a', $tab).tab('show');
            }, 0);
        }
    });
}(window, window.app = window.app || {}, window.os, jQuery));
