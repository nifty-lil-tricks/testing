// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Client } from "x/postgres/client.ts";
import {
  MigrationOutput,
  MigrationResult,
  MigrationStrategyContract,
  PostgreSqlDatabaseServerPluginConnection,
} from "./plugin_postgresql.ts";
import { expandGlob } from "std/fs/expand_glob.ts";
import { basename } from "std/path/mod.ts";

export class MigrationSqlStrategy implements MigrationStrategyContract {
  #connection: PostgreSqlDatabaseServerPluginConnection;

  constructor(connection: PostgreSqlDatabaseServerPluginConnection) {
    this.#connection = connection;
  }

  public async run(): Promise<MigrationOutput> {
    const results: MigrationResult[] = [];
    try {
      return await this.#run(results);
    } catch (error) {
      throw new MigrationSqlError(
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

export class MigrationSqlError extends Error {
  public override readonly name = "MigrationSqlError";

  public readonly details: MigrationResult[];

  constructor(message: string, details: MigrationResult[]) {
    super(message);
    this.details = details;
  }
}
