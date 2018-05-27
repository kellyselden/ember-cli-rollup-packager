'use strict';

const fs = require('fs');
const path = require('path');
const BroccoliPlugin = require('broccoli-plugin');

module.exports = class NodeModulesMainAlias extends BroccoliPlugin {
  constructor(tree, options) {
    super([tree], {
      annotation: options.annotation
    });

    this.options = options;
  }

  build() {
    let inputPath = this.inputPaths[0];

    let modules = fs.readdirSync(inputPath);

    let nodeModules = path.join(this.options.projectRoot, 'node_modules');

    let aliases = modules.map(module => {
      let moduleRoot = path.join(nodeModules, module);
      if (!fs.existsSync(path.join(moduleRoot, 'index.js'))) {
        let packageJson = JSON.parse(fs.readFileSync(path.join(moduleRoot, 'package.json'), 'utf8'));
        let main = packageJson['module'] || packageJson['jsnext:main'] || packageJson['main'];
        main = path.resolve(moduleRoot, main);
        main = main.substr(nodeModules.length + 1);
        main = main.replace(/\.js$/, '');
        main = main.replace(/\\/g, '/');
        return `define.alias('${main}', '${module}');`;
      }
    }).filter(Boolean).join('\n');

    fs.writeFileSync(path.join(this.outputPath, 'aliases.js'), aliases);
  }
};
