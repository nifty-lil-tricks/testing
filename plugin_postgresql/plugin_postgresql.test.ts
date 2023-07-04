// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.192.0/testing/bdd.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  postgresqlDatabaseServerPlugin,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/plugin_postgresql/mod.ts";
import { DenoCommand } from "../setup_tests.utils.ts";

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  databaseServer: postgresqlDatabaseServerPlugin,
});

const ignore = Deno.env.get("IGNORE_DOCKER_TESTS") === "true";

// Then one can use this in any test file as follows:
describe("postgresqlDatabaseServerPlugin", { ignore }, () => {
  let teardownTests: SetupTestsTeardown;

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
    it("should setup tests with a postgresql database server", async () => {
      // Arrange & Act
      const result = await setupTests({
        databaseServer: {
          strategy: "docker",
        },
      });
      teardownTests = result.teardownTests;

      // Assert
      const rawDetails = await new DenoCommand(
        "docker",
        {
          args: [
            "inspect",
            result.outputs.databaseServer.output.containerId,
          ],
        },
      ).output();
      const details = JSON.parse(
        new TextDecoder().decode(rawDetails.stdout).trim(),
      );
      const { containerId, connection } = result.outputs.databaseServer.output;
      assertEquals(details?.[0]?.Id, containerId);
      const client = new Client({ ...connection, tls: { enabled: false } });
      await client.connect();
      await client.end();
    });

    it("should error if docker is not running or available", async () => {
      const originalPathValue = Deno.env.get("PATH") as string;
      try {
        // Arrange, Act & Assert
        Deno.env.delete("PATH");
        await assertRejects(() =>
          setupTests({
            databaseServer: {
              strategy: "docker",
            },
          })
        );
      } finally {
        Deno.env.set("PATH", originalPathValue);
      }
    });

    it("should error if an unknown strategy is provided", async () => {
      // Arrange, Act & Assert
      await assertRejects(() =>
        setupTests({
          databaseServer: {
            strategy: "unknown" as unknown as "docker",
          },
        })
      );
    });
  });

  describe("teardownTests", () => {
    it("should teardown tests with a postgresql database server", async () => {
      // Arrange
      const result = await setupTests({
        databaseServer: {
          strategy: "docker",
        },
      });
      teardownTests = result.teardownTests;

      // Act
      await result.teardownTests();

      // Assert
      const rawDetails = await new DenoCommand(
        "docker",
        {
          args: [
            "inspect",
            '--format="{{.ID}}"',
            result.outputs.databaseServer.output.containerId,
          ],
        },
      ).output();
      assertEquals(rawDetails.code, 1);
      assertEquals(rawDetails.success, false);
    });

    it("should only log a warning when the teardown tests function errors", async () => {
      // Arrange
      const originalPathValue = Deno.env.get("PATH") as string;
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);
      try {
        // Arrange
        // TODO: add a spy to check that the warning is logged
        const result = await setupTests({
          databaseServer: {
            strategy: "docker",
          },
        });
        teardownTests = result.teardownTests;

        // Act
        Deno.env.delete("PATH");
        await result.teardownTests();

        // Assert
        assertEquals(warnings.length, 1);
        assertEquals(
          warnings[0],
          "Error tearing down postgresql database server",
        );
      } finally {
        Deno.env.set("PATH", originalPathValue);
        console.warn = originalWarn;
      }
    });
  });
});
