import Controller from '@ember/controller';
import add from 'lodash-es/add';
import { action } from '@ember-decorators/object';

export default Controller.extend({
  sum: add(1, 2),

  @action
  unused() {}
});
