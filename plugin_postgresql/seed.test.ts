// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import { Client } from "./client.ts";
import { MigrationStrategy } from "./migration.ts";
import { PluginConfig, postgreSqlPlugin } from "./plugin.ts";
import { ServerStrategy } from "./server.ts";

const ignore = Deno.env.get("IGNORE_DOCKER_TESTS") === "true";

const root = join(dirname(fromFileUrl(import.meta.url)), "fixtures/migrations");

// Then one can use this in any test file as follows:
describe("postgreSqlPlugin", { ignore }, () => {
  let teardownTests: SetupTestsTeardown;
  const strategy: ServerStrategy = ServerStrategy.DOCKER;
  const { setupTests } = setupTestsFactory({
    database: postgreSqlPlugin,
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
            migrate: {
              strategy: MigrationStrategy.SQL,
              root,
            },
            seed: {
              User: [
                { email: "email 1", name: "name 1" },
                { email: "email 2", name: "name 2" },
                { email: "email 3", name: "name 3" },
              ],
            },
          } as PluginConfig,
        });
        teardownTests = result.teardownTests;

        // Assert
        const { server: { connection }, seed } = result.outputs.database.output;
        const client = new Client(connection);
        assertEquals(seed, {
          results: [
            {
              query:
                'INSERT INTO "User" (email,name) VALUES ($1,$2), ($3,$4), ($5,$6);',
              args: [
                "email 1",
                "name 1",
                "email 2",
                "name 2",
                "email 3",
                "name 3",
              ],
              insertedCount: 3,
            },
          ],
        });
        try {
          await client.connect();
          const results = await client.query(query);
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
