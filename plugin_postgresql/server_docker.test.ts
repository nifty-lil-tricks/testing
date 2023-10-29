// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  setupTestsFactory,
  type SetupTestsFn,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
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
import { getAvailablePort } from "x/port/mod.ts";
import { Client } from "./client.ts";
import {
  PluginConfig,
  type PostgreSqlPlugin,
  postgreSqlPlugin,
} from "./plugin.ts";
import { ServerStrategy } from "./server.ts";
import { DockerServerError } from "./server_docker.ts";
import { DenoCommand } from "./utils.ts";

const ignore = Deno.env.get("IGNORE_DOCKER_TESTS") === "true";

// Then one can use this in any test file as follows:
describe("postgreSqlPlugin", { ignore }, () => {
  let teardownTests: SetupTestsTeardown;
  let consoleWarnStub: Stub<Console>;
  let setupTests: SetupTestsFn<{ database: PostgreSqlPlugin }>;
  const strategy: ServerStrategy = ServerStrategy.DOCKER;

  beforeAll(() => {
    const result = setupTestsFactory({
      database: postgreSqlPlugin,
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

  describe(`with ${strategy} strategy`, () => {
    describe("setupTests", () => {
      it("should setup tests with a PostgreSQL database server", async () => {
        // Arrange & Act
        const result = await setupTests({
          database: {
            server: {
              strategy,
            },
          } as PluginConfig,
        });
        teardownTests = result.teardownTests;

        // Assert
        const rawDetails = await new DenoCommand(
          "docker",
          {
            args: [
              "inspect",
              result.outputs.database.output.server.id,
            ],
          },
        ).output();
        const details = JSON.parse(
          new TextDecoder().decode(rawDetails.stdout).trim(),
        );
        const { id, connection } = result.outputs.database.output.server;
        assertEquals(details?.[0]?.Id, id);
        const client = new Client(connection);
        await client.connect();
        await client.end();
        assertSpyCalls(consoleWarnStub, 0);
      });

      it("should setup tests with a PostgreSQL database server exposed on a specific hostname", async () => {
        // Arrange
        const mockHostIp = "1.2.3.4";
        const denoCommandOutputStub = stub(
          DenoCommand.prototype,
          "output",
          () => {
            return Promise.resolve({
              code: 0,
              success: true,
              stdout: new TextEncoder().encode(JSON.stringify([{
                NetworkSettings: {
                  Ports: {
                    "5432/tcp": [{ HostIp: mockHostIp, HostPort: 1234 }],
                  },
                },
              }])),
              stderr: new TextEncoder().encode(""),
            });
          },
        );
        const clientConnectStub = stub(
          Client.prototype,
          "connect",
          () => Promise.resolve(),
        );
        const clientEndStub = stub(
          Client.prototype,
          "end",
          () => Promise.resolve(),
        );

        // Act
        try {
          const result = await setupTests({
            database: { server: { strategy } } as PluginConfig,
          });
          teardownTests = result.teardownTests;

          // Assert
          assertEquals(
            result.outputs.database.output.server.connection.hostname,
            mockHostIp,
          );
        } finally {
          denoCommandOutputStub.restore();
          clientConnectStub.restore();
          clientEndStub.restore();
        }
      });

      it("should setup tests with a PostgreSQL database server exposed on a defined port", async () => {
        // Arrange
        const port = await getAvailablePort();

        // Act
        const result = await setupTests({
          database: { server: { strategy, port } } as PluginConfig,
        });
        teardownTests = result.teardownTests;

        // Assert
        assertEquals(
          result.outputs.database.output.server.connection.port,
          port,
        );
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
              database: {
                server: { strategy },
              } as PluginConfig,
            })
          );
        } finally {
          denoCommandOutputStub.restore();
        }
        assertSpyCalls(consoleWarnStub, 0);
        assertSpyCalls(denoCommandOutputStub, 1);
      });

      it("should error if the exposed port is not defined", async () => {
        // Arrange
        const denoCommandOutputStub = stub(
          DenoCommand.prototype,
          "output",
          () => {
            return Promise.resolve({
              code: 0,
              success: true,
              stdout: new TextEncoder().encode(JSON.stringify([{
                NetworkSettings: {
                  Ports: {
                    "5432/tcp": [{ HostIp: "0.0.0.0" }],
                  },
                },
              }])),
              stderr: new TextEncoder().encode(""),
            });
          },
        );
        try {
          // Act & Assert
          await assertRejects(
            () =>
              setupTests({
                database: {
                  server: { strategy },
                } as PluginConfig,
              }),
            DockerServerError,
            "PostgreSQL Docker server is not exposed on a valid port: undefined",
          );
        } finally {
          denoCommandOutputStub.restore();
        }
        assertSpyCalls(consoleWarnStub, 0);
        assertSpyCalls(denoCommandOutputStub, 2);
      });

      it("should error if the docker start command fails", async () => {
        // Arrange
        const mockExitCode = 7;
        const mockStderr = "kaboom";
        const denoCommandOutputStub = stub(
          DenoCommand.prototype,
          "output",
          () => {
            return Promise.resolve({
              code: mockExitCode,
              success: false,
              stdout: new TextEncoder().encode(""),
              stderr: new TextEncoder().encode(mockStderr),
            });
          },
        );
        try {
          // Act & Assert
          await assertRejects(
            () =>
              setupTests({
                database: {
                  server: { strategy },
                } as PluginConfig,
              }),
            DockerServerError,
            `Error starting PostgreSQL database server (exit code: ${mockExitCode}): ${mockStderr}`,
          );
        } finally {
          denoCommandOutputStub.restore();
        }
        assertSpyCalls(consoleWarnStub, 0);
        assertSpyCalls(denoCommandOutputStub, 1);
      });

      it("should error if the docker inspect command fails", async () => {
        // Arrange
        const mockExitCode = 7;
        const mockStderr = "kaboom";
        let count = 1;
        const denoCommandOutputStub = stub(
          DenoCommand.prototype,
          "output",
          () => {
            if (count === 1) {
              count++;
              return Promise.resolve({
                code: 0,
                success: true,
                stdout: new TextEncoder().encode(""),
                stderr: new TextEncoder().encode(""),
              });
            }
            return Promise.resolve({
              code: mockExitCode,
              success: false,
              stdout: new TextEncoder().encode(""),
              stderr: new TextEncoder().encode(mockStderr),
            });
          },
        );
        try {
          // Act & Assert
          await assertRejects(
            () =>
              setupTests({
                database: {
                  server: { strategy },
                } as PluginConfig,
              }),
            DockerServerError,
            `Error inspecting PostgreSQL database server (exit code: ${mockExitCode}): ${mockStderr}`,
          );
        } finally {
          denoCommandOutputStub.restore();
        }
        assertSpyCalls(consoleWarnStub, 0);
        assertSpyCalls(denoCommandOutputStub, 2);
      });

      it("should error if the exposed hostname is not defined", async () => {
        // Arrange
        const denoCommandOutputStub = stub(
          DenoCommand.prototype,
          "output",
          () => {
            return Promise.resolve({
              code: 0,
              success: true,
              stdout: new TextEncoder().encode(JSON.stringify([{
                NetworkSettings: {
                  Ports: {
                    "5432/tcp": [{ HostPort: 9999 }],
                  },
                },
              }])),
              stderr: new TextEncoder().encode(""),
            });
          },
        );
        try {
          // Act & Assert
          await assertRejects(
            () =>
              setupTests({
                database: {
                  server: { strategy },
                } as PluginConfig,
              }),
            DockerServerError,
            "PostgreSQL Docker server is not exposed on a valid hostname: undefined",
          );
        } finally {
          denoCommandOutputStub.restore();
        }
        assertSpyCalls(consoleWarnStub, 0);
        assertSpyCalls(denoCommandOutputStub, 2);
      });
    });

    describe("teardownTests", () => {
      it("should teardown tests with a PostgreSQL database server", async () => {
        // Arrange
        const result = await setupTests({
          database: {
            server: { strategy },
          } as PluginConfig,
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
              result.outputs.database.output.server.id,
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
          database: {
            server: { strategy },
          } as PluginConfig,
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
          ["Error tearing down PostgreSQL database server", expectedError],
        );
      });
    });
  });
});
