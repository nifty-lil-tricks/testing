// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  setupTestsFactory,
  SetupTestsTeardown,
} from "@nifty-lil-tricks/testing";
import {
  MigrationStrategy,
  type PluginConfig,
  postgreSqlPlugin,
  Server,
  ServerStrategy,
} from "@nifty-lil-tricks/testing-plugin-postgresql";
import { Client } from "pg";
import t from "tap";

// In another file, load plugins as follows to generate a setupTests function:
const { setupTests } = setupTestsFactory({ database: postgreSqlPlugin });

// Then one can use this in any test file as follows:

t.test("Service", async (t) => {
  let teardownTests: SetupTestsTeardown;
  let server: Server;

  t.beforeEach(async () => {
    const result = await setupTests({
      database: {
        // Setup server using the Docker strategy
        server: { strategy: ServerStrategy.DOCKER },
        // Run migrations using the SQL strategy
        migrate: { strategy: MigrationStrategy.SQL, root: __dirname },
        // Seed the database with data
        seed: {
          User: [
            { email: "email 1", name: "name 1" },
            { email: "email 2", name: "name 2" },
          ],
        },
      } as PluginConfig,
    });
    teardownTests = result.teardownTests;
    server = result.outputs.database.output.server;
  });

  t.afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  t.test("should test something that relies on the postgresql plugin", async (t) => {
    // Arrange
    const query = `SELECT email, name FROM "User";`;
    const { connection } = server;
    const client = new Client({
      user: connection.user,
      password: connection.password,
      host: connection.hostname,
      database: connection.database,
      port: connection.port,
    });
    await client.connect();

    // Act
    const queryOutput = await client.query(query);
    await client.end();

    // Assert
    t.same(queryOutput.rows.length, 2);
  });
});
