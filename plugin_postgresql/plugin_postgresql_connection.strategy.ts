// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  type SetupTestsPluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import type {
  PostgreSqlDatabaseServer,
  PostgreSqlDatabaseStrategyContract,
} from "./plugin.ts";

export class PostgreSqlDatabaseConnectionStrategy
  implements PostgreSqlDatabaseStrategyContract {
  #server: PostgreSqlDatabaseServer;
  constructor(server: PostgreSqlDatabaseServer) {
    this.#server = server;
  }

  setup(): Promise<
    SetupTestsPluginInstance<PostgreSqlDatabaseServer>
  > {
    return Promise.resolve({
      output: this.#server,
      teardown: async () => {},
    });
  }
}
