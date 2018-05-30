import Controller from '@ember/controller';
import add from 'lodash-es/add';
import { action } from '@ember-decorators/object';
import { missingExport } from '../app';

if (missingExport) {
  missingExport();
}

export default Controller.extend({
  sum: add(1, 2),

  @action
  unused() {}
});
