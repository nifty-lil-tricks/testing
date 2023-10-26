// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  setupTestsFactory,
  type SetupTestsFn,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { assertRejects } from "std/testing/asserts.ts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "std/testing/bdd.ts";
import { MigrationStrategy } from "./migration.ts";
import { PluginConfig, PostgreSqlPlugin, postgreSqlPlugin } from "./plugin.ts";
import { Server, ServerStrategy } from "./server.ts";

const root = join(dirname(fromFileUrl(import.meta.url)), "fixtures/migrations");

describe("postgreSqlPlugin", () => {
  let teardownTests: SetupTestsTeardown;
  let setupTests: SetupTestsFn<{ database: PostgreSqlPlugin }>;

  beforeAll(() => {
    const result = setupTestsFactory({
      database: postgreSqlPlugin,
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
              strategy: "unknown" as unknown as ServerStrategy,
            },
          } as PluginConfig,
        })
      );
    });

    it("should error if unknown migration strategy is provided", async () => {
      // Arrange
      const server = new Server("id", {
        serverName: "serverName",
        hostname: "hostname",
        port: 1234,
        user: "user",
        password: "password",
        database: "database",
      });
      server.init = () => Promise.resolve();
      const result = await setupTests({ database: { server } as PluginConfig });
      teardownTests = result.teardownTests;
      const unknownStrategy = "unknown" as MigrationStrategy;

      // Act & Assert
      await assertRejects(
        () =>
          setupTests({
            database: {
              server: result.outputs.database.output.server,
              migrate: { strategy: unknownStrategy, root },
            } as PluginConfig,
          }),
        Error,
        `Unknown migration strategy: ${unknownStrategy}`,
      );
    });
  });
});
