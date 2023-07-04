// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.192.0/testing/bdd.ts";
import { assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  postgresqlDatabaseServerPlugin,
  type PostgresqlDatabaseServerPluginConnection,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/mod.ts";

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  databaseServer: postgresqlDatabaseServerPlugin,
});

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownAllTests: SetupTestsTeardown;
  let teardownEachTest: SetupTestsTeardown;
  let connection: PostgresqlDatabaseServerPluginConnection;

  beforeAll(async () => {
    // Setup tests
    const result = await setupTests({
      databaseServer: {
        strategy: "docker",
      },
      // TODO: move to beforeEach
    });
    connection = result.outputs.databaseServer.output.connection;
    teardownAllTests = result.teardownTests;
  });

  beforeEach(async () => {
    const result = await setupTests({
      // databaseMigration(results) {
      //   return {
      //     client,
      //     connection: results.database.connection,
      //     schema: "schema.prisma",
      //     data: {},
      //   };
      // },
    });
    teardownEachTest = result.teardownTests;
  });

  afterEach(async () => {
    // Teardown each test
    await teardownEachTest();
  });

  afterAll(async () => {
    // Teardown tests
    await teardownAllTests();
  });

  describe("method", () => {
    it("should test something that relies on the plugin being configured", () => {
      // Some other testing
      console.log("connection", connection);
      assertExists(connection);
    });
  });
});
