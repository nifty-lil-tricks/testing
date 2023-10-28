// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.192.0/testing/bdd.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import {
  MigrationStrategy,
  type PluginConfig,
  postgreSqlPlugin,
  Server,
  ServerStrategy,
} from "https://deno.land/x/nifty_lil_tricks_testing/plugin_postgresql/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { dirname, fromFileUrl } from "std/path/mod.ts";

const root = dirname(fromFileUrl(import.meta.url));

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
        migrate: { strategy: MigrationStrategy.SQL, root },
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
