# nifty_lil_tricks_testing/plugin_postgresql

**Note: this package is currently a work in progress**

[![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/testing?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/testing-plugin-postgresql)
[![GitHub License](https://img.shields.io/github/license/jonnydgreen/nifty-lil-tricks-testing?style=flat-square)](https://raw.githubusercontent.com/jonnydgreen/nifty-lil-tricks-testing/main/LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/jonnydgreen/nifty-lil-tricks-testing)
[![codecov](https://codecov.io/gh/jonnydgreen/nifty-lil-tricks-testing/branch/main/graph/badge.svg)](https://codecov.io/gh/jonnydgreen/nifty-lil-tricks-testing)

A nifty li'l plugin for setting up PostgreSQL database instances when testing

## Installation

**Note: this package works with TypeScript v5 or later**

### Deno

```typescript
import { postgreSqlPlugin } from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/mod.ts";
```

### Node.js

```shell
npm install @nifty-lil-tricks/testing-plugin-postgresql
```

## Features

The following features are supported

- Setup a Postgresql server in [Docker](https://www.docker.com/) for testing.
- Setup an existing Postgresql server for testing.
- Run migrations on the configured Postgresql server.
- Seed the configured Postgresql server with data.

### Quick start

Setup a Postgresql server in Docker, run migrations and seed the database with
data as follows:

```typescript
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  MigrationStrategy,
  type PluginConfig,
  postgreSqlPlugin,
  Server,
  ServerStrategy,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/mod.ts";

// In another file, load plugins as follows to generate a setupTests function:
const { setupTests } = setupTestsFactory({ database: postgreSqlPlugin });

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let server: Server;

  beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      database: {
        // Setup server using the Docker strategy
        server: { strategy: ServerStrategy.DOCKER },
        // Run migrations using the SQL strategy
        migrate: {
          strategy: MigrationStrategy.SQL,
        },
        // Seed the database with data
        seed: {
          User: [
            { email: "email 1", name: "name 1" },
            { email: "email 2", name: "name 2" },
          ],
        },
      } as PluginConfig,
    });
    teardownTests = result.teardownTests;
    server = result.outputs.database.output.server;
  });

  afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the postgresql plugin", async () => {
      // Arrange
      const query = `SELECT email, name FROM "User";`;
      const { connection } = server;
      const client = new Client({ tls: { enabled: false }, ...connection });
      await client.connect();

      // Act
      const queryOutput = await client.queryObject(query);
      await client.end();

      // Assert
      assertEquals(queryOutput.rowCount, 2);
    });
  });
});
```

### Existing server

One can also use an existing Postgresql server as follows (note, in this example
an existing server is one also setup using the Docker strategy but in a
`beforeAll` block):

```typescript
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  MigrationStrategy,
  type PluginConfig,
  postgreSqlPlugin,
  Server,
  ServerStrategy,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/mod.ts";

// In another file, load plugins as follows to generate a setupTests function:
const { setupTests } = setupTestsFactory({ database: postgreSqlPlugin });

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let teardownServer: SetupTestsTeardown;
  let server: Server;

  beforeAll(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      database: {
        // Setup server using the Docker strategy
        server: { strategy: ServerStrategy.DOCKER },
      } as PluginConfig,
    });
    teardownServer = result.teardownTests;
    server = result.outputs.database.output.server;
  });

  beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      database: {
        // Setup existing server using the Docker strategy
        server,
        // Run migrations using the SQL strategy
        migrate: {
          strategy: MigrationStrategy.SQL,
        },
        // Seed the database with data
        seed: {
          User: [
            { email: "email 1", name: "name 1" },
            { email: "email 2", name: "name 2" },
          ],
        },
      } as PluginConfig,
    });
    teardownTests = result.teardownTests;
  });

  afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  afterAll(async () => {
    // Teardown server to restore environment after tests have run
    await teardownServer();
  });

  describe("method", () => {
    it("should test something that relies on the postgresql plugin", async () => {
      // Arrange
      const query = `SELECT email, name FROM "User";`;
      const { connection } = server;
      const client = new Client({ tls: { enabled: false }, ...connection });
      await client.connect();

      // Act
      const queryOutput = await client.queryObject(query);
      await client.end();

      // Assert
      assertEquals(queryOutput.rowCount, 2);
    });
  });
});
```

## Examples

Examples can be found
[here](https://github.com/jonnydgreen/nifty-lil-tricks-testing/blob/main/examples/).

## Support

| Platform Version | Supported          | Notes                      |
| ---------------- | ------------------ | -------------------------- |
| Deno `v1`        | :white_check_mark: |                            |
| Node.JS `v18`    | :white_check_mark: | TypeScript v5+ for typings |
| Node.JS `v20`    | :white_check_mark: | TypeScript v5+ for typings |
| Web Browsers     | :x:                | Coming soon                |

**Note:** due to limitations in GitHub Actions, some of the above features are
not able to be automatically tested on the following platforms. However, they
are still supported and will be tested locally before release:

- Windows
- MacOS

## Useful links

- For help or feedback on this project, join us in
  [GitHub Discussions](https://github.com/jonnydgreen/nifty-lil-tricks-testing/discussions)

## License

Nifty li'l tricks postgresql package is 100% free and open-source, under the
[MIT license](https://github.com/jonnydgreen/nifty-lil-tricks-testing/blob/main/LICENSE).

This package is [Treeware](https://treeware.earth). If you use it in production,
then we ask that you
[**buy the world a tree**](https://plant.treeware.earth/jonnydgreen/nifty-lil-tricks-testing)
to thank us for our work. By contributing to the Treeware forest you’ll be
creating employment for local families and restoring wildlife habitats.

## Contributions

[Contributions](https://github.com/jonnydgreen/nifty-lil-tricks-testing/blob/main/CONTRIBUTING.md),
issues and feature requests are very welcome. If you are using this package and
fixed a bug for yourself, please consider submitting a PR!

<p align="center">
  <a href="https://github.com/jonnydgreen/nifty-lil-tricks-testing/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=jonnydgreen/nifty-lil-tricks-testing&columns=8" />
  </a>
</p>
