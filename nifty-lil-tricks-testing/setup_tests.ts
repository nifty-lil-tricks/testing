// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  SetupTestsBaseConfig,
  SetupTestsConfig,
  SetupTestsFactoryConfig,
  SetupTestsFactoryResult,
  SetupTestsLoaders,
  SetupTestsResult,
} from "./setup_tests.type.ts";

// TODO: make into a class but this is fine for now
export function setupTestsFactory<TLoaders extends SetupTestsLoaders>(
  loadersConfig: SetupTestsFactoryConfig<TLoaders>,
): SetupTestsFactoryResult<TLoaders> {
  return {
    setupTests: <TConfig extends SetupTestsConfig<TLoaders>>(
      config: TConfig,
    ): Promise<SetupTestsResult<TLoaders, TConfig>> =>
      setupTests(loadersConfig, config),
  };
}

async function setupTests<
  TLoaders extends SetupTestsLoaders,
  TConfig extends SetupTestsConfig<TLoaders>,
>(
  loaders: SetupTestsFactoryConfig<TLoaders>,
  config: TConfig,
): Promise<SetupTestsResult<TLoaders, TConfig>> {
  const results = { data: {} };

  const { ...loadersConfig } = config;
  for (const [loaderName, loaderConfig] of Object.entries(loadersConfig)) {
    assertAllowedLoaderName(loaderName);
    const loader = loaders[loaderName];
    const result = await loader(loaderConfig);
    results.data = {
      ...results.data,
      [loaderName]: result,
    };
  }

  return results as SetupTestsResult<TLoaders, typeof config>;
}

export function assertAllowedLoaderName(loaderName: string): void {
  const bannedLoaderNames: Record<keyof SetupTestsBaseConfig, string> = {};
  if (
    Object.keys(bannedLoaderNames).includes(
      loaderName as keyof SetupTestsBaseConfig,
    )
  ) {
    throw new Error(
      `'${loaderName}' is a reserved loader name, please choose another name that is not one of ${
        Object.keys(bannedLoaderNames).join("|")
      }`,
    );
  }
}

export class SetupTestsError extends Error {
  override name = "SetupTestsError";
}

// TODO: remove
// interface Loader1Input {
//   data1: string[];
// }

// interface Loader2Input {
//   data2: number[];
// }

// async function loader1(input: Loader1Input) {
//   console.log("loader1 input", input);
//   return await "loader1Result";
// }

// async function loader2(input: Loader2Input) {
//   console.log("loader2 input", input);
//   return await 2;
// }

// const r = await setupTests({
//   loaders: {
//     loader1,
//     loader2,
//   },
//   loader1: { data1: ["1"] },
//   loader2: { data2: [1] },
// });

// console.log("loader1 result", r.data.loader1);
// console.log("loader2 result", r.data.loader2);
