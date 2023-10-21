// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.192.0/testing/bdd.ts";
import { assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import { postgreSqlDatabasePlugin } from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/mod.ts";
import { PostgreSqlDatabaseServer } from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/plugin.ts";

// In another file, load the postgreSql plugin as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  database: postgreSqlDatabasePlugin,
});

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let server: PostgreSqlDatabaseServer;

  beforeEach(async () => {
    // Setup tests
    const result = await setupTests({
      database: {
        server: {
          strategy: "docker",
        },
      },
    });
    teardownTests = result.teardownTests;
    server = result.outputs.database.output.server;
  });

  afterEach(async () => {
    // Teardown tests
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the postgreSql plugin being configured", () => {
      // Some other testing
      assertExists(server.instanceId);
      assertExists(server.connection.database);
      assertExists(server.connection.serverName);
      assertExists(server.connection.hostname);
      assertExists(server.connection.port);
      assertExists(server.connection.user);
      assertExists(server.connection.password);
    });
  });
});
