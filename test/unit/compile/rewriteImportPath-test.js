'use strict';

const path = require('path');
const expect = require('chai').expect;
const Compile = require('../../../src/compile');
const _relative = Compile.relative;
const _rewriteImportPath = Compile._rewriteImportPath;

describe('Unit | Compile | rewriteImportPath', function() {
  let appAndAddons;
  let amdModules;
  let nodeModulesSrc;

  let appDir;
  let addonDir;

  let commonDir;
  let rewriteImportPath;

  beforeEach(function() {
    appAndAddons = path.resolve('/path/to/appAndAddons');
    amdModules = path.resolve('/path/to/amdModules');
    nodeModulesSrc = path.resolve('/path/to/nodeModulesSrc');

    appDir = path.join(appAndAddons, 'app-tree-output/my-app');
    addonDir = path.join(appAndAddons, 'addon-tree-output/my-addon');

    rewriteImportPath = function() {
      return _rewriteImportPath(
        appAndAddons,
        amdModules,
        nodeModulesSrc,
        commonDir
      ).apply(this, arguments);
    };
  });

  function relativeId(root, id) {
    return _relative(appAndAddons, path.join(root, id));
  }

  function relativeParent(root, id) {
    return _relative(commonDir, path.join(root, id));
  }

  it('original addon lookup passes through', function() {
    commonDir = appAndAddons;

    let id = 'my-addon/addon';
    let parent = relativeParent(appDir, 'app.js');

    let result = rewriteImportPath(id, parent);

    expect(result).to.equal('my-addon/addon');
  });

  it('removes .js', function() {
    commonDir = appAndAddons;

    let id = relativeId(addonDir, 'addon.js');
    let parent = relativeParent(appDir, 'app.js');

    let result = rewriteImportPath(id, parent);

    expect(result).to.equal('my-addon/addon');
  });

  it('removes index.js', function() {
    commonDir = appAndAddons;

    let id = relativeId(addonDir, 'index.js');
    let parent = relativeParent(appDir, 'app.js');

    let result = rewriteImportPath(id, parent);

    expect(result).to.equal('my-addon');
  });

  describe('absolute', function() {
    // it('collides with project config/environment', function() {
    //   let id = path.join(projectRoot, 'config/environment.js');
    //   let parent = relative(appDir, 'app.js');

    //   let result = rewriteImportPath(id, parent);

    //   expect(result).to.equal('./config/environment');
    // });

    it('config/environment', function() {
      commonDir = appDir;

      let id = path.join(appDir, 'config/environment.js');
      let parent = relativeParent(appDir, 'app.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('./config/environment');
    });

    it('node_modules', function() {
      commonDir = path.join(nodeModulesSrc, 'lodash');

      let id = path.join(nodeModulesSrc, 'lodash/multiply.js');
      let parent = path.join(nodeModulesSrc, 'lodash/lodash.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('./multiply');
    });
  });

  describe('relative', function() {
    it('app to addon', function() {
      commonDir = appAndAddons;

      let id = relativeId(addonDir, 'addon.js');
      let parent = relativeParent(appDir, 'app.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('my-addon/addon');
    });

    it('app to node_modules', function() {
      commonDir = path.resolve('/path/to');

      let id = relativeId(nodeModulesSrc, 'lodash/multiply.js');
      let parent = relativeParent(appDir, 'app.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('lodash/multiply');
    });

    it('app relative same dir', function() {
      commonDir = appDir;

      let id = relativeId(appDir, 'resolver.js');
      let parent = relativeParent(appDir, 'app.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('./resolver');
    });

    it('app relative different dir', function() {
      commonDir = appDir;

      let id = relativeId(appDir, 'resolver.js');
      let parent = relativeParent(appDir, 'routes/application.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('../resolver');
    });

    it('addon relative same dir', function() {
      commonDir = addonDir;

      let id = relativeId(addonDir, 'addon.js');
      let parent = relativeParent(addonDir, 'index.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('./addon');
    });

    it('addon relative different dir', function() {
      commonDir = addonDir;

      let id = relativeId(addonDir, 'addon.js');
      let parent = relativeParent(addonDir, 'lib/index.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('../addon');
    });

    it('node_modules relative same dir', function() {
      commonDir = path.join(nodeModulesSrc, 'lodash');

      let id = relativeId(nodeModulesSrc, 'lodash/multiply.js');
      let parent = relativeParent(nodeModulesSrc, 'lodash/lodash.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('./multiply');
    });

    it('node_modules relative different dir', function() {
      commonDir = path.join(nodeModulesSrc, 'lodash');

      let id = relativeId(nodeModulesSrc, 'lodash/multiply.js');
      let parent = relativeParent(nodeModulesSrc, 'lodash/lib/index.js');

      let result = rewriteImportPath(id, parent);

      expect(result).to.equal('../multiply');
    });
  });
});
