/// <reference path="app.js" />

/**
 * Script Library Modal
 */
(function (window, app, os, $) {
    var $dlg = $('#script-library-modal');
    var $listViewBtn = $('.list-view-btn', $dlg);
    var $dirViewBtn = $('.directory-view-btn', $dlg);
    var $collapseAllBtn = $('.collapse-all-btn', $dlg);
    var $refreshFilesBtn = $('.refresh-files-btn', $dlg);
    var $search = $('.search input', $dlg);
    var $entriesWrapper = $('.entries-wrapper', $dlg);
    var $tbody = $('tbody', $entriesWrapper);
    var $errMsg = $('.err-msg', $dlg);
    var _entries, _rootEntries;
    var scriptDirectory = app.settings.scriptLibrary.directory;
    var sqlExtRegex = new RegExp(/\.sql$/, 'i');

    os.on('directory-listed', function (err, entries) {
        _rootEntries = [];
        if (err) {
            $tbody.empty();
            $entriesWrapper.hide();
            $errMsg.text(err.Message).show();
            _entries = [];
        } else {
            var basePath = app.settings.scriptLibrary.directory.replace(/\\/g, '/').replace(/[\/\s]+$/, '');
            var basePathLen = basePath.length;

            _entries = entries
                // Remove non directory and non *.sql files
                .filter(function (e) {
                    return e.Type === 'directory' || sqlExtRegex.test(e.Name);
                })
                // Setup directory/file properties
                .map(function (e) {
                    e.parsedPath = e.Path.replace(/\\/g, '/');
                    e.relativePath = e.parsedPath.substring(basePathLen);
                    e.parentPath = e.relativePath.substring(0, e.relativePath.lastIndexOf('/'));
                    e.level = e.relativePath.split('/').length - 2;
                    e.children = [];
                    e.files = e.Type === 'directory' ? 0 : 1;

                    return e;
                })
                // Reverse to start with leaf node
                .sort(function (a, b) {
                    return app.compare(a.relativePath, b.relativePath) * -1;
                })
                // Map parent/child relationship
                .map(function (e, idx, entries) {
                    if (e.Type === 'directory' && !e.children.length) {
                        //  If at this point the directory doesn't have any children then it's empty.
                        // Remove it.
                        return;
                    }
                    if (e.level === 0) {
                        _rootEntries.push(e);
                        e.parent = null;
                    } else {
                        var parent = app.findBy(entries, 'relativePath', e.parentPath);
                        parent.children.push(e);
                        parent.files += e.files;
                        e.parent = parent;
                    }
                    return e;
                })
                // Remove empty directories
                .filter(function (e) {
                    return e && (e.Type !== 'directory' || e.children.length);
                });

            $errMsg.empty().hide();
            render();
        }

        app.loading.hide($('.modal-body', $dlg));
    });

    $dlg.on('show.bs.modal', function (evt) {
        if (app.settings.scriptLibrary.view === 'list') {
            $listViewBtn.addClass('active');
            $dirViewBtn.removeClass('active');
            $entriesWrapper.addClass('list-view');
        } else {
            $listViewBtn.removeClass('active');
            $dirViewBtn.addClass('active');
            $entriesWrapper.removeClass('list-view');
        }

        if (!_entries || scriptDirectory !== app.settings.scriptLibrary.directory) {
            init();
            scriptDirectory = app.settings.scriptLibrary.directory;
        }
    });

    function init() {
        if (app.settings.scriptLibrary.directory) {
            $errMsg.empty().show();
            app.loading.show({
                text: 'Loading',
                parent: $('.modal-body', $dlg)
            });
            os.emit('list-directory', app.settings.scriptLibrary.directory);
        } else {
            $tbody.empty();
            $entriesWrapper.hide();
            $errMsg.html('<span>Scripts directory is not set. Go to <a href="#" class="go-to-settings text-danger"><strong>Settings</strong></a> to specify the directory.<span>').show();
        }
    }

    $listViewBtn.on('click', function () {
        $dirViewBtn.removeClass('active');
        $listViewBtn.addClass('active');
        $entriesWrapper.addClass('list-view');
        app.settings.scriptLibrary.view = 'list';
        if (app.settings.scriptLibrary.sort === 'files') {
            // Don't sort by files in list view
            app.settings.scriptLibrary.sort = 'name';
            $('thead th', $entriesWrapper).removeAttr('data-asc');
            $('thead th[data-sort="name"]', $entriesWrapper).attr('data-asc', app.settings.scriptLibrary.asc);
        }

        app.saveState('settings');
        render();
    });

    $dirViewBtn.on('click', function () {
        $listViewBtn.removeClass('active');
        $dirViewBtn.addClass('active');
        $entriesWrapper.removeClass('list-view');
        app.settings.scriptLibrary.view = 'directory';
        app.saveState('settings');
        render();
    });

    $collapseAllBtn.on('click', function () {
        if (_entries) {
            _entries.forEach(function (e) {
                if (e.Type === 'directory') e.show = false;
            });
            render();
        }
    });

    $refreshFilesBtn.on('click', function () {
        init();
    });

    $search.on('keyup change input', app.debounce(function (e) {
        render();
    }, 300));

    function render() {
        let view = app.settings.scriptLibrary.view || 'list';

        $entriesWrapper.show();
        $tbody.html(_render(view === 'list' ? _entries : _rootEntries));

        $('[data-toggle="tooltip"]', $entriesWrapper).tooltip({
            boundary: 'window',
            tigger: 'hover'
        }).on('mouseleave click', function () {
            $(this).tooltip('hide');
        });
    }

    function _render(entries) {
        if (entries) {
            let view = app.settings.scriptLibrary.view || 'list';
            let sort = app.settings.scriptLibrary.sort || 'name';
            let order = app.settings.scriptLibrary.asc === false ? -1 : 1;
            let search = $search.val().trim().toLowerCase();

            return entries.filter(function (e) {
                if (view === 'list') return e.Type !== 'directory';
                if (e.level === 0) return true;
                return e.parent.show;
            }).filter(function (e) {
                if (search && e.Type !== 'directory') {
                    return e.Name.toLowerCase().lastIndexOf(search) !== -1;
                }
                return true;
            }).sort(function (a, b) {
                if (a.Type !== b.Type) return a.Type === 'directory' ? -1 : 1;

                if (a.Type === 'directory') {
                    if (sort === 'files') return (a.files - b.files) * order;
                    return app.compare(a.Name, b.Name) * (sort === 'name' ? order : 1);
                }

                if (sort === 'date') return (a.LastModified - b.LastModified) * order;
                if (sort === 'size') return (a.Size - b.Size) * order;
                return app.compare(a.Name, b.Name) * order;
            }).map(function (e) {
                if (!e.html) {
                    if (e.Type === 'directory') {
                        e.html = `<tr><td><div class="entry-wrapper"><a href="${e.parsedPath}" data-toggle="tooltip" title="${e.Path}" class="accent-link" style="margin-left: ${e.level * 12}px;"><strong>/${e.Name}</strong></a><i class="fa fa-folder-open-o ml-2" data-toggle="tooltip" title="Open in Explorer" aria-hidden="true"></i></div></td><td><span class="badge badge-pill badge-light">${e.files}</span></td><td></td><td></td>`;
                    } else {
                        e.html = `<tr><td><div class="entry-wrapper"><a href="${e.parsedPath}" data-toggle="tooltip" title="${e.Path}" class="accent-link" style="margin-left: ${e.level * 12}px;">${e.Name.substring(0, e.Name.lastIndexOf('.sql'))}</a><i class="fa fa-folder-open-o ml-2" data-toggle="tooltip" title="Open in Explorer" aria-hidden="true"></i></div></td><td></td><td><span class="badge badge-pill badge-light">${app.date.format(new Date(e.LastModified), 'mm/dd/yyyy hh:MM:ss TT')}</span></td><td><span class="badge badge-pill badge-light">${app.fileSize(e.Size)}</span></td>`;
                    }
                }

                if (e.Type === 'directory' && e.show) {
                    return e.html + _render(e.children);
                }
                return e.html;
            }).join('');
        }
        return '';
    }

    $entriesWrapper.on('click', 'thead th', function () {
        let $this = $(this);
        let sort = $this.attr('data-sort');
        let asc = $this.attr('data-asc');

        $('thead th', $entriesWrapper).removeAttr('data-asc');

        app.settings.scriptLibrary.sort = sort;
        app.settings.scriptLibrary.asc = asc === 'true' ? false : true;

        $this.attr('data-asc', app.settings.scriptLibrary.asc);

        app.saveState('settings');

        render();
    }).on('click', 'a', function (e) {
        e.preventDefault();
        var $this = $(this);

        var path = $this.attr('href');
        var entry = app.findBy(_entries, 'parsedPath', path);

        if (entry.Type === 'directory') {
            entry.show = !entry.show;
            render();
        } else {
            app.openFile(entry.Path, function (err, res) {
                if (err) {
                    return app.alert(`<span class="text-danger">${err || 'Failed to load file'}</span >`, 'Error', { html: true });
                }

                var instance = app.createInstance({
                    path: entry.Path,
                    name: entry.Name,
                    code: res,
                    dirty: false
                });

                // Let the editor instance create itself first.
                requestAnimationFrame(function () {
                    app.switchInstance(instance);
                    $dlg.modal('hide');
                });
            });
        }
    }).on('click', 'i', function () {
        var $this = $(this);

        var $a = $('a', $this.parent());
        var path = $a.attr('href');

        if (path) {
            os.emit('open-explorer', path);
        }
    });

    $errMsg.on('click', '.go-to-settings', function (e) {
        e.preventDefault();
        $dlg.modal('hide');
        $('#settings-modal').modal('show');
    });
}(window, window.app = window.app || {}, window.os, jQuery));
