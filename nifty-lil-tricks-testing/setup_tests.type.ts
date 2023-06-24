// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

export type SetupTestsLoader<I, R> = (input: I) => R | Promise<R>;

// This is an acceptable use of any because it's only used in the type signature
// deno-lint-ignore no-explicit-any
export type SetupTestsLoaders = Record<string, SetupTestsLoader<any, any>>;

// Remove when the base config actually contains values
// deno-lint-ignore no-empty-interface
export interface SetupTestsBaseConfig {}

export type SetupTestsConfig<TLoaders extends SetupTestsLoaders> =
  & Omit<
    { [K in keyof TLoaders]?: Parameters<TLoaders[K]>[0] },
    keyof SetupTestsBaseConfig
  >
  & SetupTestsBaseConfig;

export type SetupTestsResult<
  TLoaders extends SetupTestsLoaders,
  TConfig extends SetupTestsConfig<TLoaders>,
> = {
  data: {
    [K in Extract<keyof TLoaders, DefinedKeys<TConfig>>]: Awaited<
      ReturnType<TLoaders[K]>
    >;
  };
};

export type DefinedKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export type SetupTestsFactoryConfig<TLoaders extends SetupTestsLoaders> = {
  [K in keyof TLoaders]: TLoaders[K];
};

export type SetupTestsFactoryResult<TLoaders extends SetupTestsLoaders> = {
  setupTests: SetupTestsFn<TLoaders>;
};

export type SetupTestsFn<TLoaders extends SetupTestsLoaders> = <
  TConfig extends SetupTestsConfig<TLoaders>,
>(
  config: TConfig,
) => Promise<SetupTestsResult<TLoaders, TConfig>>;

// TODO: remove
// import { setupTestsFactory } from "./setup_tests.ts";

// const { setupTests } = setupTestsFactory({
//   loader1,
//   loader2,
// });
// const loader1Config: Loader1Config = { data1: ["1"] };
// const loader2Config: Loader2Config = { data2: [2] };
// const result = await setupTests({
//   loader1: loader1Config,
//   // loader2: loader2Config,
// });
// console.log(result.data.loader1);
// console.log(result.data.loader2);

// export interface HelloInput {
//   there: "there";
// }

// export interface HelloInput {
//   there: "there";
// }

// type Loaders = {
//   loader1: (input: Loader1Config) => Promise<{ loader1Result: Loader1Config }>;
//   loader2: (input: Loader2Config) => Promise<{ loader2Result: Loader2Config }>;
// };

// interface Loader1Config {
//   data1: string[];
// }

// interface Loader2Config {
//   data2: number[];
// }

// function loader1(input: Loader1Config) {
//   return { loader1Result: input };
// }

// async function loader2(input: Loader2Config) {
//   return await Promise.resolve({ loader2Result: input });
// }
