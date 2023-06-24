// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { beforeEach, describe, it } from "std/testing/bdd.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { setupTestsFactory } from "./setup_tests.ts";
import type { SetupTestsFn } from "./setup_tests.type.ts";

describe("setupTestsFactory", () => {
  let setupTests: SetupTestsFn<Loaders>;

  beforeEach(() => {
    const { setupTests: setupTestsFn } = setupTestsFactory({
      loader1,
      loader2,
    });
    setupTests = setupTestsFn;
  });

  describe("setupTests", () => {
    it("should run activated loaders and return the results", async () => {
      // Arrange
      const loader1Config: Loader1Config = { data1: ["1"] };

      // Act
      const result = await setupTests({
        loader1: loader1Config,
      });

      // Assert
      assertEquals(result.data, { loader1: { loader1Result: loader1Config } });
    });

    it("should run loaders and return the results when all loaders are activated", async () => {
      // Arrange
      const loader1Config: Loader1Config = { data1: ["1"] };
      const loader2Config: Loader2Config = { data2: [2] };

      // Act
      const result = await setupTests({
        loader1: loader1Config,
        loader2: loader2Config,
      });

      // Assert
      assertEquals(result.data, {
        loader1: { loader1Result: loader1Config },
        loader2: { loader2Result: loader2Config },
      });
    });
  });
});

type Loaders = {
  loader1: (input: Loader1Config) => Promise<{ loader1Result: Loader1Config }>;
  loader2: (input: Loader2Config) => Promise<{ loader2Result: Loader2Config }>;
};

interface Loader1Config {
  data1: string[];
}

interface Loader2Config {
  data2: number[];
}

function loader1(input: Loader1Config) {
  return { loader1Result: input };
}

async function loader2(input: Loader2Config) {
  return await Promise.resolve({ loader2Result: input });
}
