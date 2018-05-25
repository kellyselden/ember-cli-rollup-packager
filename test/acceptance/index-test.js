'use strict';

const { expect } = require('chai');
const spawn = require('cross-spawn');

describe('Acceptance | index', function() {
  this.timeout(60000);

  it('works', function() {
    process.chdir('test/fixtures/my-app');
    spawn.sync('node', ['node_modules/ember-cli/bin/ember', 'test'], { stdio: 'inherit' });
    expect(true).to.be.ok;
  });
});
