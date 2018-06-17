/* eslint quotes: 0 */
'use strict';

const path = require('path');
const helper = require('broccoli-test-helper');
const td = require('testdouble');
const co = require('co');
const expect = require('chai').expect;
const symlinkOrCopy = require('symlink-or-copy');
const Compile = require('../../src/compile');
const createBuilder = helper.createBuilder;
const createTempDir = helper.createTempDir;

describe('Integration | Compile', function() {
  let appAndAddons, amdModules, nodeModules, output;

  this.timeout(600000);

  [true/* , false, undefined*/].forEach(canSymlink => {

    describe(`- canSymlink: ${canSymlink} -`, function() {

      beforeEach(co.wrap(function *() {
        appAndAddons = yield createTempDir();
        amdModules = yield createTempDir();
        nodeModules = yield createTempDir();

        symlinkOrCopy.setOptions({
          isWindows: process.platform === 'win32',
          fs: require('fs'),
          canSymlink
        });
      }));

      function *compile(options) {
        options = options || {};

        let subject = new Compile([
          appAndAddons.path(),
          amdModules.path()
        ], Object.assign({
          appName: 'my-app',
          projectRoot: nodeModules.path(),
          useNodeModules: true
        }, options));

        output = createBuilder(subject);

        yield output.build();
      }

      afterEach(co.wrap(function *() {
        yield appAndAddons.dispose();
        yield amdModules.dispose();
        yield nodeModules.dispose();
        yield output.dispose();
      }));

      describe('app', function() {
        it('resolves a relative file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from './resolver';\n`,
                'resolver.js': `export default 1;\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from './resolver';\n`,
                'resolver.js': `var resolver = 1;\n\nexport default resolver;\n`
              }
            }
          });
        }));

        it('resolves a relative default file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'lib': {
                  'index.js': `export default 1;\n`
                },
                'app.js': `export { default } from './lib';\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'lib': {
                  'index.js': `var index = 1;\n\nexport default index;\n`
                },
                'app.js': `export { default } from './lib';\n`
              }
            }
          });
        }));

        it('resolves an absolute file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-app/resolver';\n`,
                'resolver.js': `export default 1;\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from './resolver';\n`,
                'resolver.js': `var resolver = 1;\n\nexport default resolver;\n`
              }
            }
          });
        }));

        describe('config/environment', function() {
          it('resolves a relative config/environment', co.wrap(function *() {
            appAndAddons.write({
              'app-tree-output': {
                'my-app': {
                  'app.js': `export { default } from './config/environment';\n`
                }
              }
            });

            yield compile();

            expect(output.read()).to.deep.equal({
              'app-tree-output': {
                'my-app': {
                  'app.js': `export { default } from './config/environment';\n`
                }
              }
            });
          }));

          it('resolves an absolute config/environment', co.wrap(function *() {
            appAndAddons.write({
              'app-tree-output': {
                'my-app': {
                  'app.js': `export { default } from 'my-app/config/environment';\n`
                }
              }
            });

            yield compile();

            expect(output.read()).to.deep.equal({
              'app-tree-output': {
                'my-app': {
                  'app.js': `export { default } from 'my-app/config/environment';\n`
                }
              }
            });
          }));

          it('avoids colliding with my-app/config/environment', co.wrap(function *() {
            appAndAddons.write({
              'app-tree-output': {
                'my-app': {
                  'app.js': `export { default } from './config/environment';\n`
                }
              }
            });

            nodeModules.write({
              'config': {
                'environment.js': `module.exports = function() {};\n`
              }
            });

            yield compile();

            expect(output.read()).to.deep.equal({
              'app-tree-output': {
                'my-app': {
                  'app.js': `export { default } from './config/environment';\n`
                }
              }
            });
          }));
        });

        it('ignores broken imports', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default, foo } from './resolver';\n`,
                'resolver.js': `export default 1;\n`
              }
            }
          });

          let missingExportCallback = td.func();

          yield compile({
            missingExportCallback
          });

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from './resolver';\n`,
                'resolver.js': `var resolver = 1;\n\nexport default resolver;\n`
              }
            }
          });

          td.verify(missingExportCallback(
            'foo',
            path.join(appAndAddons.path(), 'app-tree-output/my-app/app.js'),
            path.join(appAndAddons.path(), 'app-tree-output/my-app/resolver.js'),
            18
          ));
        }));

        it('ignores unused', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'adapters': {
                  'application.js': `export default 1;\n`
                },
                'components': {
                  'application.js': `export default 1;\n`
                },
                'controllers': {
                  'application.js': `export default 1;\n`
                },
                'helpers': {
                  'application.js': `export default 1;\n`
                },
                'initializers': {
                  'application.js': `export default 1;\n`
                },
                'instance-initializers': {
                  'application.js': `export default 1;\n`
                },
                'mixins': {
                  'application.js': `export default 1;\n`
                },
                'models': {
                  'application.js': `export default 1;\n`
                },
                'routes': {
                  'application.js': `export default 1;\n`
                },
                'serializers': {
                  'application.js': `export default 1;\n`
                },
                'services': {
                  'application.js': `export default 1;\n`
                },
                'templates': {
                  'application.js': `export default 1;\n`
                },
                'utils': {
                  'application.js': `export default 1;\n`
                },
                'app.js': `export default 1;\n`,
                'resolver.js': `export default 1;\n`,
                'router.js': `export default 1;\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'adapters': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'components': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'controllers': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'helpers': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'initializers': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'instance-initializers': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'models': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'routes': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'serializers': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'services': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'templates': {
                  'application.js': `var application = 1;\n\nexport default application;\n`
                },
                'app.js': `var app = 1;\n\nexport default app;\n`,
                'router.js': `var router = 1;\n\nexport default router;\n`
              }
            }
          });
        }));

        describe('includeEntireAppTree', function() {
          it('can opt-in to including entire app dir', co.wrap(function *() {
            appAndAddons.write({
              'app-tree-output': {
                'my-app': {
                  'app.js': `export default 1;\n`,
                  'foo.js': `export default 1;\n`
                }
              }
            });

            yield compile({
              includeEntireAppTree: true
            });

            expect(output.read()).to.deep.equal({
              'app-tree-output': {
                'my-app': {
                  'app.js': `var app = 1;\n\nexport default app;\n`,
                  'foo.js': `var foo = 1;\n\nexport default foo;\n`
                }
              }
            });
          }));

          it('can still add non-app files to entry points', co.wrap(function *() {
            appAndAddons.write({
              'addon-tree-output': {
                'my-addon': {
                  'index.js': `export default 1;\n`
                }
              },
              'app-tree-output': {
                'my-app': {
                  'app.js': `export default 1;\n`
                }
              }
            });

            yield compile({
              includeEntireAppTree: true,
              include: ['addon-tree-output/my-addon/index.js']
            });

            expect(output.read()).to.deep.equal({
              'addon-tree-output': {
                'my-addon': {
                  'index.js': `var index = 1;\n\nexport default index;\n`
                }
              },
              'app-tree-output': {
                'my-app': {
                  'app.js': `var app = 1;\n\nexport default app;\n`
                }
              }
            });
          }));
        });
      });

      describe('addon', function() {
        it('resolves an addon file', co.wrap(function *() {
          appAndAddons.write({
            'addon-tree-output': {
              'my-addon': {
                'addon.js': `export default 1;\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'addon-tree-output': {
              'my-addon': {
                'addon.js': `var addon = 1;\n\nexport default addon;\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });
        }));

        it('resolves a default addon file', co.wrap(function *() {
          appAndAddons.write({
            'addon-tree-output': {
              'my-addon': {
                'index.js': `export default 1;\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon';\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'addon-tree-output': {
              'my-addon': {
                'index.js': `var index = 1;\n\nexport default index;\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon';\n`
              }
            }
          });
        }));

        it('resolves a relative addon file', co.wrap(function *() {
          appAndAddons.write({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `export default 1;\n`,
                'addon.js': `export { default } from './foo';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `var foo = 1;\n\nexport default foo;\n`,
                'addon.js': `import './foo';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `import 'my-addon/addon';\nexport { default } from 'my-addon/foo';\n`
              }
            }
          });
        }));

        it('resolves an absolute addon file', co.wrap(function *() {
          appAndAddons.write({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `export default 1;\n`,
                'addon.js': `export { default } from 'my-addon/foo';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `var foo = 1;\n\nexport default foo;\n`,
                'addon.js': `import './foo';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `import 'my-addon/addon';\nexport { default } from 'my-addon/foo';\n`
              }
            }
          });
        }));

        describe('include', function() {
          it('includes app file', co.wrap(function *() {
            appAndAddons.write({
              'app-tree-output': {
                'my-app': {
                  'foo.js': `export default 1;\n`
                }
              }
            });

            yield compile({
              include: [
                'app-tree-output/my-app/foo.js'
              ]
            });

            expect(output.read()).to.deep.equal({
              'app-tree-output': {
                'my-app': {
                  'foo.js': `var foo = 1;\n\nexport default foo;\n`
                }
              }
            });
          }));

          it('includes app dir', co.wrap(function *() {
            appAndAddons.write({
              'app-tree-output': {
                'foo': {
                  'app.js': `export default 1;\n`
                }
              }
            });

            yield compile({
              include: [
                'app-tree-output/foo'
              ]
            });

            expect(output.read()).to.deep.equal({
              'app-tree-output': {
                'foo': {
                  'app.js': `var app = 1;\n\nexport default app;\n`
                }
              }
            });
          }));

          it('includes addon file', co.wrap(function *() {
            appAndAddons.write({
              'addon-tree-output': {
                'my-addon': {
                  'addon.js': `export default 1;\n`
                }
              }
            });

            yield compile({
              include: [
                'addon-tree-output/my-addon/addon.js'
              ]
            });

            expect(output.read()).to.deep.equal({
              'addon-tree-output': {
                'my-addon': {
                  'addon.js': `var addon = 1;\n\nexport default addon;\n`
                }
              }
            });
          }));

          it('includes addon dir', co.wrap(function *() {
            appAndAddons.write({
              'addon-tree-output': {
                'my-addon': {
                  'addon.js': `export default 1;\n`
                }
              }
            });

            yield compile({
              include: [
                'addon-tree-output/my-addon'
              ]
            });

            expect(output.read()).to.deep.equal({
              'addon-tree-output': {
                'my-addon': {
                  'addon.js': `var addon = 1;\n\nexport default addon;\n`
                }
              }
            });
          }));
        });

        it('ignores unused', co.wrap(function *() {
          appAndAddons.write({
            'addon-tree-output': {
              'my-addon': {
                'addon.js': `export default 1;\n`,
                'unused.js': `export default 1;\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'addon-tree-output': {
              'my-addon': {
                'addon.js': `var addon = 1;\n\nexport default addon;\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });
        }));
      });

      describe('AMD', function() {
        it('resolves an AMD module from an app', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });

          amdModules.write({
            'addon-tree-output': {
              'my-addon': {
                'addon.js': `define('my-addon/addon', ['exports'], function (exports) { exports.default = 1; });\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });
        }));

        it('resolves a default AMD module from an app', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon';\n`
              }
            }
          });

          amdModules.write({
            'addon-tree-output': {
              'my-addon': {
                'index.js': `define('my-addon/index', ['exports'], function (exports) { exports.default = 1; });\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon';\n`
              }
            }
          });
        }));

        it('resolves an AMD module from an addon', co.wrap(function *() {
          appAndAddons.write({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `export { default } from 'my-addon/addon';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/foo';\n`
              }
            }
          });

          amdModules.write({
            'addon-tree-output': {
              'my-addon': {
                'addon.js': `define('my-addon/addon', ['exports'], function (exports) { exports.default = 1; });\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `import 'my-addon/addon';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `import 'my-addon/foo';\nexport { default } from 'my-addon/addon';\n`
              }
            }
          });
        }));

        it('resolves a default AMD module from an addon', co.wrap(function *() {
          appAndAddons.write({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `export { default } from 'my-addon';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/foo';\n`
              }
            }
          });

          amdModules.write({
            'addon-tree-output': {
              'my-addon': {
                'index.js': `define('my-addon/index', ['exports'], function (exports) { exports.default = 1; });\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'addon-tree-output': {
              'my-addon': {
                'foo.js': `import 'my-addon';\n`
              }
            },
            'app-tree-output': {
              'my-app': {
                'app.js': `import 'my-addon/foo';\nexport { default } from 'my-addon';\n`
              }
            }
          });
        }));

        it('ignores unused', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });

          amdModules.write({
            'addon-tree-output': {
              'my-addon': {
                'addon.js': `define('my-addon/addon', ['exports'], function (exports) { exports.default = 1; });\n`,
                'unused.js': `define('my-addon/unused', ['exports'], function (exports) { exports.default = 1; });\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'my-addon/addon';\n`
              }
            }
          });
        }));
      });

      describe('node_modules', function() {
        it('resolves a node module file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            }
          });

          nodeModules.write({
            'node_modules': {
              'lodash': {
                'lodash.js': `export default 1;\n`,
                'package.json': `{ "jsnext:main": "index.js" }`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            },
            'node_modules': {
              'lodash': {
                'lodash.js': `var lodash = 1;\n\nexport default lodash;\n`
              }
            }
          });
        }));

        it('resolves a default node module file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash';\n`
              }
            }
          });

          nodeModules.write({
            'node_modules': {
              'lodash': {
                'index.js': `export default 1;\n`,
                'package.json': `{ "jsnext:main": "index.js" }`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash';\n`
              }
            },
            'node_modules': {
              'lodash': {
                'index.js': `var index = 1;\n\nexport default index;\n`
              }
            }
          });
        }));

        it('resolves a relative node module file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            }
          });

          nodeModules.write({
            'node_modules': {
              'lodash': {
                'lodash.js': `export { default } from './_private';\n`,
                '_private.js': `export default 1;\n`,
                'package.json': `{ "jsnext:main": "index.js" }`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `import 'lodash/lodash';\nexport { default } from 'lodash/_private';\n`
              }
            },
            'node_modules': {
              'lodash': {
                'lodash.js': `import './_private';\n`,
                '_private.js': `var _private = 1;\n\nexport default _private;\n`
              }
            }
          });
        }));

        it('resolves a relative default node module file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            }
          });

          nodeModules.write({
            'node_modules': {
              'lodash': {
                'lib': {
                  'index.js': `export default 1;\n`
                },
                'lodash.js': `export { default } from './lib';\n`,
                'package.json': `{ "jsnext:main": "index.js" }`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `import 'lodash/lodash';\nexport { default } from 'lodash/lib';\n`
              }
            },
            'node_modules': {
              'lodash': {
                'lib': {
                  'index.js': `var index = 1;\n\nexport default index;\n`
                },
                'lodash.js': `import './lib';\n`
              }
            }
          });
        }));

        it('resolves an absolute node module file', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            }
          });

          nodeModules.write({
            'node_modules': {
              'lodash': {
                'foo.js': `export default 1;\n`,
                'lodash.js': `export { default } from 'lodash/foo';\n`,
                'package.json': `{ "jsnext:main": "index.js" }`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `import 'lodash/lodash';\nexport { default } from 'lodash/foo';\n`
              }
            },
            'node_modules': {
              'lodash': {
                'foo.js': `var foo = 1;\n\nexport default foo;\n`,
                'lodash.js': `import './foo';\n`
              }
            }
          });
        }));

        it('ignores when turned off', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            }
          });

          nodeModules.write({
            'node_modules': {
              'lodash': {
                'lodash.js': `export default 1;\n`,
                'package.json': `{ "jsnext:main": "index.js" }`
              }
            }
          });

          yield compile({
            useNodeModules: false
          });

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            }
          });
        }));

        it('ignores unused', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            }
          });

          nodeModules.write({
            'node_modules': {
              'lodash': {
                'lodash.js': `export default 1;\n`,
                'unused.js': `export default 1;\n`,
                'package.json': `{ "jsnext:main": "index.js" }`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from 'lodash/lodash';\n`
              }
            },
            'node_modules': {
              'lodash': {
                'lodash.js': `var lodash = 1;\n\nexport default lodash;\n`
              }
            }
          });
        }));
      });

      describe('tree-shaking', function() {
        it('ignores unused exports', co.wrap(function *() {
          appAndAddons.write({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from './foo';\n`,
                'foo.js': `export default 1; export const unused = 1;\n`
              }
            }
          });

          yield compile();

          expect(output.read()).to.deep.equal({
            'app-tree-output': {
              'my-app': {
                'app.js': `export { default } from './foo';\n`,
                'foo.js': `var foo = 1;\n\nexport default foo;\n`
              }
            }
          });
        }));
      });
    });
  });
});
