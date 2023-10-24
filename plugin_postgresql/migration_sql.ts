// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { expandGlob } from "https://deno.land/std@0.194.0/fs/expand_glob.ts";
import { basename } from "https://deno.land/std@0.194.0/path/mod.ts";
import { Client } from "./client.ts";
import type {
  MigrationOutput,
  MigrationResult,
  MigrationStrategy,
  MigrationStrategyContract,
} from "./migration.ts";
import type { Connection } from "./server.ts";

export class SqlMigrationStrategy implements MigrationStrategyContract {
  #connection: Connection;
  #config: SqlMigrationConfig;

  constructor(config: SqlMigrationConfig, connection: Connection) {
    this.#connection = connection;
    this.#config = config;
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
    const client = new Client(this.#connection);
    await client.connect();
    try {
      const files: string[] = [];
      for await (
        const file of expandGlob("**/*.sql", { root: this.#config.root })
      ) {
        files.push(file.path);
      }
      if (files.length === 0) {
        throw new SqlMigrationError("No SQL files found", []);
      }
      for (const file of files) {
        const query = await Deno.readTextFile(file);
        const queryResult = await client.query(query);
        const filename = basename(file);
        results.push({
          name: filename,
          message: `Applied migration: ${filename}`,
          details: { query: queryResult.query },
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
  /**
   * The SQL root folder to search for SQL files from.
   */
  root: string;
  // TODO: add later support by mention as upcoming functionality in the README
  // files?: FunctionOrValue<string | string[]>;
  // orderBy?: MigrationOrderBy;
}
