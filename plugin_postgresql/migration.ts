// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type { SqlMigrationConfig } from "./migration_sql.ts";

/**
 * PostgreSQL Plugin Migration Strategy Contract.
 */
export interface MigrationStrategyContract {
  /**
   * Run the Migration strategy.
   */
  run(): Promise<MigrationOutput>;
}

/**
 * PostgreSQL Plugin Migration result.
 */
export interface MigrationResult {
  /**
   * The name of the migration that was run.
   */
  readonly name: string;
  /**
   * The status of the migration run.
   */
  readonly message: string;
  /**
   * The details of the migration run. This is useful for debugging issues with the migration.
   */
  readonly details?: unknown;
}

/**
 * PostgreSQL Plugin Migration output.
 */
export interface MigrationOutput {
  /**
   * The Migration results.
   */
  results: MigrationResult[];
}

/**
 * PostgreSQL Plugin Database Migration Strategy options.
 */
export const MigrationStrategy = {
  /**
   * Run SQL migrations.
   */
  SQL: "SQL",
} as const;
export type MigrationStrategy =
  typeof MigrationStrategy[keyof typeof MigrationStrategy];

/**
 * PostgreSQL Plugin Database Migration Order By options.
 */
export const MigrationOrderBy = {
  /**
   * Order migrations by the filename descending.
   */
  FILENAME_DESC: "FILENAME_DESC",
  /**
   * Order migrations by the filename ascending.
   */
  FILENAME_ASC: "FILENAME_ASC",
} as const;
export type MigrationOrderBy =
  typeof MigrationOrderBy[keyof typeof MigrationOrderBy];

/**
 * PostgreSQL Plugin Database Migration Config.
 */
export type MigrationConfig = SqlMigrationConfig;
