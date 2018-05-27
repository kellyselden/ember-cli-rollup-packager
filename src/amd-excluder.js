'use strict';

const fs = require('fs-extra');
const path = require('path');
const Funnel = require('broccoli-funnel');
const walkSync = require('walk-sync');

// Some addons do their own compilation, which means the addon trees will
// be a mix of ES6 and AMD files. This plugin gives us a way to separate the
// files, as we don't want to double compile the AMD code.

// It has a very simple method of detecting AMD code, because we only care
// about babel output, which is pretty consistent.
class AmdExcluder extends Funnel {
  constructor(inputNode, options) {
    options = options || {};
    let _options = {
      annotation: options.annotation
    };
    if (options.include) {
      _options.include = [];
    } else {
      _options.exclude = [];
    }
    super(inputNode, _options);

    this.options = options;
  }

  build() {
    let inputPath = this.inputPaths[0];

    let files = walkSync(inputPath, {
      directories: false,
      globs: ['**/*.js']
    });

    return Promise.all(files.map(file => {
      let inputFilePath = path.join(inputPath, file);
      return fs.readFile(inputFilePath, 'utf8').then(source => {
        if (source.indexOf('define(') === 0) {
          if (this.options.include) {
            this.include.push(file);
          } else {
            this.exclude.push(file);
          }
        }
      });
    })).then(() => {
      super.build();
    });
  }
}

module.exports = AmdExcluder;
