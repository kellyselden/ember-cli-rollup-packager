# ember-cli-rollup-packager

[![npm version](https://badge.fury.io/js/ember-cli-rollup-packager.svg)](https://badge.fury.io/js/ember-cli-rollup-packager)
[![Build Status](https://travis-ci.org/kellyselden/ember-cli-rollup-packager.svg?branch=master)](https://travis-ci.org/kellyselden/ember-cli-rollup-packager)
[![Build status](https://ci.appveyor.com/api/projects/status/5pn7be6cvog1dg7e/branch/master?svg=true)](https://ci.appveyor.com/project/kellyselden/ember-cli-rollup-packager/branch/master)

[Rollup.js](https://rollupjs.org) packager for [Ember CLI](https://ember-cli.com)

## Installation

```
npm install --save-dev ember-cli-rollup-packager ember-cli/ember-cli cross-env
```

## Usage

```js
// ember-cli-build.js
const rollupPackager = require('ember-cli-rollup-packager');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    // Add options here
  });

  app.package = rollupPackager({
    // additional options
  });

  return app.toTree();
};
```

```js
// package.json
{
  "scripts": {
    "packager": "cross-env EMBER_CLI_PACKAGER=true EMBER_CLI_DELAYED_TRANSPILATION=true",
    "prebuild": "npm run packager",
    "prestart": "npm run packager",
    "pretest": "npm run packager"
  }
}
```

## Options

| Option | Description | Type | Examples | Default |
|---|---|---|---|---|
| `useNodeModules` | Search node_modules for imported modules | `boolean` | | `false` |
| `additionalEntryPoints` | Prevent non-standard Ember code from being ejected | `Array` of `String`s | `['app-tree-output/custom-file.js']` | `[]` |
