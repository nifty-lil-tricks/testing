// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import type {
  SetupTestsBaseConfig,
  SetupTestsConfig,
  SetupTestsFactoryLoaders,
  SetupTestsFactoryResult,
  SetupTestsLoaders,
  SetupTestsLoaderTeardown,
  SetupTestsResult,
  SetupTestsTeardown,
} from "./setup_tests.type.ts";

export function setupTestsFactory<TLoaders extends SetupTestsLoaders>(
  loaders: SetupTestsFactoryLoaders<TLoaders>,
): SetupTestsFactoryResult<TLoaders> {
  const service = new SetupTestsService(loaders);
  return {
    setupTests: service.setupTests.bind(service),
  };
}

class SetupTestsService<TLoaders extends SetupTestsLoaders>
  implements SetupTestsFactoryResult<TLoaders> {
  #loaders: SetupTestsFactoryLoaders<TLoaders>;

  constructor(loaders: SetupTestsFactoryLoaders<TLoaders>) {
    this.#loaders = loaders;
  }

  #buildLoaderTeardown<TConfig, TResult>(
    loaderName: string,
    config: TConfig,
    result: TResult,
  ): SetupTestsLoaderTeardown {
    const loader = this.#loaders[loaderName];
    return () => {
      return loader.teardown(config, result);
    };
  }

  #buildTeardown(teardowns: SetupTestsLoaderTeardown[]): SetupTestsTeardown {
    return async () => {
      for (const teardown of teardowns) {
        await teardown();
      }
    };
  }

  async setupTests<TConfig extends SetupTestsConfig<TLoaders>>(
    config: TConfig,
  ): Promise<SetupTestsResult<TLoaders, TConfig>> {
    let data = {};
    const teardowns: SetupTestsLoaderTeardown[] = [];
    const { ...loadersConfig } = config;
    for (const [loaderName, loaderConfig] of Object.entries(loadersConfig)) {
      assertAllowedLoaderName(loaderName);
      const loader = this.#loaders[loaderName];
      const result = await loader.setup(loaderConfig);
      data = {
        ...data,
        [loaderName]: result,
      };
      teardowns.push(
        this.#buildLoaderTeardown(loaderName, loaderConfig, result),
      );
    }

    return {
      data: data as SetupTestsResult<TLoaders, TConfig>["data"],
      teardown: this.#buildTeardown(teardowns.reverse()).bind(this),
    };
  }
}

function assertAllowedLoaderName(loaderName: string): void {
  const bannedLoaderNames: Record<keyof SetupTestsBaseConfig, string> = {};
  if (
    Object.keys(bannedLoaderNames).includes(
      loaderName as keyof SetupTestsBaseConfig,
    )
  ) {
    throw new SetupTestsError(
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
