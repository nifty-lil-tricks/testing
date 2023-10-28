// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type { PluginInstance } from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import { Client } from "./client.ts";

/**
 * PostgreSQL Database Server
 */
export class Server {
  constructor(
    /**
     * The ID of the PostgreSQL Server.
     */
    id: string,
    /**
     * The connection details for the PostgreSQL Server.
     */
    connection: Connection,
  ) {
    this.id = id;
    this.connection = connection;
  }

  /**
   * The ID of the PostgreSQL Server instance.
   */
  public readonly id: string;

  /**
   * The connection details for the PostgreSQL Server instance.
   */
  public readonly connection: Connection;

  /**
   * Initialize the PostgreSQL Server. Although safe to call, this is generally for internal use only.
   */
  public async init(): Promise<void> {
    let shouldReturn = false;
    while (shouldReturn === false) {
      // Revert to try/catch/finally block for readability when the following is fixed:
      // https://github.com/denoland/deno/issues/13781
      const client = new Client(this.connection);
      await client.connect()
        .then(() => shouldReturn = true)
        .catch(() => new Promise((resolve) => setTimeout(resolve, 300)))
        .finally(() => client.end());
    }
  }
}

/**
 * The strategy to use for setting up the database server.
 */
export const ServerStrategy = {
  /**
   * Use Docker to start a PostgreSQL database server.
   */
  DOCKER: "DOCKER",
} as const;
export type ServerStrategy = typeof ServerStrategy[keyof typeof ServerStrategy];

/**
 * PostgreSQL Plugin Server Strategy Contract.
 */
export interface ServerStrategyContract {
  /**
   * Setup the PostgreSQL server.
   */
  setup(): Promise<PluginInstance<Server>>;
}

/**
 * PostgreSQL Plugin Database Server Config
 */
export interface ServerConfig {
  /**
   * The strategy to use for setting up the database server.
   *
   * Available strategies:
   *  - `DOCKER`
   */
  strategy: ServerStrategy;
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
 * PostgreSQL Plugin Database Server Connection
 */
export interface Connection {
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
