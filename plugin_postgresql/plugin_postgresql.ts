// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  SetupTestsPlugin,
  SetupTestsPluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import {
  PostgreSqlDatabaseDockerStrategy,
  type PostgreSqlDatabaseDockerStrategyConfig,
} from "./plugin_postgresql_docker.strategy.ts";
import { PostgreSqlDatabaseConnectionStrategy } from "./plugin_postgresql_connection.strategy.ts";
import { assertNever } from "./plugin_postgresql.utils.ts";

// TODO: type file
/**
 * The strategy to use for setting up the database server.
 */
export type PostgreSqlDatabaseServerStrategy = "docker";

export interface PostgreSqlDatabaseStrategyContract {
  setup(): Promise<SetupTestsPluginInstance<PostgreSqlDatabaseServer>>;
}

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
  strategy: PostgreSqlDatabaseServerStrategy;
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

export interface PostgreSqlDatabasePluginConfig {
  server: PostgreSqlDatabaseServerPluginConfig | PostgreSqlDatabaseServer;
  // TODO: migrate
  // deno-lint-ignore no-explicit-any
  migrate?: any;
  // TODO: seed
  // deno-lint-ignore no-explicit-any
  seed?: any;
}

export type PostgreSqlDatabasePlugin = SetupTestsPlugin<
  PostgreSqlDatabasePluginConfig,
  PostgreSqlDatabaseServer
>;

/**
 * PostgreSQL Database Server
 */
export class PostgreSqlDatabaseServer {
  constructor(
    instanceId: string,
    connection: PostgreSqlDatabaseServerPluginConnection,
  ) {
    this.instanceId = instanceId;
    this.connection = connection;
  }

  /**
   * The ID of the PostgreSQL instance.
   */
  public readonly instanceId: string;

  /**
   * The connection details for the PostgreSQL instance.
   */
  public readonly connection: PostgreSqlDatabaseServerPluginConnection;
}

/**
 * PostgreSQL Database Plugin
 */
export const postgreSqlDatabasePlugin: PostgreSqlDatabasePlugin = {
  setup(
    config: PostgreSqlDatabasePluginConfig,
  ): Promise<SetupTestsPluginInstance<PostgreSqlDatabaseServer>> {
    if (config.server instanceof PostgreSqlDatabaseServer) {
      const strategy = new PostgreSqlDatabaseConnectionStrategy(config.server);
      return strategy.setup();
    }

    const suffix = Math.random().toString(36).substring(2);
    const database = config.server.databaseName ||
      `${config.server.databaseNamePrefix || "postgres"}-${suffix}`;
    const serverName = `${
      config.server.databaseServerNamePrefix || "postgres"
    }-${suffix}`;
    const port = config.server.port ?? 0;
    const user = config.server.user ?? Math.random().toString(36).substring(2);
    const password = config.server.password ??
      Math.random().toString(36).substring(2);
    const version = config.server.version || "latest";

    switch (config.server.strategy) {
      case "docker": {
        const dockerConfig: PostgreSqlDatabaseDockerStrategyConfig = {
          serverName,
          port,
          user,
          password,
          database,
          version,
        };
        const strategy = new PostgreSqlDatabaseDockerStrategy(dockerConfig);
        return strategy.setup();
      }
      default: {
        return assertNever(
          config.server.strategy,
          `Unknown strategy: ${config.server.strategy}`,
        );
      }
    }
  },
};
