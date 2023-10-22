// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

export interface PluginInstance<Result> {
  output: Result;
  teardown: () => MaybePromise<void>;
}

export type MaybePromise<Type> = Type | Promise<Type>;

export type SetupTestsPluginSetupFn<Config, Result> = (
  config: Config,
) => MaybePromise<PluginInstance<Result>>;

export type Plugin<Config, Result> = {
  setup: SetupTestsPluginSetupFn<Config, Result>;
};

// This is an acceptable use of any because it's only used in the type signature
// deno-lint-ignore no-explicit-any
export type SetupTestsPlugins = Record<string, Plugin<any, any>>;

// Remove when the base config actually contains values
// deno-lint-ignore no-empty-interface
export interface SetupTestsBaseConfig {}

export type SetupTestsConfig<Plugins extends SetupTestsPlugins> =
  & Omit<
    { [Key in keyof Plugins]?: Parameters<Plugins[Key]["setup"]>[0] },
    keyof SetupTestsBaseConfig
  >
  & SetupTestsBaseConfig;

export type SetupTestsResult<
  Plugins extends SetupTestsPlugins,
  Config extends SetupTestsConfig<Plugins>,
> = {
  outputs: {
    [Key in Extract<keyof Plugins, DefinedKeys<Config>>]: Awaited<
      ReturnType<Plugins[Key]["setup"]>
    >;
  };
  teardownTests: SetupTestsTeardown;
};

export type SetupTestsPluginTeardown = () => MaybePromise<void>;

export type SetupTestsTeardown = () => Promise<void>;

export type DefinedKeys<Type> = {
  [Key in keyof Type]-?: undefined extends Type[Key] ? never : Key;
}[keyof Type];

export type SetupTestsFactoryPlugins<Plugins extends SetupTestsPlugins> = {
  [Key in keyof Plugins]: Plugins[Key];
};

export type SetupTestsFactoryResult<Plugins extends SetupTestsPlugins> = {
  setupTests: SetupTestsFn<Plugins>;
};

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
