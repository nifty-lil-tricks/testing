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
            // TODO: seed
            // seed: {
            //   Property: [
            //     { name: "name 1", address: "address 1" },
            //     { name: "name 2", address: "address 2" },
            //   ],
            // }, // Or just run function
          },
        });
        teardownTests = result.teardownTests;

        // Assert
        const { connection } = result.outputs.database.output;
        const client = new Client({ ...connection, tls: { enabled: false } });
        await client.connect();
        await client.queryObject(query)
        await client.end();
      });
    });
  });
});
