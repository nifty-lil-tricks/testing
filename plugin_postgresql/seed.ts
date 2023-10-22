// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Client } from "x/postgres/client.ts";
import type { Connection } from "./server.ts";

/**
 * PostgreSQL Plugin Seed Strategy Contract.
 */
export interface SeedStrategyContract {
  /**
   * Run the Seed strategy.
   */
  run(): Promise<SeedOutput>;
}

export class SeedStrategy implements SeedStrategyContract {
  #config: SeedConfig;
  #connection: Connection;

  constructor(
    config: SeedConfig,
    connection: Connection,
  ) {
    this.#config = config;
    this.#connection = connection;
  }

  public async run(): Promise<SeedOutput> {
    const client = new Client({
      tls: { enabled: false },
      ...this.#connection,
    });
    await client.connect();
    try {
      const warnings: unknown[] = [];
      const results: SeedResult[] = [];
      for (const [table, rows] of Object.entries(this.#config)) {
        const columns = Object.keys(rows[0]);
        const rowValueRefs: string[] = [];
        const values: unknown[] = [];
        let count = 1;
        for (const row of rows) {
          // Build the value references for the row. It will look something like:
          // ($1, $2)
          const rowValues = Object.values(row);
          const valueRefsForRow = rowValues.map(() => count++);
          rowValueRefs.push(
            `(${valueRefsForRow.map((value) => `$${value}`).join(",")})`,
          );
          values.push(...rowValues);
        }
        // Construct SQL query. It will look something like:
        // INSERT INTO "users" ("id", "name") VALUES ($1, $2), ($3, $4);
        const query = `INSERT INTO "${table}" (${columns}) VALUES ${
          rowValueRefs.join(", ")
        };`;
        const queryResult = await client.queryObject(query, values);
        results.push({
          query: queryResult.query.text,
          args: queryResult.query.args.map((arg) => String(arg)),
          insertedCount: queryResult.rowCount,
        });
        warnings.push(...queryResult.warnings);
      }
      return { results, warnings };
    } finally {
      await client.end();
    }
  }
}

/**
 * PostgreSQL Plugin Database Seed Config.
 */
export type SeedConfig = Record<string, Record<string, unknown>[]>;

/**
 * PostgreSQL Plugin Seed result.
 */
export interface SeedResult {
  /**
   * The PostgreSQL query that was executed.
   */
  readonly query: string;
  /**
   * The arguments that were passed to the query.
   */
  readonly args: string[];
  /**
   * The number of rows that were inserted by the query. If not defined, no rows were inserted.
   */
  readonly insertedCount?: number;
}

/**
 * PostgreSQL Plugin Seed output.
 */
export interface SeedOutput {
  /**
   * The Seed results.
   */
  readonly results: SeedResult[];
  /**
   * The Seed warnings. If no warning, the array will be empty.
   */
  readonly warnings: unknown[];
}
