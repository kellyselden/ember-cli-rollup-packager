'use strict';

const { expect } = require('chai');
const { spawnSync } = require('child_process');
const resolve = require('resolve');
const path = require('path');

describe('Acceptance | index', function() {
  this.timeout(60000);

  it('works', function() {
    process.chdir('test/fixtures/my-app');

    let entryPoint = resolve.sync('ember-cli', { basedir: process.cwd() });
    let bin = path.resolve(entryPoint, '../../../bin/ember');

    let { status } = spawnSync('node', [bin, 'test'], { stdio: 'inherit' });

    expect(status).to.equal(0);
  });
});
