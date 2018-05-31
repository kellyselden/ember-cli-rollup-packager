'use strict';

const AmdExcluder = require('./amd-excluder');
const NodeModulesMainAlias = require('./node-modules-main-alias');
const Compile = require('./compile');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');

let debugTree = BroccoliDebug.buildDebugCallback('rollup-packager');

module.exports = function rollupPackager(tree, options = {}) {
  let preservedTree = new Funnel(tree, {
    exclude: [
      'addon-tree-output/**/*.js',
      'addon-tree-output/**/*.hbs',
      `${this.name}/**/*.js`
    ]
  });

  let app = new Funnel(tree, {
    include: [`${this.name}/**/*.js`],
    destDir: 'app-tree-output'
  });

  let addons = new Funnel(tree, {
    include: [
      'addon-tree-output/**/*.js',
      'addon-tree-output/**/*.hbs'
    ]
  });

  let amdModules = new AmdExcluder(addons, {
    include: true
  });

  // addons = new AmdExcluder(addons, {
  // });

  addons = this._compileAddonTemplates(addons);

  let appAndAddons = mergeTrees([app, addons]);

  appAndAddons = debugTree(appAndAddons, 'appAndAddons');

  let strippedAppAndAddons = new Compile([appAndAddons, amdModules], {
    appName: this.name,
    include: options.include,
    projectRoot: this.project.root,
    useNodeModules: options.useNodeModules,
    annotation: 'Compile',
    missingExportCallback: (exportName, importingModule, importedModule) => {
      this.project.ui.writeWarnLine(`${importingModule} cannot find '${exportName}' in ${importedModule}`);
    }
  });

  strippedAppAndAddons = debugTree(strippedAppAndAddons, 'strippedAppAndAddons');

  app = new Funnel(strippedAppAndAddons, {
    srcDir: 'app-tree-output'
  });

  addons = new Funnel(strippedAppAndAddons, {
    srcDir: 'app-tree-output',
    destDir: 'app-tree-output'
  });

  let nodeModules = new Funnel(strippedAppAndAddons, {
    srcDir: 'node_modules',
    allowEmpty: true
  });

  let aliases = new NodeModulesMainAlias(nodeModules, {
    projectRoot: this.project.root,
    annotation: 'NodeModulesMainAlias'
  });

  aliases = new Funnel(aliases, {
    destDir: 'vendor',
    annotation: 'Funnel: aliases'
  });

  // this.import('vendor/aliases.js');

  nodeModules = this._compileAddonTree(nodeModules);

  nodeModules = new Funnel(nodeModules, {
    // destDir: 'node_modules',
    destDir: 'addon-tree-output', // for now
    annotation: 'Funnel: node_modules'
  });

  tree = mergeTrees([
    preservedTree,
    app,
    addons,
    nodeModules,
    aliases,
    amdModules
  ]);

  tree = debugTree(tree, 'rollup');

  let sourceTrees = this._legacyPackager(tree);

  tree = mergeTrees(sourceTrees, {
    overwrite: true,
    annotation: 'TreeMerger (_legacyPackager)'
  });

  return tree;
};
