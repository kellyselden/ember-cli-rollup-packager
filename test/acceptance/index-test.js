'use strict';

const chai = require('chai');
const { execSync, spawn } = require('child_process');
const resolve = require('resolve');
const path = require('path');
const chaiFiles = require('chai-files');

chai.use(chaiFiles);

const { expect } = chai;
const { file } = chaiFiles;

const appDir = 'test/fixtures/my-app';

describe('Acceptance | index', function() {
  this.timeout(300000);

  it('works', function() {
    execSync('yarn install', {
      stdio: 'inherit',
      cwd: appDir
    });

    let entryPoint = resolve.sync('ember-cli', { basedir: appDir });
    let bin = path.resolve(entryPoint, '../../../bin/ember');
    let relative = bin.substr(process.cwd().length + 1 + appDir.length + 1);

    let ps = spawn('node', [relative, 'build'], {
      stdio: ['ipc', 'inherit', 'inherit'],
      cwd: appDir
    });

    let isBuilding;
    let wasPackageHookCalled;

    return new Promise(resolve => {
      ps.on('message', message => {
        switch (message) {
          case 'pre package':
            isBuilding = true;
            break;
          case 'package hook called':
            wasPackageHookCalled = true;
            break;
        }
      });

      ps.on('close', resolve);
    }).then(status => {
      expect(status).to.equal(0);
      expect(isBuilding).to.be.ok;
      expect(wasPackageHookCalled).to.be.ok;

      let app = file(path.resolve(appDir, 'dist/assets/my-app.js'));
      let tests = file(path.resolve(appDir, 'dist/assets/tests.js'));

      expect(app).to.not.match(/define\(['"]my-app\/unused['"]/m);

      expect(tests).to.match(/define\(['"]my-app\/tests\/acceptance\/index-test['"]/m);
      expect(tests).to.match(/define\(['"]my-app\/tests\/helpers\/imported-from-tests['"]/m);
      expect(app).to.match(/define\(['"]my-app\/imported-from-tests['"]/m);

      for (let file of [
        app,
        tests
      ]) {
        expect(file).to.not.match(/define\(['"]app-tree-output\//m);
        expect(file).to.not.match(/define\(['"]tests\//m);
      }
    });
  });
});
