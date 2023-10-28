// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.192.0/testing/bdd.ts";
import {
  setupTestsFactory,
  SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";

// Define or import plugins as follows:
const helloWorldPlugin1 = {
  setup: (config: { message: string }) => {
    // Setup plugin according to config
    return {
      output: {
        plugin1: true,
        ...config,
      },
      teardown: () => {},
    };
  },
};
const helloWorldPlugin2 = {
  setup: (config: { message: string }) => {
    // Setup plugin according to config
    return {
      output: {
        plugin2: true,
        ...config,
      },
      teardown: () => {},
    };
  },
};

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  helloWorld1: helloWorldPlugin1,
  helloWorld2: helloWorldPlugin2,
});

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let output1: { message: string; plugin1: boolean };
  let output2: { message: string; plugin2: boolean };

  beforeEach(async () => {
    // Setup tests
    const result = await setupTests({
      helloWorld1: { message: "Hello, world!" },
      helloWorld2: { message: "Hello, world!" },
    });
    output1 = result.outputs.helloWorld1.output;
    output2 = result.outputs.helloWorld2.output;
    teardownTests = result.teardownTests;
  });

  afterEach(async () => {
    // Teardown tests
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the plugins being configured", () => {
      // Some other testing
      assertEquals(output1, { plugin1: true, message: "Hello, world!" });
      assertEquals(output2, { plugin2: true, message: "Hello, world!" });
    });
  });
});
