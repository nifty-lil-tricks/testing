// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  SetupTestsPlugin,
  SetupTestsPluginInstance,
} from "../setup_tests.type.ts";
import { DenoCommand } from "../setup_tests.utils.ts";
import type {
  PostgresqlDatabaseServer,
  PostgresqlDatabaseServerPluginConfig,
} from "./plugin_postgresql.ts";

export type PostgresqlDatabaseDockerServerConfig = Omit<
  PostgresqlDatabaseServerPluginConfig,
  "strategy"
>;

export interface PostgresqlDatabaseDockerServerPluginConnection {
  database: string;
}

export interface PostgresqlDatabaseDockerServerResult {
  containerId: string;
  connection: PostgresqlDatabaseDockerServerPluginConnection;
}

export type PostgresqlDatabaseDockerServerPlugin = SetupTestsPlugin<
  PostgresqlDatabaseDockerServerConfig,
  PostgresqlDatabaseDockerServerResult
>;

export class PostgresqlDatabaseDockerServer
  implements PostgresqlDatabaseServer {
  constructor(_config: PostgresqlDatabaseDockerServerConfig) {}

  async setup(): Promise<
    SetupTestsPluginInstance<PostgresqlDatabaseDockerServerResult>
  > {
    const databaseName = "something";
    // TODO: pass through config
    const dbServerStartCommandArgs = [
      "run",
      "--name",
      "my-database",
      "--detach",
      "--publish",
      "5432:5432",
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_USER=postgres",
      "-e",
      "POSTGRES_DB=postgres",
      "postgres",
    ];
    const runDbServerStart = new DenoCommand(
      "docker",
      { args: dbServerStartCommandArgs },
    );
    const raw = await runDbServerStart.output();
    // TODO: check for errors
    // TODO: wait for db to be ready
    const containerId = new TextDecoder().decode(raw.stdout).trim();
    const rawDetails = await new DenoCommand(
      "docker",
      { args: ["inspect", containerId] },
    ).output();
    JSON.parse(new TextDecoder().decode(rawDetails.stdout));
    await this.#isDbHealthy(containerId);
    return {
      teardown: this.#teardown.bind(this, containerId),
      output: {
        containerId,
        connection: {
          database: databaseName,
        },
      },
    };
  }

  async #teardown(containerId: string): Promise<void> {
    try {
      await new DenoCommand(
        "docker",
        { args: ["stop", containerId] },
      ).output();
      await new DenoCommand(
        "docker",
        { args: ["rm", containerId] },
      ).output();
    } catch (error) {
      console.warn("Error tearing down postgresql database server", error);
    }
  }

  async #isDbHealthy(containerId: string): Promise<void> {
    let shouldReturn = false;
    while (shouldReturn === false) {
      const c = new DenoCommand("docker", {
        args: ["exec", containerId, "pg_isready"],
      });
      const output = await c.output();
      if (output.success && output.code === 0) {
        shouldReturn = true;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}
