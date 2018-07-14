'use strict';

const AmdExcluder = require('./amd-excluder');
const NodeModulesMainAlias = require('./node-modules-main-alias');
const Compile = require('./compile');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');

let debugTree = BroccoliDebug.buildDebugCallback('rollup-packager');

module.exports = function _rollupPackager(options = {}) {
  return function rollupPackager(tree) {
    let preservedTree = new Funnel(tree, {
      exclude: [
        'node_modules/**/*.js',
        'node_modules/**/*.hbs',
        `${this.name}/**/*.js`,
        `${this.name}/**/*.hbs`,
        'tests/**/*.js'
      ]
    });

    let app = new Funnel(tree, {
      include: [
        `${this.name}/**/*.js`,
        `${this.name}/**/*.hbs`
      ],
      destDir: 'app-tree-output'
    });

    let addons = new Funnel(tree, {
      include: [
        'node_modules/**/*.js',
        'node_modules/**/*.hbs'
      ]
    });

    let amdModules = new AmdExcluder(addons, {
      include: true
    });

    // addons = new AmdExcluder(addons, {
    // });

    app = this._compileAddonTemplates(app);
    addons = this._compileAddonTemplates(addons);

    let tests = new Funnel(tree, {
      include: ['tests/**/*.js'],
      destDir: `app-tree-output/${this.name}`
    });

    let appAndAddons = mergeTrees([app, addons, tests]);

    appAndAddons = debugTree(appAndAddons, 'appAndAddons');

    let strippedAppAndAddons = new Compile([appAndAddons, amdModules], {
      appName: this.name,
      include: options.additionalEntryPoints,
      includeEntireAppTree: options.includeEntireAppTree,
      projectRoot: this.project.root,
      useNodeModules: options.useNodeModules,
      external: options.externalImports,
      annotation: 'Compile',
      missingExportCallback: (exportName, importingModule, importedModule) => {
        this.project.ui.writeWarnLine(`${importingModule} cannot find '${exportName}' in ${importedModule}`);
      }
    });

    strippedAppAndAddons = debugTree(strippedAppAndAddons, 'strippedAppAndAddons');

    app = new Funnel(strippedAppAndAddons, {
      srcDir: 'app-tree-output',
      exclude: [`${this.name}/tests/**/*.js`]
    });

    addons = new Funnel(strippedAppAndAddons, {
      srcDir: 'node_modules',
      destDir: 'node_modules'
    });

    tests = new Funnel(strippedAppAndAddons, {
      srcDir: `app-tree-output/${this.name}/tests`,
      destDir: 'tests'
    });

    let nodeModules = new Funnel(strippedAppAndAddons, {
      srcDir: 'node_modules-2',
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
      destDir: 'node_modules',
      annotation: 'Funnel: node_modules'
    });

    tree = mergeTrees([
      preservedTree,
      app,
      addons,
      tests,
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
};
