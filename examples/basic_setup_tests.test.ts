// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.192.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/mod.ts";

// Define or import a plugin as follows:
const helloWorldPlugin = {
  setup: (config: { message: string }) => {
    // Setup plugin according to config
    return config.message;
  },
  teardown: () => {
    // Teardown any setup resources
  },
};

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  helloWorld: helloWorldPlugin,
});

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let message: string;

  beforeEach(async () => {
    // Setup tests
    const result = await setupTests({
      helloWorld: { message: "Hello, world!" },
    });
    message = result.data.helloWorld;
    teardownTests = result.teardownTests;
  });

  afterEach(async () => {
    // Teardown tests
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the plugin being configured", () => {
      // Some other testing
      assertEquals(message, "Hello, world!");
    });
  });
});
