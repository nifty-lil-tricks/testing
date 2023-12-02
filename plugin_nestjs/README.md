# nifty_lil_tricks_testing/plugin_nestjs

**Note: this package is currently a work in progress**

[![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/testing-plugin-nestjs?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/testing-plugin-nestjs)
[![GitHub License](https://img.shields.io/github/license/nifty-lil-tricks/testing?style=flat-square)](https://raw.githubusercontent.com/nifty-lil-tricks/testing/main/LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/nifty-lil-tricks/testing)
[![codecov](https://codecov.io/gh/nifty-lil-tricks/testing/branch/main/graph/badge.svg)](https://codecov.io/gh/nifty-lil-tricks/testing)

A nifty li'l plugin for setting up PostgreSQL database instances when testing

## Installation

**Note: this package works with TypeScript v5 or later**

### Deno

```typescript
import { nestJsPlugin } from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
```

### Node.js

```shell
npm install @nifty-lil-tricks/testing-plugin-nestjs
```

## Features

The following features are supported:

- Setup a NestJS server for testing.
- Override the NestJS server providers.
- Override the NestJS server modules.

### Quick start

Setup a NestJS server as follows:

```typescript
// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std/testing/bdd.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import {
  nestJsPlugin,
  type PluginConfig,
} from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";

// In another file, load plugins as follows to generate a setupTests function:
const { setupTests } = setupTestsFactory({ server: nestJsPlugin });

// In another file, define a NestJS app as follows:

@Controller()
export class BasicAppController {
  @Get("/hello")
  getHello(): string {
    return "Hello, world!";
  }
}

@Module({
  imports: [],
  controllers: [BasicAppController],
})
export class BasicAppModule {}

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let origin: string;

  beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      server: {
        appModule: BasicAppModule,
      } as PluginConfig,
    });
    teardownTests = result.teardownTests;
    origin = result.outputs.server.output.origin;
  });

  afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the nestjs plugin", async () => {
      // Arrange & Act
      const response = await fetch(new URL("/hello", origin));

      // Assert
      assertEquals(response.status, 200);
      assertEquals(await response.text(), "Hello, world!");
    });
  });
});
```

### With overrides

One can also use define a NestJS app with testing overrides to allow one to mock
out dependencies where needed. For example, module overrides:

```typescript
// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std/testing/bdd.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import {
  nestJsPlugin,
  type PluginConfig,
} from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";

// In another file, load plugins as follows to generate a setupTests function:
const { setupTests } = setupTestsFactory({ server: nestJsPlugin });

// In another file, define a NestJS app as follows:

@Controller()
export class BasicAppController {
  @Get("/hello")
  getHello(): string {
    return "Hello, world!";
  }
}

@Module({
  imports: [],
  controllers: [BasicAppController],
})
export class BasicAppModule {}

// In another file, define a NestJS app overrides for testing as follows:
@Controller()
class NewAppController {
  @Get("/hello")
  getHello(): string {
    return "Ahoy!";
  }
}
@Module({
  controllers: [NewAppController],
})
class NewModule {}

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let origin: string;

  beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      server: {
        appModule: BasicAppModule,
        modules: [{
          moduleToOverride: BasicAppModule,
          newModule: NewModule,
        }],
      } as PluginConfig,
    });
    teardownTests = result.teardownTests;
    origin = result.outputs.server.output.origin;
  });

  afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the nestjs plugin", async () => {
      // Arrange & Act
      const response = await fetch(new URL("/hello", origin));

      // Assert
      assertEquals(response.status, 200);
      assertEquals(await response.text(), "Ahoy!");
    });
  });
});
```

### API

The API Docs can be found
[here](https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts).

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

Nifty li'l tricks nestjs package is 100% free and open-source, under the
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
