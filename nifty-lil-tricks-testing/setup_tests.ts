// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { SetupTestsInput } from "./setup_tests.type.ts";

export async function setupTests(
  input: SetupTestsInput,
): Promise<Awaited<ReturnType<(typeof input)["loaders"][number]>>> {
  let results = {};

  for (const loader of Object.values(input.loaders)) {
    const result = await loader(input);
    if (result && typeof result === "object") {
      results = {
        ...results,
        ...result,
      };
    }
  }

  return results;
}
