// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  SetupTestsPlugin,
  SetupTestsPluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  PostgreSqlDatabaseDockerServer,
  PostgreSqlDatabaseDockerServerConfig,
} from "./plugin_postgresql_docker.strategy.ts";

// TODO: type file
export type PostgreSqlDatabaseServerPluginStrategy = "docker";

/**
 * PostgreSQL Database Server Plugin Config
 */
export interface PostgreSqlDatabaseServerPluginConfig {
  /**
   * The strategy to use for setting up the database server.
   *
   * Available strategies:
   *  - `docker`
   */
  strategy: PostgreSqlDatabaseServerPluginStrategy;
  /**
   * The prefix to use for the database server name.
   * @default "postgres"
   */
  databaseServerNamePrefix?: string;
  /**
   * The prefix to use for the database name.
   * @default "postgres"
   */
  databaseNamePrefix?: string;
  /**
   * The name of the database to use.
   *
   * If not provided, a random name will be generated.
   */
  databaseName?: string;
  /**
   * The port to use for the database server.
   *
   * If not provided, a random available port will be used.
   */
  port?: number;
  /**
   * The password to use for the database server.
   *
   * If not provided, a random password will be generated.
   */
  password?: string;
  /**
   * The user to use for the database server.
   *
   * If not provided, a random user will be generated.
   */
  user?: string;
  /**
   * The PostgreSQL version of the database server to use.
   *
   * @default "latest"
   */
  version?: string;
}

/**
 * PostgreSQL Database Server Plugin Connection
 */
export interface PostgreSqlDatabaseServerPluginConnection {
  /**
   * The name of the database server.
   */
  serverName: string;
  /**
   * The hostname of the database server.
   */
  hostname: string;
  /**
   * The port of the database server.
   */
  port: number;
  /**
   * The name of the database user.
   */
  user: string;
  /**
   * The password of the database user.
   */
  password: string;
  /**
   * The name of the database.
   */
  database: string;
}

/**
 * PostgreSQL Database Server Plugin Result
 */
export interface PostgreSqlDatabaseServerPluginResult {
  /**
   * The ID of the PostgreSQL instance.
   */
  instanceId: string;
  /**
   * The connection details for the PostgreSQL instance.
   */
  connection: PostgreSqlDatabaseServerPluginConnection;
}

export type PostgreSqlDatabaseServerPlugin = SetupTestsPlugin<
  PostgreSqlDatabaseServerPluginConfig,
  PostgreSqlDatabaseServerPluginResult
>;

export interface PostgreSqlDatabaseServer {
  setup(): Promise<
    SetupTestsPluginInstance<PostgreSqlDatabaseServerPluginResult>
  >;
}

/**
 * PostgreSQL Database Server Plugin
 */
export const postgreSqlDatabaseServerPlugin: PostgreSqlDatabaseServerPlugin = {
  setup(
    config: PostgreSqlDatabaseServerPluginConfig,
  ): Promise<SetupTestsPluginInstance<PostgreSqlDatabaseServerPluginResult>> {
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
        const dockerConfig: PostgreSqlDatabaseDockerServerConfig = {
          serverName,
          port,
          user,
          password,
          database,
          version,
        };
        const postgreSqlDatabaseDockerServer =
          new PostgreSqlDatabaseDockerServer(dockerConfig);
        return postgreSqlDatabaseDockerServer.setup();
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
