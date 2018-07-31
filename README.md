# ember-cli-rollup-packager

[![npm version](https://badge.fury.io/js/ember-cli-rollup-packager.svg)](https://badge.fury.io/js/ember-cli-rollup-packager)
[![Build Status](https://travis-ci.org/kellyselden/ember-cli-rollup-packager.svg?branch=master)](https://travis-ci.org/kellyselden/ember-cli-rollup-packager)
[![Build status](https://ci.appveyor.com/api/projects/status/5pn7be6cvog1dg7e/branch/master?svg=true)](https://ci.appveyor.com/project/kellyselden/ember-cli-rollup-packager/branch/master)

[Rollup.js](https://rollupjs.org) packager for [Ember CLI](https://ember-cli.com)

## Prerequisites

Make sure your app works with ember-cli master first.

## Installation

```
npm install --save-dev ember-cli-rollup-packager kellyselden/ember-cli#content-funnel
```

## Usage

```js
// ember-cli-build.js
const rollupPackager = require('ember-cli-rollup-packager');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    package: rollupPackager({
      // options
    })
  });

  return app.toTree();
};
```

```js
// .ember-cli
{
  "environment": {
    "EMBER_CLI_PACKAGER": true,
    "EMBER_CLI_DELAYED_TRANSPILATION": true
  }
}
```

## Options

| Option | Description | Type | Examples | Default |
|---|---|---|---|---|
| `useNodeModules` | Search node_modules for imported modules. This is not on by default because shims can be mistaken for real modules. See option `externalImports` for more info. | `boolean` | | `false` |
| `additionalEntryPoints` | Prevent non-standard Ember code from being ejected. Some addons have their own conventions that you need to manually enter in. | `Array` of `String`s | `['app-tree-output/custom-file.js']` | `[]` |
| `includeEntireAppTree` | Include all non-standard Ember code from the "app" folder. This may be easier than using `additionalEntryPoints`, but eliminates some tree-shaking of the app. | `boolean` | | `false` |
| `externalImports` | Mark shims as external. This suppresses warnings and prevents a different module with the same name from being found in node_modules. | `Array` of `String`s | `['pretender']` | `[]` |
| `additionalRollupInputOptions` | Supply additional input options to affect the Rollup output. | `Object` | `{ treeshake: { pureExternalModules: true } }` | `{}` |
