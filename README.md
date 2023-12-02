![Nifty li'l tricks Logo](https://raw.githubusercontent.com/nifty-lil-tricks/assets/main/nifty-lil-tricks-logo.png)

# nifty_lil_tricks_testing

**Note: this package and selected plugins are currently a work in progress**

[![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/testing?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/testing)
[![GitHub License](https://img.shields.io/github/license/nifty-lil-tricks/testing?style=flat-square)](https://raw.githubusercontent.com/nifty-lil-tricks/testing/main/LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/nifty-lil-tricks/testing)
[![codecov](https://codecov.io/gh/nifty-lil-tricks/testing/branch/main/graph/badge.svg)](https://codecov.io/gh/nifty-lil-tricks/testing)

A selection of useful utilities (or nifty li'l tricks!) for all things testing.

## Installation

**Note: this package works with TypeScript v5 or later**

### Deno

```typescript
import * as testing from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
```

### Node.js

```shell
npm install @nifty-lil-tricks/testing
```

## Features

The following features are supported

- An extensible setup tests factory that allows one to declaratively setup a
  test suite for testing with loaded plugins through a simple to use interface.
- Teardown functionality for restoring the state of the environment after tests
  have run.
- Ready-made plugins to get started with straight-away.

### Plugins

The following plugins are available to that make use of the setup tests plugin
system.

| Plugin                                                                                           | Description                                                                                                                                                                                                                                                                                                                                                                                 | Status | Npm                                                                                                                                                                                        | Docs                                                                                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [PostgreSQl](https://github.com/nifty-lil-tricks/testing/blob/main/plugin_postgresql/README.md)  | Setup the World's Most Advanced Open Source Relational Database for testing. It has the following features: <br><ul><li>Setup a Postgresql server in [Docker](https://www.docker.com/) for testing.</li><li>Setup an existing Postgresql server for testing.</li><li>Run migrations on the configured Postgresql server.</li><li>Seed the configured Postgresql server with data.</li></ul> | ✅     | [![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/testing-plugin-postgresql?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/testing-plugin-postgresql) | [Docs](https://github.com/nifty-lil-tricks/testing/blob/main/plugin_postgresql/README.md). |
| [NestJS Server](https://github.com/nifty-lil-tricks/testing/blob/main/plugin_nestjs/README.md)   | Setup a progressive Node.js framework for building efficient, reliable and scalable server-side applications for testing.                                                                                                                                                                                                                                                                   | ✅     | [![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/testing-plugin-nestjs?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/testing-plugin-nestjs)         | [Docs](https://github.com/nifty-lil-tricks/testing/blob/main/plugin_nestjs/README.md)      |
| [Express Server](https://github.com/nifty-lil-tricks/testing/blob/main/plugin_express/README.md) | Setup a minimal and flexible Node.js web Express application for testing.                                                                                                                                                                                                                                                                                                                   | 🚧     | [![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/testing-plugin-express?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/testing-plugin-express)       | [Docs](https://github.com/nifty-lil-tricks/testing/blob/main/plugin_express/README.md)     |

### Setup tests

- [Quick start](#quick-start)
- [Setup tests overview](#setup-tests-overview)

#### Quick start

```typescript
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";

// Define or import a plugin as follows:
const helloWorldPlugin = {
  setup: (config: { message: string }) => {
    // Setup plugin according to config
    return {
      output: config,
      teardown: () => {},
    };
  },
};

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  helloWorld: helloWorldPlugin,
});

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let message: string;

  beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      helloWorld: { message: "Hello, world!" },
    });
    message = result.outputs.helloWorld.output.message;
    teardownTests = result.teardownTests;
  });

  afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the plugin being configured", () => {
      // Some other testing
      assertEquals(message, "Hello, world!");
    });
  });
});
```

#### Setup tests overview

##### `setupTestsFactory`

One can use the `setupTestsFactory` to register or load defined plugins. It is
only needed to load these once so it is recommended to share the returned
`setupTests` function across all test files.

Each plugin must be given a name that is not one of the reserved plugin names.
This returns a function that when run, sets up the tests to use the loaded
plugins according to the provided config.

Each plugin must contain the following functions in order to be correctly
loaded:

- `setup`
- `teardown`

An example of a plugin is as follows:

```typescript
import {
  type Plugin,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";

interface HelloWorldConfig {
  message: string;
}

type HelloWorldResult = string;

const helloWorldPlugin: Plugin<HelloWorldConfig, HelloWorldResult> = {
  setup(config: HelloWorldConfig) {
    // Setup plugin according to config
    return {
      output: config.message,
      teardown() {
        // Teardown any setup resources
      },
    };
  },
};
```

##### `setupTests`

One can use the returned `setupTests` function use the loaded plugins.

The loaded plugins available to the setupTests function returned from the
factory can be configured using config namespaced to the name of the plugin.

For example, if the plugin is named `helloWorld`, then the config for that
plugin must be provided under the `helloWorld` namespace.

When run, setupTests will return an object with the data returned from the
plugin invocation. The data will be namespaced to the plugin name. For example:

```typescript
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";

// Define or import a plugin as follows:
const helloWorldPlugin = {
  setup: (config: { message: string }) => {
    // Setup plugin according to config
    return {
      output: config.message,
      teardown: () => {
        // Teardown any setup resources
      },
    };
  },
};

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  helloWorld: helloWorldPlugin,
});

const result = await setupTests({
  helloWorld: { message: "Hello, world!" },
});

result.outputs.helloWorld.output; // "Hello, world!"
```

Only plugins that are configured will be run. If a plugin is not configured,
then it will not be run. The order of the plugins in the config is defined the
order in which they defined in the config object. This follows the rules as
defined
[here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in#description).

The returned object will also contain a `teardown` function that when run, will
teardown the plugins in the reverse order that they were setup.

##### `teardownTests`

One can use the returned `teardownTests` function to restore the environment to
its original state after the tests have run.

For example:

```typescript
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";

// Define or import a plugin as follows:
const helloWorldPlugin = {
  setup: (config: { message: string }) => {
    // Setup plugin according to config
    return {
      output: config.message,
      teardown: () => {
        // Teardown any setup resources
      },
    };
  },
};

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  helloWorld: helloWorldPlugin,
});

const result = await setupTests({
  helloWorld: { message: "Hello, world!" },
});

// Teardown tests to restore environment after tests have run
await result.teardownTests();
```

### API

The API Docs can be found [here](https://deno.land/x/nifty_lil_tricks_testing).

## Examples

Examples can be found
[here](https://github.com/nifty-lil-tricks/testing/blob/main/examples/).

## Support

| Platform Version | Supported          | Notes                      |
| ---------------- | ------------------ | -------------------------- |
| Deno `v1`        | :white_check_mark: |                            |
| Node.JS `v18`    | :white_check_mark: | TypeScript v5+ for typings |
| Node.JS `v20`    | :white_check_mark: | TypeScript v5+ for typings |
| Web Browsers     | :x:                | Coming soon                |

## Useful links

- For help or feedback on this project, join us in
  [GitHub Discussions](https://github.com/nifty-lil-tricks/testing/discussions)

## License

Nifty li'l tricks packages are 100% free and open-source, under the
[MIT license](https://github.com/nifty-lil-tricks/testing/blob/main/LICENSE).

This package is [Treeware](https://treeware.earth). If you use it in production,
then we ask that you
[**buy the world a tree**](https://plant.treeware.earth/nifty-lil-tricks/testing)
to thank us for our work. By contributing to the Treeware forest you’ll be
creating employment for local families and restoring wildlife habitats.

## Contributions

[Contributions](https://github.com/nifty-lil-tricks/testing/blob/main/CONTRIBUTING.md),
issues and feature requests are very welcome. If you are using this package and
fixed a bug for yourself, please consider submitting a PR!

<p align="center">
  <a href="https://github.com/nifty-lil-tricks/testing/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=nifty-lil-tricks/testing&columns=8" />
  </a>
</p>
