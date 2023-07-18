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
import {
  assertSpyCallArgs,
  assertSpyCalls,
  type Stub,
  stub,
} from "std/testing/mock.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  type PostgresqlDatabaseServerPlugin,
  postgresqlDatabaseServerPlugin,
} from "./plugin_postgresql.ts";
import { DenoCommand } from "./plugin_postgresql.utils.ts";
import { type SetupTestsFn } from "../setup_tests.type.ts";

const ignore = Deno.env.get("IGNORE_DOCKER_TESTS") === "true";

// Then one can use this in any test file as follows:
describe("postgresqlDatabaseServerPlugin", { ignore }, () => {
  let teardownTests: SetupTestsTeardown;
  let consoleWarnStub: Stub<Console>;
  let setupTests: SetupTestsFn<
    { databaseServer: PostgresqlDatabaseServerPlugin }
  >;
  const strategies = ["docker"] as const;

  beforeAll(() => {
    const result = setupTestsFactory({
      databaseServer: postgresqlDatabaseServerPlugin,
    });
    setupTests = result.setupTests;
  });

  beforeEach(() => {
    consoleWarnStub = stub(console, "warn");
    teardownTests = (() => {
      // No-op in-case this is not set
    }) as SetupTestsTeardown;
  });

  afterEach(async () => {
    // Teardown each test
    consoleWarnStub.restore();
    await teardownTests();
  });

  strategies.forEach((strategy) => {
    describe(`with ${strategy} strategy`, () => {
      describe("setupTests", () => {
        it("should setup tests with a postgresql database server", async () => {
          // Arrange & Act
          const result = await setupTests({
            databaseServer: {
              strategy,
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
          const { containerId, connection } =
            result.outputs.databaseServer.output;
          assertEquals(details?.[0]?.Id, containerId);
          const client = new Client({ ...connection, tls: { enabled: false } });
          await client.connect();
          await client.end();
          assertSpyCalls(consoleWarnStub, 0);
        });

        it("should error if docker is not running or available", async () => {
          const denoCommandOutputStub = stub(
            DenoCommand.prototype,
            "output",
            () => {
              throw new Error("kaboom");
            },
          );
          try {
            // Arrange, Act & Assert
            await assertRejects(() =>
              setupTests({
                databaseServer: {
                  strategy,
                },
              })
            );
          } finally {
            denoCommandOutputStub.restore();
          }
          assertSpyCalls(consoleWarnStub, 0);
          assertSpyCalls(denoCommandOutputStub, 1);
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
          assertSpyCalls(consoleWarnStub, 0);
        });
      });

      describe("teardownTests", () => {
        it("should teardown tests with a postgresql database server", async () => {
          // Arrange
          const result = await setupTests({
            databaseServer: {
              strategy,
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
          assertSpyCalls(consoleWarnStub, 0);
        });

        it("should only log a warning when the teardown tests function errors", async () => {
          // Arrange
          const expectedError = new Error("kaboom");
          const result = await setupTests({
            databaseServer: {
              strategy,
            },
          });
          teardownTests = result.teardownTests;
          const denoCommandOutputStub = stub(
            DenoCommand.prototype,
            "output",
            () => {
              throw expectedError;
            },
          );
          try {
            // Act
            await result.teardownTests();
          } finally {
            denoCommandOutputStub.restore();
          }

          // Assert
          assertSpyCalls(denoCommandOutputStub, 1);
          assertSpyCalls(consoleWarnStub, 1);
          assertSpyCallArgs(
            consoleWarnStub,
            0,
            ["Error tearing down postgresql database server", expectedError],
          );
        });
      });
    });
  });
});
