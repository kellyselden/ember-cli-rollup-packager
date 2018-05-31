'use strict';

const fs = require('fs');
const path = require('path');
const BroccoliPlugin = require('broccoli-plugin');
const commondir = require('commondir');

const appFiles = [
  'app.js',
  'router.js'
];

const appDirs = [
  'components',
  'controllers',
  'helpers',
  'initializers',
  'instance-initializers',
  'routes',
  'services',
  'templates'
];

const emberDataDirs = [
  'adapters',
  'models',
  'serializers'
];

// suppress not found warnings
const externals = [
  'ember',
  'jquery',
  'rsvp',
  'require'
];
const externalScopes = [
  '@ember',
  '@glimmer'
];

function expand(id) {
  let sep = id.includes('\\') ? '\\' : '/';
  let ids = [id];
  if (id.endsWith('.js')) {
    ids.push(id.substr(0, id.length - 3));
    if (id.match(/[/\\]index\.js$/)) {
      ids.push(id.substr(0, id.length - 9));
    }
  } else {
    ids.push(`${id}.js`);
    if (!id.match(/[/\\]index$/)) {
      ids.push(`${id}${sep}index.js`);
    }
  }
  return ids;
}

function buildEntryPoint(appAndAddons, appDir, include, includeEntireAppTree) {
  const walkSync = require('walk-sync');

  let entryPoints;
  if (includeEntireAppTree) {
    entryPoints = [appDir];
  } else {
    entryPoints = include.map(i => path.join(appAndAddons, i));
  }

  let autoInclude = appDirs;
  let emberData = true;
  if (emberData) {
    autoInclude = autoInclude.concat(emberDataDirs);
  }

  entryPoints = entryPoints.concat(
    autoInclude.concat(appFiles).map(dir => path.join(appDir, dir))
  );

  entryPoints = entryPoints.reduce((entryPoints, dir) => {
    try {
      let stats = fs.statSync(dir);
      if (stats.isFile()) {
        entryPoints.push(dir);
      } else if (stats.isDirectory()) {
        entryPoints = entryPoints.concat(walkSync(dir, {
          directories: false,
          globs: ['**/*.js']
        }).map(file => path.join(dir, file)));
      }
    } catch (err) {
      // do nothing
    }
    return entryPoints;
  }, []);

  return entryPoints;
}

function buildConfigPaths(appDir, appName, projectRoot) {
  return [].concat(expand(
    // './config/environment'
    path.join(appDir, 'config/environment')
  )).concat(expand(
    // 'my-app/config/environment'
    `${appName}/config/environment`
  )).concat(expand(
    // workaround for the node_modules resolver
    // finding the project's config
    path.join(projectRoot, 'config/environment')
  ));
}

function _shouldPreservePath(
  appAndAddons,
  amdModules,
  // nodeModulesSrc,
  // entryPoints,
  config
) {
  // const resolve = require('resolve');

  function findAmd(id/* , parent*/) {
    if (id.startsWith(appAndAddons)) {
      let x = amdModules + id.substr(appAndAddons.length);
      return expand(x).some(fs.existsSync);
    }
    // if (id.startsWith('.')) {
    //   try {
    //     let resolved = resolve.sync(id, {
    //       basedir: path.dirname(amdModules + parent.substr(appAndAddons.length)),
    //     });
    //     if (resolved) {
    //       return true;
    //     }
    //   } catch (err) {
    //     // continue
    //   }
    // }
    // try {
    //   let resolved = resolve.sync(id, {
    //     basedir: amdModules,
    //     moduleDirectory: 'addon-tree-output',
    //   });
    //   if (resolved) {
    //     return true;
    //   }
    // } catch (err) {
    //   return false;
    // }
  }

  return function shouldPreservePath(id, parent) {
    if (config.indexOf(id) > -1) {
      return true;
    }
    if (externals.indexOf(id) > -1) {
      return true;
    }
    if (externalScopes.some(scope => id.startsWith(`${scope}/`))) {
      return true;
    }
    // if (entryPoints.indexOf(id) > -1) {
    //   return false;
    // }
    // if (id.startsWith(nodeModulesSrc)) {
    //   return false;
    // }
    if (findAmd(id, parent)) {
      return true;
    }
  };
}

function moveNodeModules(
  nodeModulesSrc,
  nodeModulesDest,
  plugins,
  config,
  foundModules
) {
  return {
    resolveId(importee, importer) {
      importer = tryMove(importer, nodeModulesDest, nodeModulesSrc) || importer;

      return plugins.reduce((promise, plugin) => {
        let resolveId = plugin.originalResolveId;
        return promise.then(id => {
          if (id) {
            return id;
          }

          return resolveId && resolveId(importee, importer);
        });
      }, Promise.resolve()).then(id => {
        // workaround for the node_modules resolver
        // finding the project's config
        if (config.includes(id)) {
          return;
        }

        if (!id && !importer) {
          id = importee;
        }

        id = tryMove(id, nodeModulesSrc, nodeModulesDest) || id;

        if (id) {
          foundModules.add(id);
        }

        return id;
      });
    }
  };
}

function normalize(id) {
  return id.replace(/\\/g, '/');
}

function relative(from, to) {
  let rel = normalize(path.relative(from, to));
  if (!rel.startsWith('.')) {
    // `path.relative` leaves off the prefix './'
    // when files are right next to each other,
    // but we want it
    rel = `./${rel}`;
  } else {
    // already has a prefix of '../'
    // because files were not right next to each other
  }
  return rel;
}

function tryMove(file, from, to) {
  if (file && file.startsWith(from)) {
    let oldFile = file.substr(from.length + 1);
    return path.join(to, oldFile);
  }
}

function rebaseAbsolute(from, to, baseDir) {
  let relative = path.relative(from, baseDir);
  return path.resolve(to, relative);
}

function rebaseRelative(from, to, baseDir) {
  let absolute = path.resolve(baseDir, from);
  let wasAlreadyAbsolute = from === absolute;
  if (wasAlreadyAbsolute) {
    return absolute;
  }
  return relative(to, absolute);
}

function getCommonDir(foundModules) {
  foundModules = Array.from(foundModules);
  if (foundModules.length === 1) {
    return path.dirname(foundModules[0]);
  } else {
    return commondir(foundModules);
  }
}

function _rewriteImportPath(
  appAndAddons,
  amdModules,
  nodeModulesSrc,
  commonDir
) {
  return function rewriteImportPath(id, parent) {
    parent = rebaseRelative(parent, appAndAddons, commonDir);
    let newPath = id;
    function withinBoundary() {
      newPath = relative(path.dirname(parent), newPath);
    }
    let absolute = path.resolve(appAndAddons, newPath);
    if (absolute.startsWith(nodeModulesSrc)) {
      if (path.resolve(appAndAddons, parent).startsWith(nodeModulesSrc)) {
        // app references node_modules
        withinBoundary();
      } else {
        // linking between files in a module
        newPath = normalize(absolute.substr(nodeModulesSrc.length + 1));
      }
    } else {
      if (newPath.startsWith(appAndAddons)) {
        // a relative config/environment comes through here
        newPath = relative(appAndAddons, newPath);
      }
      // if (newPath[0] === '.') {
      //   let x = path.resolve(appAndAddons, newPath);
      //   if (x.startsWith(amdModules)) {
      //     newPath = relative(amdModules, x);
      //   }
      // }
      let matched = (/^\.\/app-tree-output\/([^/]+)(.*)/).exec(newPath);
      if (matched) {
        // linking between files in an app
        withinBoundary();
      } else {
        let matched = (/^\.\/addon-tree-output\/([^/]+)(.*)/).exec(newPath);
        if (matched) {
          let addon = matched[1];
          if (!parent.startsWith(`./addon-tree-output/${addon}`)) {
            // app references addon
            newPath = `${addon}${matched[2]}`;
          } else {
            // linking between files in an addon
            withinBoundary();
          }
        }
      }
    }
    return newPath.replace(/\.js$/, '').replace(/\/index$/, '');
  };
}

class Compile extends BroccoliPlugin {
  constructor(trees, options) {
    super(trees, {
      annotation: options.annotation
    });

    this.options = options;
  }

  build() {
    let appAndAddons = this.inputPaths[0];
    let amdModules = this.inputPaths[1];
    let destDir = this.outputPath;

    let options = this.options;
    let appName = options.appName;
    let projectRoot = options.projectRoot;
    let missingExportCallback = options.missingExportCallback || function() {};
    let include = options.include || [];
    let includeEntireAppTree = options.includeEntireAppTree;
    let useNodeModules = options.useNodeModules;

    const rollup = require('rollup');
    const resolvePlugin = require('rollup-plugin-node-resolve');
    const amd = require('rollup-plugin-amd');

    let appDir = path.join(appAndAddons, 'app-tree-output', appName);

    // let amdFiles = walkSync(amdModules, {
    //   directories: false,
    //   // globs: [`**/*.js`],
    // });

    // amdFiles = amdFiles.map(file => file.replace(/^addon-tree-output\//, ''));

    let entryPoints = buildEntryPoint(
      appAndAddons,
      appDir,
      include,
      includeEntireAppTree
    );

    let nodeModulesSrc = path.join(projectRoot, 'node_modules');
    let nodeModulesDest = path.join(appAndAddons, 'node_modules');

    let config = buildConfigPaths(appDir, appName, projectRoot);

    let shouldPreservePath = _shouldPreservePath(
      appAndAddons,
      amdModules,
      // nodeModulesSrc,
      // entryPoints,
      config
    );

    let foundModules = new Set();

    let appAndAddonsPlugin = resolvePlugin({
      customResolveOptions: {
        // package: { main: 'index.js' },
        moduleDirectory: [
          'addon-tree-output',
          'app-tree-output' // for self references (ie 'my-app/utils/foo')
        ]
      }
    });

    let nodeModulesPlugin = useNodeModules ? resolvePlugin({
      jsnext: true,
      customResolveOptions: {
        basedir: projectRoot
      }
    }) : {};

    let plugins = [
      appAndAddonsPlugin,
      nodeModulesPlugin
    ];

    for (let plugin of plugins) {
      plugin.originalResolveId = plugin.resolveId;
      delete plugin.resolveId;
    }

    return rollup.rollup({
      input: entryPoints,
      plugins: [
        amd(),
        // {
        //   name: 'hbs',
        //   transform(hbs, id) {
        //     if (id.slice(-5) !== '.hbs') return null;
        //     let x = registry.load().load('template')[0];
        //     let y = x.processString(hbs);
        //     return { code: y };
        //   },
        // },
        // {
        //   resolveId(importee, importer) {
        //     if (importee.startsWith('.')) {
        //       try {
        //         let resolved = resolve.sync(importee, {
        //           basedir: path.dirname(amdModules + importer.substr(appAndAddons.length)),
        //         });
        //         return resolved;
        //       } catch (err) {
        //         // continue
        //       }
        //     }
        //   },
        // },
        appAndAddonsPlugin,
        nodeModulesPlugin,
        moveNodeModules(
          nodeModulesSrc,
          nodeModulesDest,
          plugins,
          config,
          foundModules
        ),
        {
          load(id) {
            id = tryMove(id, nodeModulesDest, nodeModulesSrc);
            if (id) {
              return fs.readFileSync(id, 'utf-8');
            }
          }
        },
        {
          // moduleDest(file) {
          //   let id = path.resolve(appAndAddons, file);
          //   id = tryMove(id, nodeModulesSrc, nodeModulesDest);
          //   if (id) {
          //     return path.relative(destDir, id);
          //   }
          // },
          missingExport(module, name, otherModule, start) {
            missingExportCallback(name, module, otherModule, start);
            return true;
          }
        }
      ],
      external: shouldPreservePath,
      preserveSymlinks: true,
      // experimentalDynamicImport: true,
      experimentalPreserveModules: true
      // inputRelativeDir: appAndAddons,
    }).then(bundle => {
      let commonDir = getCommonDir(foundModules);
      let dir = rebaseAbsolute(appAndAddons, destDir, commonDir);

      let rewriteImportPath = _rewriteImportPath(
        appAndAddons,
        amdModules,
        nodeModulesDest,
        commonDir
      );

      return bundle.write({
        dir,
        format: 'es',
        paths: rewriteImportPath
      });
    });
  }
}

module.exports = Compile;
module.exports.expand = expand;
module.exports._rewriteImportPath = _rewriteImportPath;
module.exports.relative = relative;
