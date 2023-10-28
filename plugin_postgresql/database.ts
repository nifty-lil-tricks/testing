// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { SetupTestsTeardown } from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import { Client } from "./client.ts";
import { Server } from "./server.ts";

/**
 * PostgreSQL Plugin Database Strategy Contract.
 */
export interface DatabaseStrategyContract {
  /**
   * Run the Database strategy.
   */
  run(): Promise<DatabaseOutput>;
}

export class DatabaseStrategy implements DatabaseStrategyContract {
  #config: DatabaseConfig;
  #server: Server;

  constructor(
    config: DatabaseConfig,
    server: Server,
  ) {
    this.#config = config;
    this.#server = server;
  }

  public async run(): Promise<DatabaseOutput> {
    const client = new Client(this.#server.connection);
    await client.connect();
    try {
      const databaseName = `${this.#config.prefix}_${this.#getRandomString()}`;
      await client.query(`CREATE DATABASE ${databaseName};`);
      const server = new Server(this.#server.id, {
        ...this.#server.connection,
        database: databaseName,
      });
      return { server, teardown: this.#buildTeardown(server) };
    } finally {
      await client.end();
    }
  }

  #buildTeardown(server: Server): SetupTestsTeardown {
    return async () => {
      try {
        // Open a connection on the old server so we can drop the database
        const client = new Client(this.#server.connection);
        await client.connect();
        try {
          await client.query(
            `DROP DATABASE ${server.connection.database};`,
          );
        } finally {
          await client.end();
        }
      } catch {
        // No-op
      }
    };
  }

  #getRandomString(): string {
    const buf = new Uint8Array(8 / 2);
    crypto.getRandomValues(buf);
    let ret = "";
    for (let i = 0; i < buf.length; ++i) {
      ret += ("0" + buf[i].toString(16)).slice(-2);
    }
    return ret;
  }
}

/**
 * PostgreSQL Plugin Database configuration.
 */
export interface DatabaseConfig {
  /**
   * The prefix of the database to be created.
   *
   * This will be combined with a random string to create the database name.
   *
   * A prefix of `"custom"` will generate a database name of `"custom_v2a45b78"`.
   */
  prefix: string;
}

/**
 * PostgreSQL Plugin Database output.
 */
export interface DatabaseOutput {
  /**
   * The server with the created database.
   */
  server: Server;
  /**
   * The teardown function of the created database.
   */
  teardown: SetupTestsTeardown;
}
