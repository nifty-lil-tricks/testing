// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertRejects } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import { dirname, fromFileUrl } from "std/path/mod.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import { stub } from "std/testing/mock.ts";
import { Client } from "./client.ts";
import { MigrationStrategy } from "./migration.ts";
import { SqlMigrationError } from "./migration_sql.ts";
import { postgreSqlPlugin } from "./plugin.ts";
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
        it("should setup tests by running defined migrations against PostgreSQL database server", async () => {
          // Arrange
          const query = `SELECT id, title, content, published FROM "Post";`;

          // Act
          const result = await setupTests({
            database: {
              server: { strategy },
              migrate: {
                strategy: MigrationStrategy.SQL,
                // Array or async function
                root,
                // TODO: add support for customising migrations
                // orderBy: "FILENAME_DESC", // Optional
              }, // Or just run function
            },
          });
          teardownTests = result.teardownTests;

          // Assert
          const { connection } = result.outputs.database.output.server;
          const client = new Client(connection);
          await client.connect();
          await client.query(query);
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
                  },
                }),
              SqlMigrationError,
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
