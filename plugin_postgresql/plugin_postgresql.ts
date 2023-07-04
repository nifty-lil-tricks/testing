// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  SetupTestsPlugin,
  SetupTestsPluginInstance,
} from "../setup_tests.type.ts";
import { PostgresqlDatabaseDockerServer } from "./plugin_postgresql_docker.strategy.ts";

export type PostgresqlDatabaseServerPluginStrategy = "docker";

export interface PostgresqlDatabaseServerPluginConfig {
  strategy: PostgresqlDatabaseServerPluginStrategy;
}

export interface PostgresqlDatabaseServerPluginConnection {
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
    switch (config.strategy) {
      case "docker": {
        const postgresqlDatabaseDockerServer =
          new PostgresqlDatabaseDockerServer(config);
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

function assertNever(input: never, message?: string): never {
  throw new Error(message ?? "Unexpected input: " + input);
}
