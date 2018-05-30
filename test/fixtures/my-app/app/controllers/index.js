import Controller from '@ember/controller';
import add from 'lodash-es/add';

export default Controller.extend({
  sum: add(1, 2)
});
