// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import t from "tap";
import { setupTests } from "@nifty-lil-tricks/testing";

t.test("basic", async (t) => {
  let setup: unknown;

  t.beforeEach(async () => {
    setup = await setupTests({ plugins: [] });
  });

  t.test("some test", async (t) => {
    t.same(setup, {});
  });
});
