// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Client } from "x/postgres/mod.ts";
import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "std/testing/bdd.ts";
import { assertSpyCalls } from "std/testing/mock.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  MigrationStrategy,
  postgreSqlDatabasePlugin,
  type PostgreSqlDatabaseServerStrategy,
} from "./plugin_postgresql.ts";
import { DenoCommand } from "./plugin_postgresql.utils.ts";

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
      it("should setup tests by seeding the PostgreSQL database server", async () => {
        // Arrange
        const query = `SELECT id, email, name FROM "User";`;

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
            // TODO: seed
            seed: {
              User: [
                { email: "email 1", name: "name 1" },
                { email: "email 2", name: "name 2" },
                { email: "email 3", name: "name 3" },
              ],
            }, // Or just run function
          },
        });
        teardownTests = result.teardownTests;

        // Assert
        const { connection } = result.outputs.database.output;
        const client = new Client({ ...connection, tls: { enabled: false } });
        try {
          await client.connect();
          const results = await client.queryObject(query);
          assertEquals(results.rows, [
            { id: 1, email: "email 1", name: "name 1" },
            { id: 2, email: "email 2", name: "name 2" },
            { id: 3, email: "email 3", name: "name 3" },
          ]);
        } finally {
          await client.end();
        }
      });
    });
  });
});
