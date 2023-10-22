// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { expandGlob } from "std/fs/expand_glob.ts";
import { basename } from "std/path/mod.ts";
import { Client } from "x/postgres/client.ts";
import type {
  MigrationOutput,
  MigrationResult,
  MigrationStrategy,
  MigrationStrategyContract,
} from "./migration.ts";
import type { Connection } from "./server.ts";

export class SqlMigrationStrategy implements MigrationStrategyContract {
  #connection: Connection;

  constructor(connection: Connection) {
    this.#connection = connection;
  }

  public async run(): Promise<MigrationOutput> {
    const results: MigrationResult[] = [];
    try {
      return await this.#run(results);
    } catch (error) {
      throw new SqlMigrationError(
        `Unable to run migrations: ${(error as Error).message}`,
        results,
      );
    }
  }

  // Merge with the above for readability when the following is fixed:
  // https://github.com/denoland/deno/issues/13781
  async #run(results: MigrationResult[]): Promise<MigrationOutput> {
    const client = new Client({
      tls: { enabled: false },
      ...this.#connection,
    });
    await client.connect();
    try {
      const files: string[] = [];
      for await (const file of expandGlob("**\/migrations\/**\/*.sql")) {
        files.push(file.path);
      }
      for (const file of files) {
        const query = await Deno.readTextFile(file);
        const queryResult = await client.queryObject(query);
        const filename = basename(file);
        results.push({
          name: filename,
          message: `Applied migration: ${filename}`,
          details: { query: queryResult.query.text },
        });
      }
      return { results };
    } finally {
      await client.end();
    }
  }
}

/**
 * PostgreSQL Plugin Sql Migration error .
 */
export class SqlMigrationError extends Error {
  /**
   * The name of the error.
   */
  public override readonly name = "SqlMigrationError";

  /**
   * The details of the error.
   */
  public readonly details: MigrationResult[];

  constructor(message: string, details: MigrationResult[]) {
    super(message);
    this.details = details;
  }
}

/**
 * PostgreSQL Plugin Database SQL Migration Config
 */
export interface SqlMigrationConfig {
  /**
   * The SQL strategy. There are no other options for this config.
   */
  strategy: Extract<MigrationStrategy, "SQL">;
  // TODO: add later support by mention as upcoming functionality in the README
  // files?: FunctionOrValue<string | string[]>;
  // orderBy?: MigrationOrderBy;
}
