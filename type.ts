// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

/**
 * A plugin instance.
 */
export interface PluginInstance<Result> {
  /**
   * The output of the plugin.
   */
  output: Result;
  /**
   * A promise that when resolved, will teardown the plugin.
   */
  teardown: () => MaybePromise<void>;
}

/**
 * A type indicating that a value is either a value of type `Type` or a promise of a value of type `Type`.
 */
export type MaybePromise<Type> = Type | Promise<Type>;

/**
 * A plugin setup function.
 */
export type SetupTestsPluginSetupFn<Config, Result> = (
  config: Config,
) => MaybePromise<PluginInstance<Result>>;

/**
 * A plugin that can be used to setup tests.
 */
export type Plugin<Config, Result> = {
  /**
   * Setup the plugin.
   */
  setup: SetupTestsPluginSetupFn<Config, Result>;
};

// This is an acceptable use of any because it's only used in the type signature
// deno-lint-ignore no-explicit-any
export type SetupTestsPlugins = Record<string, Plugin<any, any>>;

// Remove when the base config actually contains values
// deno-lint-ignore no-empty-interface
export interface SetupTestsBaseConfig {}

/**
 * The configuration for the setup tests.
 */
export type SetupTestsConfig<Plugins extends SetupTestsPlugins> =
  & Omit<
    { [Key in keyof Plugins]?: Parameters<Plugins[Key]["setup"]>[0] },
    keyof SetupTestsBaseConfig
  >
  & SetupTestsBaseConfig;

/**
 * The result of running setup tests.
 */
export type SetupTestsResult<
  Plugins extends SetupTestsPlugins,
  Config extends SetupTestsConfig<Plugins>,
> = {
  /**
   * The outputs of each setup plugin organised by the input keys.
   */
  outputs: {
    [Key in Extract<keyof Plugins, DefinedKeys<Config>>]: Awaited<
      ReturnType<Plugins[Key]["setup"]>
    >;
  };
  /**
   * A promise that when resolved, will teardown all the activated plugins.
   */
  teardownTests: SetupTestsTeardown;
};

export type SetupTestsPluginTeardown = () => MaybePromise<void>;

export type SetupTestsTeardown = () => Promise<void>;

/**
 * The defined keys of the Setup Tests result.
 */
export type DefinedKeys<Type> = {
  [Key in keyof Type]-?: undefined extends Type[Key] ? never : Key;
}[keyof Type];

/**
 * Set up tests with defined plugins.
 */
export type SetupTestsFactoryPlugins<Plugins extends SetupTestsPlugins> = {
  [Key in keyof Plugins]: Plugins[Key];
};

export type SetupTestsFactoryResult<Plugins extends SetupTestsPlugins> = {
  /**
   * Setup tests by using the loaded plugins.
   *
   * The loaded plugins available to the setupTests function returned
   * from the factory can be configured using config namespaced to the
   * name of the plugin. For example, if the plugin is named `helloWorld`,
   * then the config for that plugin must be provided under the `helloWorld`
   * namespace.
   *
   * When run, setupTests will return an object with the data returned from
   * the plugin invocation. The data will be namespaced to the plugin name.
   *
   * Only plugins that are configured will be run. If a plugin is not configured,
   * then it will not be run. The order of the plugins in the config is defined
   * the order in which they defined in the config object. This follows the rules as
   * defined [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in#description).
   *
   * The returned object will also contain a `teardown` function that when
   * run, will teardown the plugins in the reverse order that they were
   * setup.
   *
   * ```typescript
   * import { setupTestsFactory } from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
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
   *
   * const result = await setupTests({
   *   helloWorld: {
   *     message: "Hello World!",
   *   }
   * })
   *
   * console.log(result.outputs.helloWorld.output); // "Hello World!"
   *
   * await result.teardownTests();
   * ```
   */
  setupTests: SetupTestsFn<Plugins>;
};

/**
 * Setup Tests.
 * @param config The configuration for the tests.
 */
export type SetupTestsFn<Plugins extends SetupTestsPlugins> = <
  Config extends SetupTestsConfig<Plugins>,
>(
  config: Config,
) => Promise<SetupTestsResult<Plugins, Config>>;

/**
 * Marks a type as being one of the following:
 *  - A value of type `V`
 *  - A function that returns a value of type `V`
 *  - A function that returns a promise of a value of type `V`
 */
export type FunctionOrValue<V> = V | (() => Promise<V>) | (() => V);
