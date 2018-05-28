'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const mergeTrees = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');
const rollupPackager = require('../../../src');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    // Add options here
  });

  process.send('pre package');

  let debugTree = BroccoliDebug.buildDebugCallback('my-app');

  app.package = function _package(fullTree) {
    process.send('package hook called');

    fullTree = debugTree(fullTree, 'pre');

    fullTree = rollupPackager(fullTree);

    fullTree = debugTree(fullTree, 'rollup');

    let sourceTrees = this._legacyPackager(fullTree);

    let tree = mergeTrees(sourceTrees, {
      overwrite: true,
      annotation: 'TreeMerger (_legacyPackager)',
    });

    tree = debugTree(tree, 'post');

    return tree;
  };

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  return app.toTree();
};
