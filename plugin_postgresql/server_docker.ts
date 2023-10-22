// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  PluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  type Connection,
  Server,
  type ServerStrategyContract,
} from "./server.ts";
import { DenoCommand } from "./utils.ts";

export class DockerServerStrategy implements ServerStrategyContract {
  #config: DockerServerStrategyConfig;
  constructor(config: DockerServerStrategyConfig) {
    this.#config = config;
  }

  async setup(): Promise<
    PluginInstance<Server>
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
      throw new DockerServerError(
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
      throw new DockerServerError(
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
      throw new DockerServerError(
        `PostgreSQL Docker server is not exposed on a valid port: ${exposedHostPort}`,
      );
    }
    if (!hostname) {
      throw new DockerServerError(
        `PostgreSQL Docker server is not exposed on a valid hostname: ${hostname}`,
      );
    }
    return {
      teardown: this.#teardown.bind(this, containerId),
      output: new Server(containerId, {
        serverName: this.#config.serverName,
        hostname,
        port,
        user: this.#config.user,
        password: this.#config.password,
        database: this.#config.database,
      }),
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
}

/**
 * Configuration for the Docker server strategy.
 */
export interface DockerServerStrategyConfig
  extends Omit<Connection, "hostname"> {
  /**
   * The version of PostgreSQL to use.
   */
  version: string;
}

/**
 * Error thrown when the Docker server strategy encounters an error.
 */
export class DockerServerError extends Error {
  /**
   * The name of the error.
   */
  override name = "DockerServerError";
}
