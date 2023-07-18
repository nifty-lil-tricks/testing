// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  type SetupTestsPlugin,
  type SetupTestsPluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import type {
  PostgresqlDatabaseServer,
  PostgresqlDatabaseServerPluginConnection,
} from "./plugin_postgresql.ts";
import { DenoCommand } from "./plugin_postgresql.utils.ts";

export interface PostgresqlDatabaseDockerServerConfig
  extends Omit<PostgresqlDatabaseDockerServerPluginConnection, "hostname"> {
  version: string;
}

export type PostgresqlDatabaseDockerServerPluginConnection =
  PostgresqlDatabaseServerPluginConnection;

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
  #config: PostgresqlDatabaseDockerServerConfig;
  constructor(config: PostgresqlDatabaseDockerServerConfig) {
    this.#config = config;
  }

  async setup(): Promise<
    SetupTestsPluginInstance<PostgresqlDatabaseDockerServerResult>
  > {
    // TODO: pass through config
    const dbServerStartCommandArgs = [
      "run",
      "--name",
      this.#config.serverName,
      "--detach",
      "-p",
      `${this.#config.port ? this.#config.port + ":" : ""}5432`,
      "-e",
      `POSTGRES_PASSWORD=${this.#config.password}`,
      "-e",
      `POSTGRES_USER=${this.#config.user}`,
      "-e",
      `POSTGRES_DB=${this.#config.database}`,
      `postgres:${this.#config.version}`,
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
    const details = JSON.parse(new TextDecoder().decode(rawDetails.stdout));
    const networkSettings = details?.[0]?.NetworkSettings?.Ports?.["5432/tcp"];
    const port = Number(networkSettings?.[0]?.HostPort);
    // const hostname = networkSettings?.[0]?.HostIp;
    const hostname = "localhost";
    if (Number.isNaN(port) || !hostname) {
      throw new Error("kaboom");
    }
    await this.#isDbHealthy(containerId);
    return {
      teardown: this.#teardown.bind(this, containerId),
      output: {
        containerId,
        connection: {
          serverName: this.#config.serverName,
          hostname,
          port,
          user: this.#config.user,
          password: this.#config.password,
          database: this.#config.database,
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
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}
