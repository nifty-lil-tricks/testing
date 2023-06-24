// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

export type SetupTestsLoader<TLoaderInput, TLoaderResult> = (
  input: TLoaderInput,
) => Promise<TLoaderResult>;

export interface SetupTestsInput {
  loaders: SetupTestsLoader<unknown, unknown>[];
}
