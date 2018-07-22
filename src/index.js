'use strict';

const fs = require('fs');
const path = require('path');
const NodeModulesMainAlias = require('./node-modules-main-alias');
const Compile = require('./compile');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');

// compilcated enough to prevent false positives
// covers the following:
// define([], function () {
// define(["exports"], function (exports) {
// define("my custom module name", [], function () {
const AmdRegex = /^define\(.*\[.*\], function \(.*\) {$/;

const debugTree = BroccoliDebug.buildDebugCallback('rollup-packager');

module.exports = function _rollupPackager(options = {}) {
  return function rollupPackager(tree) {
    let preservedTree = new Funnel(tree, {
      exclude: [
        'addon-tree-output/**/*.js',
        'addon-tree-output/**/*.hbs',
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
        'addon-tree-output/**/*.js',
        'addon-tree-output/**/*.hbs'
      ]
    });

    let preAmdAddons = addons;
    let amdModules = new Funnel(addons, {
      include: [relativePath => {
        let [inputPath] = preAmdAddons.inputPaths;
        let absolutePath = path.resolve(inputPath, relativePath);
        // if `include` was promise-aware,
        // we could make this faster
        let string = fs.readFileSync(absolutePath, 'utf8');
        return AmdRegex.test(string);
      }]
    });

    // addons = new AmdExcluder(addons, {
    // });

    app = this._compileAddonTemplates(app);
    addons = this._compileAddonTemplates(addons);

    let tests = new Funnel(tree, {
      include: ['tests/**/*.js'],
      destDir: `app-tree-output/${this.name}`
    });

    let appAndAddons = mergeTrees([app, addons, tests], {
      // mirage can do weird things with files in both
      // tests/ and app/tests/ (percy-web)
      overwrite: true
    });

    appAndAddons = debugTree(appAndAddons, 'appAndAddons');

    let strippedAppAndAddons = new Compile([appAndAddons, amdModules], {
      appName: this.name,
      include: options.additionalEntryPoints,
      includeEntireAppTree: options.includeEntireAppTree,
      projectRoot: this.project.root,
      useNodeModules: options.useNodeModules,
      external: options.externalImports,
      additionalInputOptions: options.additionalRollupInputOptions,
      annotation: 'Compile'
      // missingExportCallback: (exportName, importingModule, importedModule) => {
      //   this.project.ui.writeWarnLine(`${importingModule} cannot find '${exportName}' in ${importedModule}`);
      // }
    });

    strippedAppAndAddons = debugTree(strippedAppAndAddons, 'strippedAppAndAddons');

    app = new Funnel(strippedAppAndAddons, {
      srcDir: 'app-tree-output',
      exclude: [`${this.name}/tests/**/*.js`]
    });

    addons = new Funnel(strippedAppAndAddons, {
      srcDir: 'addon-tree-output',
      destDir: 'addon-tree-output'
    });

    tests = new Funnel(strippedAppAndAddons, {
      srcDir: `app-tree-output/${this.name}/tests`,
      destDir: 'tests'
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
      tests,
      nodeModules,
      aliases,
      amdModules
    ]);

    tree = debugTree(tree, 'rollup');

    tree = this._legacyPackage(tree);

    return tree;
  };
};
