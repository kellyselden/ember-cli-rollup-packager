'use strict';

const { expect } = require('chai');
const { execSync, spawnSync } = require('child_process');
const resolve = require('resolve');
const path = require('path');

describe('Acceptance | index', function() {
  this.timeout(1200000);

  it('works', function() {
    process.chdir('test/fixtures/my-app');

    execSync('npm install', { stdio: 'inherit' });

    let entryPoint = resolve.sync('ember-cli', { basedir: process.cwd() });
    let bin = path.resolve(entryPoint, '../../../bin/ember');

    let { status } = spawnSync('node', [bin, 'test'], { stdio: 'inherit' });

    expect(status).to.equal(0);
  });
});
