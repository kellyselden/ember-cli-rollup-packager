'use strict';

const expect = require('chai').expect;
const expand = require('../../../src/compile').expand;

describe('Unit | Compile | expand', function() {
  describe('module', function() {
    it('doesn\'t end with .js', function() {
      let file = 'foo';

      let result = expand(file);

      expect(result).to.have.members([
        'foo',
        'foo.js',
        'foo/index.js'
      ]);
    });

    it('ends with .js', function() {
      let file = 'foo.js';

      let result = expand(file);

      expect(result).to.have.members([
        'foo',
        'foo.js'
      ]);
    });

    it('ends with index.js', function() {
      let file = 'foo/index.js';

      let result = expand(file);

      expect(result).to.have.members([
        'foo',
        'foo/index',
        'foo/index.js'
      ]);
    });
  });

  describe('relative', function() {
    it('doesn\'t end with .js', function() {
      let file = './foo';

      let result = expand(file);

      expect(result).to.have.members([
        './foo',
        './foo.js',
        './foo/index.js'
      ]);
    });

    it('ends with .js', function() {
      let file = './foo.js';

      let result = expand(file);

      expect(result).to.have.members([
        './foo',
        './foo.js'
      ]);
    });

    it('ends with index.js', function() {
      let file = './foo/index.js';

      let result = expand(file);

      expect(result).to.have.members([
        './foo',
        './foo/index',
        './foo/index.js'
      ]);
    });
  });

  describe('absolute', function() {
    describe('Windows', function() {
      it('doesn\'t end with .js', function() {
        let file = 'C:\\foo';

        let result = expand(file);

        expect(result).to.have.members([
          'C:\\foo',
          'C:\\foo.js',
          'C:\\foo\\index.js'
        ]);
      });

      it('end with .js', function() {
        let file = 'C:\\foo.js';

        let result = expand(file);

        expect(result).to.have.members([
          'C:\\foo',
          'C:\\foo.js'
        ]);
      });

      it('ends with index.js', function() {
        let file = 'C:\\foo\\index.js';

        let result = expand(file);

        expect(result).to.have.members([
          'C:\\foo',
          'C:\\foo\\index',
          'C:\\foo\\index.js'
        ]);
      });
    });

    describe('Unix', function() {
      it('doesn\'t end with .js', function() {
        let file = '/foo';

        let result = expand(file);

        expect(result).to.have.members([
          '/foo',
          '/foo.js',
          '/foo/index.js'
        ]);
      });

      it('end with .js', function() {
        let file = '/foo.js';

        let result = expand(file);

        expect(result).to.have.members([
          '/foo',
          '/foo.js'
        ]);
      });

      it('ends with index.js', function() {
        let file = '/foo/index.js';

        let result = expand(file);

        expect(result).to.have.members([
          '/foo',
          '/foo/index',
          '/foo/index.js'
        ]);
      });
    });
  });
});
