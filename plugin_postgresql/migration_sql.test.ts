// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertRejects } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import { expandGlob } from "std/fs/expand_glob.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import { stub } from "std/testing/mock.ts";
import { Client } from "./client.ts";
import { MigrationOrderBy, MigrationStrategy } from "./migration.ts";
import { SqlMigrationError } from "./migration_sql.ts";
import { PluginConfig, postgreSqlPlugin } from "./plugin.ts";
import { ServerStrategy } from "./server.ts";

const ignore = Deno.env.get("IGNORE_DOCKER_TESTS") === "true";

const root = dirname(fromFileUrl(import.meta.url));

// Then one can use this in any test file as follows:
describe("postgreSqlPlugin", { ignore }, () => {
  let teardownTests: SetupTestsTeardown;
  const strategy: ServerStrategy = ServerStrategy.DOCKER;
  const { setupTests } = setupTestsFactory({ database: postgreSqlPlugin });

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
        [
          {
            name: "should correctly run migrations using the default values",
            query: `SELECT id, title, content, published FROM "Post";`,
            root: join(root, "fixtures/migrations"),
          },
          {
            name:
              "should correctly run migrations using the files defined by a glob",
            query: `SELECT id, title, content, published FROM "Post";`,
            files: "fixtures/migrations-up-down/**/migration.sql",
            root,
          },
          {
            name:
              "should correctly run migrations using the files defined by a function",
            query: `SELECT id, title, content, published FROM "Post";`,
            files: async () => {
              const files = [];
              for await (
                const file of expandGlob(
                  "fixtures/migrations-up-down/**/migration.sql",
                  { root },
                )
              ) {
                files.push(file.path);
              }
              return files;
            },
          },
          {
            name:
              "should correctly run migrations when ordering files by filename descending",
            query: `SELECT id, title, content, published FROM "Post";`,
            root: join(root, "fixtures/migrations-desc"),
            orderBy: MigrationOrderBy.FILENAME_DESC,
          },
          {
            name:
              "should correctly run migrations when ordering files by filename ascending",
            query: `SELECT id, title, content, published FROM "Post";`,
            root: join(root, "fixtures/migrations-asc"),
            orderBy: MigrationOrderBy.FILENAME_ASC,
          },
        ].forEach(({ name, query, root, files, orderBy }) => {
          it(name, async () => {
            // Act
            const result = await setupTests({
              database: {
                server: { strategy },
                migrate: {
                  strategy: MigrationStrategy.SQL,
                  // Array or async function
                  root,
                  files,
                  orderBy,
                },
              } as PluginConfig,
            });
            teardownTests = result.teardownTests;

            // Assert
            const { connection } = result.outputs.database.output.server;
            const client = new Client(connection);
            await client.connect();
            await client.query(query);
            await client.end();
          });
        });

        it("should error if the migrations fail", async () => {
          // Arrange
          const mockError = new Error("kaboom");
          const result = await setupTests({
            database: { server: { strategy } } as PluginConfig,
          });
          teardownTests = result.teardownTests;
          const clientQueryObjectStub = stub(
            Client.prototype,
            "query",
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
                    migrate: { strategy: MigrationStrategy.SQL, root },
                  } as PluginConfig,
                }),
              SqlMigrationError,
              `Unable to run migrations: ${mockError.message}`,
            );
          } finally {
            clientQueryObjectStub.restore();
          }
        });

        it("should error if no migrations are found", async () => {
          // Arrange
          const result = await setupTests({
            database: { server: { strategy } } as PluginConfig,
          });
          teardownTests = result.teardownTests;

          // Act & Assert
          await assertRejects(
            () =>
              setupTests({
                database: {
                  server: result.outputs.database.output.server,
                  migrate: {
                    strategy: MigrationStrategy.SQL,
                    root: join(root, "fixtures/empty-migrations"),
                  },
                } as PluginConfig,
              }),
            SqlMigrationError,
            "Unable to run migrations: No SQL files found",
          );
        });
      });
    });
  });
});
