// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Client } from "x/postgres/client.ts";
import {
  PostgreSqlDatabaseServerPluginConnection,
  SeedConfig,
  SeedStrategyContract,
  SeedStrategyOutput,
  SeedStrategyResult,
} from "./plugin.ts";

export class SeedStrategy implements SeedStrategyContract {
  #config: SeedConfig;
  #connection: PostgreSqlDatabaseServerPluginConnection;

  constructor(
    config: SeedConfig,
    connection: PostgreSqlDatabaseServerPluginConnection,
  ) {
    this.#config = config;
    this.#connection = connection;
  }

  public async run(): Promise<SeedStrategyOutput> {
    const client = new Client({
      tls: { enabled: false },
      ...this.#connection,
    });
    await client.connect();
    try {
      const warnings: unknown[] = [];
      const results: SeedStrategyResult[] = [];
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
        // TODO: add result to output
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
