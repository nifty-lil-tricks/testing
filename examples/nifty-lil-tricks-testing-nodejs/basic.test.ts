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

t.test("basic", async (t) => {
  let teardownTests: SetupTestsTeardown;
  let message: string;

  t.beforeEach(async () => {
    // Setup tests
    const result = await setupTests({
      helloWorld: { message: "Hello, world!" },
    });
    message = result.data.helloWorld;
    teardownTests = result.teardownTests;
  });

  t.afterEach(async () => {
    // Teardown tests
    await teardownTests();
  });

  t.test("some test", async (t) => {
    // Some other testing
    t.same(message, "Hello, world!");
  });
});
