// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertEquals } from "std/testing/asserts.ts";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "std/testing/bdd.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  postgreSqlDatabasePlugin,
  PostgreSqlDatabaseServer,
} from "./plugin_postgresql.ts";

// Then one can use this in any test file as follows:
describe("postgreSqlDatabasePlugin", () => {
  let teardownTests: SetupTestsTeardown;
  const { setupTests } = setupTestsFactory({
    database: postgreSqlDatabasePlugin,
  });
  let server: PostgreSqlDatabaseServer;
  let teardownServer = (() => {
    // No-op in-case this is not set
  }) as SetupTestsTeardown;

  beforeAll(async () => {
    const result = await setupTests({
      database: { server: { strategy: "docker" } },
    });
    server = result.outputs.database.output.server;
    teardownServer = result.teardownTests;
  });

  beforeEach(() => {
    teardownTests = (() => {
      // No-op in-case this is not set
    }) as SetupTestsTeardown;
  });

  afterEach(async () => {
    // Teardown each test
    await teardownTests();
  });

  afterAll(async () => {
    // Teardown server
    await teardownServer();
  });

  describe(`with existing server instance`, () => {
    describe("setupTests", () => {
      it("should setup tests using an existing server instance", async () => {
        // Arrange & Act
        const result = await setupTests({
          database: {
            server,
          },
        });
        teardownTests = result.teardownTests;

        // Assert
        assertEquals(result.outputs.database.output.server, server);
      });
    });

    describe("teardownTests", () => {
      it("should teardown tests using the provided noop", async () => {
        // Arrange
        const result = await setupTests({
          database: {
            server,
          },
        });
        teardownTests = result.teardownTests;

        // Act
        const teardownResult = await result.teardownTests();

        // Assert
        assertEquals(teardownResult, undefined);
      });
    });
  });
});
