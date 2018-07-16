import { module, test } from 'qunit';
import { visit, currentURL, find } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import foo from 'my-app/imported-from-tests';
import bar from 'my-app/tests/helpers/imported-from-tests';
import baz from 'my-addon/test-support/imported-from-tests';

foo();
bar();
baz();

module('Acceptance | index', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /', async function(assert) {
    await visit('/');

    assert.equal(currentURL(), '/');

    assert.equal(find('#sum').textContent, '3');
  });
});
