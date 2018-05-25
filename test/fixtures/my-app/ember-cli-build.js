'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    // Add options here
  });

  process.send('pre package');

  app.package = function _package(fullTree) {
    process.send('package hook called');

    let javascriptTree = this._defaultPackager.packageJavascript(fullTree);
    let stylesTree = this._defaultPackager.packageStyles(fullTree);
    let appIndex = this._defaultPackager.processIndex(fullTree);
    let additionalAssets = this._defaultPackager.importAdditionalAssets(fullTree);
    let publicTree = this._defaultPackager.packagePublic(fullTree);

    let sourceTrees = [
      appIndex,
      javascriptTree,
      stylesTree,
      additionalAssets,
      publicTree
    ].filter(Boolean);

    if (this.tests) {
      sourceTrees.push(this._defaultPackager.packageTests(fullTree));
    }

    return sourceTrees;
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
