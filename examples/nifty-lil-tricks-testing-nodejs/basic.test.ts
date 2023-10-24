// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  setupTestsFactory,
  SetupTestsTeardown,
} from "@nifty-lil-tricks/testing";
import t from "tap";

// Define or import a plugin as follows:
const helloWorldPlugin = {
  setup: (config: { message: string }) => {
    // Setup plugin according to config
    return {
      output: config,
      teardown: () => {},
    };
  },
};

// In another file, load plugins as follows to generate a setupTests function:
export const { setupTests } = setupTestsFactory({
  helloWorld: helloWorldPlugin,
});

t.test("basic", async (t) => {
  let teardownTests: SetupTestsTeardown;
  let message: string;

  t.beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      helloWorld: { message: "Hello, world!" },
    });
    message = result.outputs.helloWorld.output.message;
    teardownTests = result.teardownTests;
  });

  t.afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  t.test("some test", async (t) => {
    // Some other testing
    t.same(message, "Hello, world!");
  });
});
