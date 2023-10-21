// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Client } from "x/postgres/mod.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  MigrationStrategy,
  postgreSqlDatabasePlugin,
  type PostgreSqlDatabaseServerStrategy,
} from "./plugin.ts";
import { assertRejects } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { MigrationSqlError } from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/migration_sql.strategy.ts";
import { stub } from "std/testing/mock.ts";

const ignore = Deno.env.get("IGNORE_DOCKER_TESTS") === "true";

// Then one can use this in any test file as follows:
describe("postgreSqlDatabasePlugin", { ignore }, () => {
  let teardownTests: SetupTestsTeardown;
  const strategy: PostgreSqlDatabaseServerStrategy = "docker";
  const { setupTests } = setupTestsFactory({
    database: postgreSqlDatabasePlugin,
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

  describe(`with ${strategy} strategy`, () => {
    describe("setupTests", () => {
      describe(`with ${MigrationStrategy.SQL} migration strategy`, () => {
        it("should setup tests by running defined migrations against PostgreSQL database server", async () => {
          // Arrange
          const query = `SELECT id, title, content, published FROM "Post";`;

          // Act
          const result = await setupTests({
            database: {
              server: { strategy },
              // TODO: migrate
              migrate: {
                strategy: MigrationStrategy.SQL,
                // TODO: add support for customising migrations
                // files: "migrations/**/*.sql", // Array or async function
                // orderBy: "FILENAME_DESC", // Optional
              }, // Or just run function
            },
          });
          teardownTests = result.teardownTests;

          // Assert
          const { connection } = result.outputs.database.output.server;
          const client = new Client({ tls: { enabled: false }, ...connection });
          await client.connect();
          await client.queryObject(query);
          await client.end();
        });

        it("should error if the migrations fail", async () => {
          // Arrange
          const mockError = new Error("kaboom");
          const result = await setupTests({
            database: { server: { strategy } },
          });
          teardownTests = result.teardownTests;
          const clientQueryObjectStub = stub(
            Client.prototype,
            "queryObject",
            () => {
              throw mockError;
            },
          );

          // Act & Assert
          try {
            await assertRejects(
              () =>
                setupTests({
                  database: {
                    server: result.outputs.database.output.server,
                    migrate: {
                      strategy: MigrationStrategy.SQL,
                    },
                  },
                }),
              MigrationSqlError,
              `Unable to run migrations: ${mockError.message}`,
            );
          } finally {
            clientQueryObjectStub.restore();
          }
        });
      });
    });
  });
});
