// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  SetupTestsConfig,
  SetupTestsFactoryPlugins,
  SetupTestsFactoryResult,
  SetupTestsPlugins,
  SetupTestsPluginTeardown,
  SetupTestsResult,
  SetupTestsTeardown,
} from "./type.ts";

/**
 * Set up tests with defined plugins.
 *
 * Each plugin must be given a name that is not one of the
 * reserved plugin names. This returns a function that when run,
 * sets up the tests to use the loaded plugins according to the provided
 * config.
 *
 * Each plugin must contain the following functions in order to be correctly loaded:
 *  - `setup`
 *  - `teardown`
 *
 * ```typescript
 * import { setupTestsFactory } from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";
 *
 * const helloWorldPlugin = {
 *   setup: (config: { message: string }) => {
 *     // Setup plugin according to config
 *     return {
 *       output: config,
 *       teardown: () => {}
 *     }
 *   },
 * }
 *
 * export const { setupTests } = setupTestsFactory({
 *   helloWorld: helloWorldPlugin,
 * });
 * ```
 */
export function setupTestsFactory<Plugins extends SetupTestsPlugins>(
  plugins: SetupTestsFactoryPlugins<Plugins>,
): SetupTestsFactoryResult<Plugins> {
  const service = new SetupTestsService(plugins);
  return {
    setupTests: service.setupTests.bind(service),
  };
}

class SetupTestsService<Plugins extends SetupTestsPlugins>
  implements SetupTestsFactoryResult<Plugins> {
  #plugins: SetupTestsFactoryPlugins<Plugins>;

  constructor(plugins: SetupTestsFactoryPlugins<Plugins>) {
    this.#plugins = plugins;
  }

  #buildTeardown(teardowns: SetupTestsPluginTeardown[]): SetupTestsTeardown {
    return async () => {
      for (const teardown of teardowns) {
        await teardown();
      }
    };
  }

  async setupTests<Config extends SetupTestsConfig<Plugins>>(
    config: Config,
  ): Promise<SetupTestsResult<Plugins, Config>> {
    let outputs = {} as SetupTestsResult<Plugins, Config>["outputs"];
    const teardowns: SetupTestsPluginTeardown[] = [];
    const { ...pluginsConfig } = config;
    for (const [pluginName, pluginConfig] of Object.entries(pluginsConfig)) {
      // TODO: add in when generic config is added
      // assertAllowedPluginName(pluginName);
      const plugin = this.#plugins[pluginName];
      const { teardown, output } = await plugin.setup(pluginConfig);
      const pluginOutput = {
        output,
        teardown,
      } as Awaited<ReturnType<Plugins[keyof Plugins]["setup"]>>;
      outputs = {
        ...outputs,
        [pluginName]: pluginOutput,
      };
      teardowns.push(
        teardown,
      );
    }

    return {
      outputs,
      teardownTests: this.#buildTeardown(teardowns.reverse()).bind(this),
    };
  }
}

/**
 * Assert that the input is never and not unexpected.
 */
export function assertNever(_input: never, message: string): never {
  throw new Error(message);
}

// TODO: add in when generic config is added
// function assertAllowedPluginName(pluginName: string): void {
//   const bannedPluginNames: Record<keyof SetupTestsBaseConfig, string> = {};
//   if (
//     Object.keys(bannedPluginNames).includes(
//       pluginName as keyof SetupTestsBaseConfig,
//     )
//   ) {
//     throw new SetupTestsError(
//       `'${pluginName}' is a reserved plugin name, please choose another name that is not one of ${
//         Object.keys(bannedPluginNames).join("|")
//       }`,
//     );
//   }
// }

// /**
//  * SetupTestsError
//  */
// export class SetupTestsError extends Error {
//   /**
//    * name of the error.
//    */
//   override name = "SetupTestsError";
// }
