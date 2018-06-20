'use strict';

const { expect } = require('chai');
const { execSync, spawn } = require('child_process');
const resolve = require('resolve');
const path = require('path');

describe('Acceptance | index', function() {
  this.timeout(300000);

  it('works', function() {
    process.chdir('test/fixtures/my-app');

    execSync('yarn install', { stdio: 'inherit' });

    let entryPoint = resolve.sync('ember-cli', { basedir: process.cwd() });
    let bin = path.resolve(entryPoint, '../../../bin/ember');
    let relative = bin.substr(process.cwd().length + 1);

    let ps = spawn('node', [relative, 'test'], {
      stdio: ['ipc', 'inherit', 'inherit'],
      env: Object.assign({
        EMBER_CLI_PACKAGER: 'true',
        EMBER_CLI_DELAYED_TRANSPILATION: 'true'
      }, process.env)
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
    });
  });
});
