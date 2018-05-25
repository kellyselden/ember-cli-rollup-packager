'use strict';

const { expect } = require('chai');
const { spawnSync } = require('child_process');

describe('Acceptance | index', function() {
  this.timeout(60000);

  it('works', function() {
    process.chdir('test/fixtures/my-app');
    spawnSync('node', ['node_modules/ember-cli/bin/ember', 'test'], { stdio: 'inherit' });
    expect(true).to.be.ok;
  });
});
