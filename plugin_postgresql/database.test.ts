// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { assert, assertEquals } from "std/testing/asserts.ts";
import { afterEach, beforeEach, describe, it } from "std/testing/bdd.ts";
import { stub } from "std/testing/mock.ts";
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
      it("should setup tests in a custom database", async () => {
        // Arrange
        const query = `SELECT datname FROM pg_database;`;
        const prefix = "custom";

        // Act
        const result = await setupTests({
          database: {
            server: { strategy },
            database: { prefix },
            migrate: {
              strategy: MigrationStrategy.SQL,
              root,
            },
          } as PluginConfig,
        });
        teardownTests = result.teardownTests;

        // Assert
        const { server: { connection } } = result.outputs.database.output;
        const client = new Client(connection);
        assert(connection.database.startsWith(prefix));
        try {
          await client.connect();
          const results = await client.query(query);
          assert(
            (results.rows as Record<string, string>[]).some((row) =>
              row.datname?.startsWith(prefix)
            ),
          );
        } finally {
          await client.end();
        }
      });

      it("should setup tests in a custom database for an existing server", async () => {
        // Arrange
        const query = `SELECT datname FROM pg_database;`;
        const prefix = "custom";
        const existingServerResult = await setupTests({
          database: { server: { strategy } } as PluginConfig,
        });
        teardownTests = existingServerResult.teardownTests;
        const existingServerClient = new Client(
          existingServerResult.outputs.database.output.server.connection,
        );
        let numberOfDatabases = 0;
        try {
          await existingServerClient.connect();
          const results = await existingServerClient.query(query);
          numberOfDatabases = results.rowCount;
        } finally {
          await existingServerClient.end();
        }

        // Act
        const result = await setupTests({
          database: {
            server: existingServerResult.outputs.database.output.server,
            database: { prefix },
            migrate: {
              strategy: MigrationStrategy.SQL,
              root,
            },
          } as PluginConfig,
        });

        // Assert
        const { server: { connection } } = result.outputs.database.output;
        assert(connection.database.startsWith(prefix));
        const client = new Client(connection);
        try {
          await client.connect();
          const results = await client.query(query);
          assertEquals(
            results.rowCount - 1,
            numberOfDatabases,
          );
          assert(
            (results.rows as Record<string, string>[]).some((row) =>
              row.datname?.startsWith(prefix)
            ),
          );
        } finally {
          await client.end();
        }
      });
    });

    describe("teardownTests", () => {
      it("should teardown tests in a custom database for an existing server", async () => {
        // Arrange
        const query = `SELECT datname FROM pg_database;`;
        const prefix = "custom";
        const existingServerResult = await setupTests({
          database: { server: { strategy } } as PluginConfig,
        });
        teardownTests = existingServerResult.teardownTests;
        const existingServerClient = new Client(
          existingServerResult.outputs.database.output.server.connection,
        );
        let numberOfDatabases = 0;
        try {
          await existingServerClient.connect();
          const results = await existingServerClient.query(query);
          numberOfDatabases = results.rowCount;
        } finally {
          await existingServerClient.end();
        }
        const result = await setupTests({
          database: {
            server: existingServerResult.outputs.database.output.server,
            database: { prefix },
            migrate: {
              strategy: MigrationStrategy.SQL,
              root,
            },
          } as PluginConfig,
        });
        const { server: { connection } } = result.outputs.database.output;
        assert(connection.database.startsWith(prefix));
        {
          const client = new Client(connection);
          try {
            await client.connect();
            const results = await client.query(query);
            assertEquals(
              results.rowCount - 1,
              numberOfDatabases,
            );
            assert(
              (results.rows as Record<string, string>[]).some((row) =>
                row.datname?.startsWith(prefix)
              ),
            );
          } finally {
            await client.end();
          }
        }

        // Act
        await result.teardownTests();

        // Assert
        {
          const client = new Client(
            existingServerResult.outputs.database.output.server.connection,
          );
          try {
            await client.connect();
            const results = await client.query(query);
            assertEquals(
              results.rowCount,
              numberOfDatabases,
              `The number of databases should be the same as before the test was run.`,
            );
            assert(
              !(results.rows as Record<string, string>[]).some((row) =>
                row.datname?.startsWith(prefix)
              ),
            );
          } finally {
            await client.end();
          }
        }
      });

      it("should no-op any errors in teardown tests in a custom database", async () => {
        // Arrange
        const prefix = "custom";
        const result = await setupTests({
          database: {
            server: { strategy },
            database: { prefix },
            migrate: {
              strategy: MigrationStrategy.SQL,
              root,
            },
          } as PluginConfig,
        });
        teardownTests = result.teardownTests;

        const clientConnectStub = stub(
          Client.prototype,
          "connect",
          () => Promise.reject(new Error("kaboom")),
        );

        try {
          // Act & Assert
          await teardownTests();
        } finally {
          clientConnectStub.restore();
        }
      });
    });
  });
});
