// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  type SetupTestsPlugin,
  type SetupTestsPluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import type {
  PostgreSqlDatabaseServer,
  PostgreSqlDatabaseServerPluginConnection,
} from "./plugin_postgresql.ts";
import { DenoCommand } from "./plugin_postgresql.utils.ts";

export interface PostgreSqlDatabaseDockerServerConfig
  extends Omit<PostgreSqlDatabaseDockerServerPluginConnection, "hostname"> {
  version: string;
}

export type PostgreSqlDatabaseDockerServerPluginConnection =
  PostgreSqlDatabaseServerPluginConnection;

export interface PostgreSqlDatabaseDockerServerResult {
  instanceId: string;
  connection: PostgreSqlDatabaseDockerServerPluginConnection;
}

export type PostgreSqlDatabaseDockerServerPlugin = SetupTestsPlugin<
  PostgreSqlDatabaseDockerServerConfig,
  PostgreSqlDatabaseDockerServerResult
>;

export class PostgreSqlDatabaseDockerServerError extends Error {
  override name = "PostgreSqlDatabaseDockerServerError";
}

export class PostgreSqlDatabaseDockerServer
  implements PostgreSqlDatabaseServer {
  #config: PostgreSqlDatabaseDockerServerConfig;
  constructor(config: PostgreSqlDatabaseDockerServerConfig) {
    this.#config = config;
  }

  async setup(): Promise<
    SetupTestsPluginInstance<PostgreSqlDatabaseDockerServerResult>
  > {
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
    const runDbServerExitCode = raw.code;
    if (runDbServerExitCode !== 0) {
      const stderr = new TextDecoder().decode(raw.stderr);
      throw new PostgreSqlDatabaseDockerServerError(
        `Error starting PostgreSQL database server (exit code: ${runDbServerExitCode}): ${stderr}`,
      );
    }
    const containerId = new TextDecoder().decode(raw.stdout).trim();
    const rawDetails = await new DenoCommand(
      "docker",
      { args: ["inspect", containerId] },
    ).output();
    const inspectDbServerExitCode = rawDetails.code;
    if (inspectDbServerExitCode !== 0) {
      const stderr = new TextDecoder().decode(rawDetails.stderr);
      throw new PostgreSqlDatabaseDockerServerError(
        `Error inspecting PostgreSQL database server (exit code: ${inspectDbServerExitCode}): ${stderr}`,
      );
    }
    const details = JSON.parse(new TextDecoder().decode(rawDetails.stdout));
    const networkSettings = details?.[0]?.NetworkSettings?.Ports?.["5432/tcp"];
    const exposedHostIp = networkSettings?.[0]?.HostIp;
    const exposedHostPort = networkSettings?.[0]?.HostPort;
    const port = Number(exposedHostPort);
    const hostname = exposedHostIp === "0.0.0.0" ? "localhost" : exposedHostIp;
    if (Number.isNaN(port)) {
      throw new PostgreSqlDatabaseDockerServerError(
        `PostgreSQL Docker server is not exposed on a valid port: ${exposedHostPort}`,
      );
    }
    if (!hostname) {
      throw new PostgreSqlDatabaseDockerServerError(
        `PostgreSQL Docker server is not exposed on a valid hostname: ${hostname}`,
      );
    }
    await this.#isDbHealthy(containerId);
    return {
      teardown: this.#teardown.bind(this, containerId),
      output: {
        instanceId: containerId,
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
      console.warn("Error tearing down PostgreSQL database server", error);
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
