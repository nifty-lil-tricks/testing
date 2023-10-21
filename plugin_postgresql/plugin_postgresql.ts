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
import { SeedStrategy } from "./seed.strategy.ts";
import { MigrationSqlStrategy } from "./migration_sql.strategy.ts";
import { Client } from "x/postgres/client.ts";

// TODO: type file
/**
 * The strategy to use for setting up the database server.
 */
export type PostgreSqlDatabaseServerStrategy = "docker";

export interface PostgreSqlDatabaseStrategyContract {
  setup(): Promise<SetupTestsPluginInstance<PostgreSqlDatabaseServer>>;
}

// TODO: type file
// TODO: docs
export interface SeedStrategyResult {
  readonly query: string;
  readonly args: string[];
  readonly insertedCount?: number;
}

export interface SeedStrategyOutput {
  readonly results: SeedStrategyResult[];
  readonly warnings: unknown[];
}

export interface SeedStrategyContract {
  run(
    connection: PostgreSqlDatabaseServerPluginConnection,
  ): Promise<SeedStrategyOutput>;
}

export interface MigrationResult {
  readonly name: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface MigrationOutput {
  results: MigrationResult[];
}

export interface MigrationStrategyContract {
  run(): Promise<MigrationOutput>;
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
  DatabasePluginResult
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

  public async init(): Promise<void> {
    let shouldReturn = false;
    const client = new Client({
      tls: { enabled: false },
      ...this.connection,
    });
    while (shouldReturn === false) {
      // Revert to try/catch/finally block for readability when the following is fixed:
      // https://github.com/denoland/deno/issues/13781
      await client.connect()
        .then(() => shouldReturn = true)
        .catch(() => new Promise((resolve) => setTimeout(resolve, 300)))
        .finally(() => client.end());
    }
  }
}

/**
 * PostgreSQL Database Plugin Result.
 */
export interface DatabasePluginResult {
  /**
   * The Database Server instance.
   */
  readonly server: PostgreSqlDatabaseServer;

  /**
   * The migration output.
   */
  readonly migrate: MigrationOutput;

  /**
   * The seed output.
   */
  readonly seed: SeedStrategyOutput;
}

class PostgreSqlDatabasePluginFactory {
  public create(): PostgreSqlDatabasePlugin {
    return {
      setup: this.#setup.bind(this),
    };
  }

  async #setup(
    config: PostgreSqlDatabasePluginConfig,
  ): Promise<SetupTestsPluginInstance<DatabasePluginResult>> {
    let setup: SetupTestsPluginInstance<PostgreSqlDatabaseServer>;
    if (config.server instanceof PostgreSqlDatabaseServer) {
      const strategy = new PostgreSqlDatabaseConnectionStrategy(config.server);
      setup = await strategy.setup();
    } else {
      const suffix = Math.random().toString(36).substring(2);
      const database = config.server.databaseName ||
        `${config.server.databaseNamePrefix || "postgres"}-${suffix}`;
      const serverName = `${
        config.server.databaseServerNamePrefix || "postgres"
      }-${suffix}`;
      const port = config.server.port ?? 0;
      const user = config.server.user ??
        Math.random().toString(36).substring(2);
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
    }
    const { output: server, teardown } = setup;
    await server.init();

    return {
      teardown,
      output: {
        server,
        migrate: await this.#shouldRunMigration(config, server),
        seed: await this.#shouldRunSeed(config, server),
      },
    };
  }

  #shouldRunMigration(
    config: PostgreSqlDatabasePluginConfig,
    server: PostgreSqlDatabaseServer,
  ): MigrationOutput | Promise<MigrationOutput> {
    if (!config.migrate) {
      return { results: [] };
    }
    switch (config.migrate.strategy) {
      case MigrationStrategy.SQL: {
        const strategy = new MigrationSqlStrategy(server.connection);
        return strategy.run();
      }
      default: {
        return assertNever(
          config.migrate.strategy,
          `Unknown migration strategy: ${config.migrate.strategy}`,
        );
      }
    }
  }

  #shouldRunSeed(
    config: PostgreSqlDatabasePluginConfig,
    server: PostgreSqlDatabaseServer,
  ): SeedStrategyOutput | Promise<SeedStrategyOutput> {
    if (!config.seed) {
      return { results: [], warnings: [] };
    }
    const strategy = new SeedStrategy(config.seed, server.connection);
    return strategy.run();
  }
}

/**
 * PostgreSQL Database Plugin
 */
export const postgreSqlDatabasePlugin = new PostgreSqlDatabasePluginFactory()
  .create();
