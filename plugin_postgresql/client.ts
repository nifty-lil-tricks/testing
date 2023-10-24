// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

// @deno-types="npm:@types/pg@^8.10.7"
import pg from "npm:pg@^8.11.3";

/**
 * PostgreSQL Plugin Client Contract.
 */
export class Client {
  #client: pg.Client;

  constructor(options: ClientOptions) {
    this.#client = new pg.Client({ ...options, host: options.hostname });
  }

  /**
   * Connect to the PostgreSQL Server.
   */
  public async connect(): Promise<void> {
    await this.#client.connect();
  }

  /**
   * Execute a query against the PostgreSQL Server.
   * @param queryText The query to execute.
   * @param values The values to use for the query.
   * @returns The result of the query.
   */
  public async query(
    queryText: string,
    values: unknown[] = [],
  ): Promise<QueryResult> {
    const result = await this.#client.query(queryText, values);
    return {
      query: queryText,
      args: values,
      rowCount: result.rowCount,
      rows: result.rows,
    };
  }

  /**
   * End the connection to the PostgreSQL Server.
   */
  public async end(): Promise<void> {
    await this.#client.end();
  }
}

/**
 * PostgreSQL Plugin Client Options Contract.
 */
export interface ClientOptions {
  /**
   * The hostname of the PostgreSQL Server.
   */
  hostname: string;
  /**
   * The port of the PostgreSQL Server.
   */
  port: number;
  /**
   * The username to use when connecting to the PostgreSQL Server.
   */
  user: string;
  /**
   * The password to use when connecting to the PostgreSQL Server.
   */
  password: string;
  /**
   * The database to use when connecting to the PostgreSQL Server.
   */
  database: string;
}

/**
 * PostgreSQL Plugin Query Result Contract.
 */
export interface QueryResult {
  /**
   * The query that was executed.
   */
  query: string;
  /**
   * The arguments that were used for the query.
   */
  args: unknown[];
  /**
   * The number of rows returned by the query.
   */
  rowCount: number;
  /**
   * The rows returned by the query.
   */
  rows: unknown[];
}
