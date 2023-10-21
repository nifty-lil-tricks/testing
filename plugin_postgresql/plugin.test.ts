// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertRejects } from "std/testing/asserts.ts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "std/testing/bdd.ts";
import {
  setupTestsFactory,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  MigrationStrategy,
  type PostgreSqlDatabasePlugin,
  postgreSqlDatabasePlugin,
  type PostgreSqlDatabaseServerStrategy,
} from "./plugin_postgresql.ts";
import { type SetupTestsFn, SetupTestsTeardown } from "../setup_tests.type.ts";

describe("postgreSqlDatabasePlugin", () => {
  let teardownTests: SetupTestsTeardown;
  let setupTests: SetupTestsFn<{ database: PostgreSqlDatabasePlugin }>;

  beforeAll(() => {
    const result = setupTestsFactory({
      database: postgreSqlDatabasePlugin,
    });
    setupTests = result.setupTests;
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

  describe("setupTests", () => {
    it("should error if an unknown strategy is provided", async () => {
      // Arrange, Act & Assert
      await assertRejects(() =>
        setupTests({
          database: {
            server: {
              strategy:
                "unknown" as unknown as PostgreSqlDatabaseServerStrategy,
            },
          },
        })
      );
    });

    it("should error if unknown migration strategy is provided", async () => {
      // Arrange
      const result = await setupTests({
        database: { server: { strategy: "docker" } },
      });
      teardownTests = result.teardownTests;
      const unknownStrategy = "unknown" as MigrationStrategy;

      // Act & Assert
      await assertRejects(
        () =>
          setupTests({
            database: {
              server: result.outputs.database.output.server,
              migrate: {
                strategy: unknownStrategy,
              },
            },
          }),
        Error,
        `Unknown migration strategy: ${unknownStrategy}`,
      );
    });
  });
});
