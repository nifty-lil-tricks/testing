// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { beforeEach, describe, it } from "std/testing/bdd.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { setupTestsFactory } from "./setup_tests.ts";
import type { SetupTestsFn, SetupTestsLoader } from "./setup_tests.type.ts";

describe("setupTestsFactory", () => {
  let setupTests: SetupTestsFn<Loaders>;

  beforeEach(() => {
    teardownCalls = [];
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

  describe("teardown", () => {
    it("should run the teardown function of activated loaders", async () => {
      // Arrange
      const loader1Config: Loader1Config = { data1: ["1"] };
      const loader2Config: Loader2Config = { data2: [2] };
      const { teardown } = await setupTests({
        loader1: loader1Config,
        loader2: loader2Config,
      });

      // Act
      await teardown();

      // Assert
      assertEquals(teardownCalls, ["loader2.teardown", "loader1.teardown"]);
    });

    it("should run the teardown function of all loaders when all loaders are activated", async () => {
      // Arrange
      const loader1Config: Loader1Config = { data1: ["1"] };
      const { teardown } = await setupTests({
        loader1: loader1Config,
      });

      // Act
      await teardown();

      // Assert
      assertEquals(teardownCalls, ["loader1.teardown"]);
    });
  });
});

type Loaders = {
  loader1: SetupTestsLoader<Loader1Config, Loader1Result>;
  loader2: SetupTestsLoader<Loader2Config, Loader2Result>;
};

interface Loader1Config {
  data1: string[];
}

interface Loader1Result {
  loader1Result: Loader1Config;
}

interface Loader2Config {
  data2: number[];
}

interface Loader2Result {
  loader2Result: Loader2Config;
}

let teardownCalls: string[] = [];

const loader1: SetupTestsLoader<Loader1Config, Loader1Result> = {
  setup(input: Loader1Config) {
    return { loader1Result: input };
  },
  teardown() {
    teardownCalls.push("loader1.teardown");
  },
};

const loader2: SetupTestsLoader<Loader2Config, Loader2Result> = {
  setup(input: Loader2Config) {
    return { loader2Result: input };
  },
  teardown() {
    teardownCalls.push("loader2.teardown");
  },
};
