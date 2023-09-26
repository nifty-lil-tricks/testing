// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { expandGlob } from "std/fs/expand_glob.ts";
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
import { Client } from "x/postgres/client.ts";

// TODO: type file
/**
 * The strategy to use for setting up the database server.
 */
export type PostgreSqlDatabaseServerStrategy = "docker";

export interface PostgreSqlDatabaseStrategyContract {
  setup(): Promise<SetupTestsPluginInstance<PostgreSqlDatabaseServer>>;
}

export const MigrationStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
};
export type MigrationStatus = keyof typeof MigrationStatus;

export interface MigrationResult {
  status: MigrationStatus;
  message: string;
}

export interface MigrationResults {
  status: MigrationStatus;
  results: MigrationResult[];
}

export interface MigrationStrategyContract {
  run(): Promise<MigrationResults>;
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

// TODO: make types shorter because we can assume the context

// TODO: docs
export const MigrationStrategy = {
  SQL: "SQL",
} as const;
export type MigrationStrategy = keyof typeof MigrationStrategy;

export const MigrationOrderBy = {
  FILENAME_DESC: "FILENAME_DESC",
} as const;
export type MigrationOrderBy = keyof typeof MigrationOrderBy;

// TODO: maybe move to the root
export type FunctionOrValue<V> = V | (() => Promise<V>) | (() => V);

export interface MigrationSqlConfig {
  strategy: Extract<MigrationStrategy, "SQL">;
  // TODO: add later support
  // files?: FunctionOrValue<string | string[]>;
  // orderBy?: MigrationOrderBy;
}

export type MigrationConfig = MigrationSqlConfig;

export type SeedConfig = Record<string, Record<string, unknown>[]>;

export interface PostgreSqlDatabasePluginConfig {
  server: PostgreSqlDatabaseServerPluginConfig | PostgreSqlDatabaseServer;
  migrate?: MigrationConfig;
  seed?: SeedConfig;
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
  async setup(
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

    let setup: SetupTestsPluginInstance<PostgreSqlDatabaseServer>;
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
        setup = await strategy.setup();
        break;
      }
      default: {
        return assertNever(
          config.server.strategy,
          `Unknown strategy: ${config.server.strategy}`,
        );
      }
    }

    // Run migrations
    if (config.migrate) {
      switch (config.migrate.strategy) {
        case MigrationStrategy.SQL: {
          const files: string[] = [];
          for await (const file of expandGlob("**\/migrations\/**\/*.sql")) {
            files.push(file.path);
          }
          const client = new Client({
            ...setup.output.connection,
            tls: { enabled: false },
          });
          await client.connect();
          for (const file of files) {
            const query = await Deno.readTextFile(file);
            // TODO: add result to output
            await client.queryObject(query);
          }
          await client.end();
          break;
        }
        default: {
          return assertNever(
            config.migrate.strategy,
            `Unknown strategy: ${config.migrate.strategy}`,
          );
        }
      }
    }

    // Run seed
    if (config.seed) {
      const client = new Client({
        ...setup.output.connection,
        tls: { enabled: false },
      });
      await client.connect();
      for (const [table, rows] of Object.entries(config.seed)) {
        const columns = Object.keys(rows[0]);
        const queryValues: string[] = [];
        const values: unknown[] = [];
        let count = 1;
        for (const row of rows) {
          const queryValue: number[] = [];
          for (const _ of Object.values(row)) {
            queryValue.push(count);
            count += 1;
          }
          queryValues.push(`(${queryValue.map(value => `$${value}`).join(',')})`);
          values.push(...Object.values(row));
        }
        const query = `INSERT INTO "${table}" (${columns}) VALUES ${queryValues.join(', ')};`;
        // TODO: add result to output
        await client.queryObject(query, values);
      }
      await client.end();
    }

    return setup;
  },
};
