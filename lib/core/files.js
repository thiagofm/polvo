// Generated by CoffeeScript 1.6.3
var File, Files, argv, compiler, components, config, debug, dirs, error, fs, fsu, info, log_changed, log_created, log_deleted, logger, path, plugins, warn, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

path = require('path');

fs = require('fs');

fsu = require('fs-util');

_ = require('lodash');

dirs = require('../utils/dirs');

config = require('../utils/config');

compiler = require('./compiler');

argv = require('../cli').argv;

plugins = require('../utils/plugins');

logger = require('../utils/logger')('core/files');

components = require('../extras/component');

error = logger.error, warn = logger.warn, info = logger.info, debug = logger.debug;

log_created = logger.file.created;

log_changed = logger.file.changed;

log_deleted = logger.file.deleted;

File = require('./file');

module.exports = new (Files = (function() {
  var exts, plugin;

  exts = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = plugins.length; _i < _len; _i++) {
      plugin = plugins[_i];
      _results.push(plugin.ext);
    }
    return _results;
  })();

  Files.prototype.files = null;

  Files.prototype.watchers = null;

  function Files() {
    this.onfschange = __bind(this.onfschange, this);
    this.refresh_dependents = __bind(this.refresh_dependents, this);
    this.bulk_create_file = __bind(this.bulk_create_file, this);
    this.watchers = [];
    this.collect();
  }

  Files.prototype.collect = function() {
    var dirpath, filepath, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    this.files = [];
    _ref = config.input;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      dirpath = _ref[_i];
      _ref1 = fsu.find(dirpath, exts);
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        filepath = _ref1[_j];
        this.create_file(filepath);
      }
    }
    for (_k = 0, _len2 = components.length; _k < _len2; _k++) {
      filepath = components[_k];
      this.create_file(filepath);
    }
    if (argv.watch) {
      return this.watch_inputs();
    }
  };

  Files.prototype.create_file = function(filepath) {
    var ext, file, supported, _i, _len;
    if (filepath !== path.resolve(filepath)) {
      return;
    }
    supported = false;
    for (_i = 0, _len = exts.length; _i < _len; _i++) {
      ext = exts[_i];
      supported || (supported = ext.test(filepath));
    }
    if (!supported) {
      return;
    }
    if (file = _.find(this.files, {
      filepath: filepath
    })) {
      return file;
    }
    this.files.push(file = new File(filepath));
    file.on('new:dependencies', this.bulk_create_file);
    file.on('refresh:dependents', this.refresh_dependents);
    file.init();
    if (argv.watch && !this.is_under_inputs(filepath)) {
      this.watch_file(file.filepath);
    }
    return file;
  };

  Files.prototype.extract_file = function(filepath) {
    var index;
    index = _.findIndex(this.files, function(f) {
      return f.filepath === filepath;
    });
    return this.files.splice(index, 1)[0];
  };

  Files.prototype.is_under_inputs = function(filepath, consider_aliases) {
    var alias, dirpath, input, map, _i, _len, _ref, _ref1;
    input = true;
    _ref = config.input;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      dirpath = _ref[_i];
      input && (input = filepath.indexOf(dirpath) === 0);
    }
    if (consider_aliases) {
      alias = true;
      _ref1 = config.alias;
      for (map in _ref1) {
        dirpath = _ref1[map];
        dirpath = path.join(dirs.pwd, dirpath);
        alias && (alias = filepath.indexOf(dirpath) === 0);
      }
    }
    return input || alias;
  };

  Files.prototype.bulk_create_file = function(deps) {
    var dep, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = deps.length; _i < _len; _i++) {
      dep = deps[_i];
      _results.push(this.create_file(dep));
    }
    return _results;
  };

  Files.prototype.refresh_dependents = function(dependents) {
    var dependent, file, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = dependents.length; _i < _len; _i++) {
      dependent = dependents[_i];
      file = _.find(this.files, {
        filepath: dependent.filepath
      });
      if (file != null) {
        _results.push(file.refresh());
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  Files.prototype.watch_file = function(filepath) {
    var dir, watched, watcher,
      _this = this;
    dir = path.dirname(filepath);
    watched = _.find(this.watchers, {
      root: dir
    });
    if (watched == null) {
      this.watchers.push(watcher = fsu.watch(dir));
      watcher.on('create', function(file) {
        return _this.onfschange('create', file);
      });
      watcher.on('change', function(file) {
        return _this.onfschange('change', file);
      });
      return watcher.on('delete', function(file) {
        return _this.onfschange('delete', file);
      });
    }
  };

  Files.prototype.watch_inputs = function() {
    var dirpath, watched, watcher, _i, _len, _ref,
      _this = this;
    _ref = config.input;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      dirpath = _ref[_i];
      watched = _.find(this.watchers, {
        root: dirpath
      });
      if (watched == null) {
        this.watchers.push(watcher = fsu.watch(dirpath, exts));
        watcher.on('create', function(file) {
          return _this.onfschange('create', file);
        });
        watcher.on('change', function(file) {
          return _this.onfschange('change', file);
        });
        watcher.on('delete', function(file) {
          return _this.onfschange('delete', file);
        });
      }
    }
    return null;
  };

  Files.prototype.close_watchers = function() {
    var watcher, _i, _len, _ref, _results;
    _ref = this.watchers;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      watcher = _ref[_i];
      _results.push(watcher.close());
    }
    return _results;
  };

  Files.prototype.onfschange = function(action, file) {
    var dep, depath, depname, dname, dpath, f, found, location, type, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    location = file.location, type = file.type;
    if (type === "dir" && action === "create") {
      return;
    }
    if (type === "dir" && action === "delete") {
      return;
    }
    switch (action) {
      case "create":
        file = this.create_file(location);
        log_created(location);
        return this.compile(file);
      case "delete":
        log_deleted(location);
        file = this.extract_file(location);
        _ref = file.dependencies;
        for (depname in _ref) {
          depath = _ref[depname];
          if (this.is_under_inputs(depath, true)) {
            continue;
          }
          found = 0;
          _ref1 = this.files;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            f = _ref1[_i];
            _ref2 = f.dependencies;
            for (dname in _ref2) {
              dpath = _ref2[dname];
              if (dpath === depath) {
                found++;
              }
            }
          }
          if (!found) {
            this.extract_file(depath);
          }
        }
        if (file.is_partial) {
          _ref3 = file.dependents;
          for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
            dep = _ref3[_j];
            _.find(this.files, {
              filepath: dep.filepath
            }).refresh();
          }
        } else {
          _ref4 = this.files;
          for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
            f = _ref4[_k];
            _ref5 = f.dependencies;
            for (dname in _ref5) {
              dpath = _ref5[dname];
              if (dpath === file.filepath) {
                f.refresh();
              }
            }
          }
        }
        return this.compile(file);
      case "change":
        file = _.find(this.files, {
          filepath: location
        });
        log_changed(location);
        file.refresh();
        return this.compile(file);
    }
  };

  Files.prototype.compile = function(file) {
    switch (file.output) {
      case 'js':
        return compiler.build_js(true);
      case 'css':
        return compiler.build_css(true);
    }
  };

  return Files;

})());

/*
//@ sourceMappingURL=files.map
*/
