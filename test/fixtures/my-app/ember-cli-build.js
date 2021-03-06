'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const BroccoliDebug = require('broccoli-debug');
const rollupPackager = require(
  // yarn 1.7.0 doesn't do well with `file:../../..` links
  process.env.CI ? 'ember-cli-rollup-packager' : '../../../src'
);

module.exports = function(defaults) {
  if (process.send) {
    process.send('pre package');
  }

  let debugTree = BroccoliDebug.buildDebugCallback('my-app');

  let _rollupPackager = rollupPackager({
    useNodeModules: true,
    externalImports: ['pretender'],
    additionalRollupInputOptions: {
      treeshake: {
        pureExternalModules: true,
        propertyReadSideEffects: false
      }
    }
  });

  let app = new EmberApp(defaults, {
    package(fullTree) {
      if (process.send) {
        process.send('package hook called');
      }

      fullTree = debugTree(fullTree, 'pre');

      fullTree = _rollupPackager.call(this, fullTree);

      fullTree = debugTree(fullTree, 'post');

      return fullTree;
    }
  });

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
