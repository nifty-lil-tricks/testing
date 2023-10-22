// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  PluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
import type { Server, ServerStrategyContract } from "./server.ts";

export class ConnectionStrategy implements ServerStrategyContract {
  #server: Server;
  constructor(server: Server) {
    this.#server = server;
  }

  setup(): Promise<
    PluginInstance<Server>
  > {
    return Promise.resolve({
      output: this.#server,
      teardown: async () => {},
    });
  }
}
