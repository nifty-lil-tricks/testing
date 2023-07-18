// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  SetupTestsPlugin,
  SetupTestsPluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  PostgresqlDatabaseDockerServer,
  PostgresqlDatabaseDockerServerConfig,
} from "./plugin_postgresql_docker.strategy.ts";

// TODO: type file
export type PostgresqlDatabaseServerPluginStrategy = "docker";

export interface PostgresqlDatabaseServerPluginConfig {
  strategy: PostgresqlDatabaseServerPluginStrategy;
  databaseServerNamePrefix?: string;
  databaseNamePrefix?: string;
  databaseName?: string;
  port?: number;
  password?: string;
  user?: string;
  version?: string;
}

export interface PostgresqlDatabaseServerPluginConnection {
  serverName: string;
  hostname: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface PostgresqlDatabaseServerPluginResult {
  containerId: string;
  connection: PostgresqlDatabaseServerPluginConnection;
}

export type PostgresqlDatabaseServerPlugin = SetupTestsPlugin<
  PostgresqlDatabaseServerPluginConfig,
  PostgresqlDatabaseServerPluginResult
>;

export interface PostgresqlDatabaseServer {
  setup(): Promise<
    SetupTestsPluginInstance<PostgresqlDatabaseServerPluginResult>
  >;
}

export const postgresqlDatabaseServerPlugin: PostgresqlDatabaseServerPlugin = {
  setup(
    config: PostgresqlDatabaseServerPluginConfig,
  ): Promise<SetupTestsPluginInstance<PostgresqlDatabaseServerPluginResult>> {
    const suffix = Math.random().toString(36).substring(2);
    const database = config.databaseName ||
      `${config.databaseNamePrefix || "postgres"}-${suffix}`;
    const serverName = `${
      config.databaseServerNamePrefix || "postgres"
    }-${suffix}`;
    const port = config.port ?? 0;
    const user = config.user ?? Math.random().toString(36).substring(2);
    const password = config.password ??
      Math.random().toString(36).substring(2);
    const version = config.version || "latest";

    switch (config.strategy) {
      case "docker": {
        const dockerConfig: PostgresqlDatabaseDockerServerConfig = {
          serverName,
          port,
          user,
          password,
          database,
          version,
        };
        const postgresqlDatabaseDockerServer =
          new PostgresqlDatabaseDockerServer(dockerConfig);
        return postgresqlDatabaseDockerServer.setup();
      }
      default: {
        return assertNever(
          config.strategy,
          `Unknown strategy: ${config.strategy}`,
        );
      }
    }
  },
};

function assertNever(_input: never, message: string): never {
  throw new Error(message);
}
