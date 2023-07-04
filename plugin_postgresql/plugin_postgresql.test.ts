// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
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

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  databaseServer: postgresqlDatabaseServerPlugin,
});

// Then one can use this in any test file as follows:
describe("postgresqlDatabaseServerPlugin", () => {
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
      // Act
      const result = await setupTests({
        databaseServer: {
          strategy: "docker",
        },
      });
      teardownTests = result.teardownTests;

      // Assert
      const rawDetails = await new Deno.Command(
        "docker",
        {
          args: [
            "inspect",
            '--format="{{.ID}}"',
            result.outputs.databaseServer.output.containerId,
          ],
        },
      ).output();
      const id: string = JSON.parse(
        new TextDecoder().decode(rawDetails.stdout).trim(),
      );
      assertEquals(id, result.outputs.databaseServer.output.containerId);
    });
  });
});
