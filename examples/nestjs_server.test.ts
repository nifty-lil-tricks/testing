// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std/testing/bdd.ts";
// TODO: remove specifiers and only have them in the import map.
import {
  setupTestsFactory,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import {
  nestJsPlugin,
  type PluginConfig,
} from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";

// In another file, load plugins as follows to generate a setupTests function:
const { setupTests } = setupTestsFactory({ server: nestJsPlugin });

// In another file, define a NestJS app as follows:

@Controller()
export class BasicAppController {
  @Get("/hello")
  getHello(): string {
    return "Hello, world!";
  }
}

@Module({
  imports: [],
  controllers: [BasicAppController],
})
export class BasicAppModule {}

// Then one can use this in any test file as follows:
describe("Service", () => {
  let teardownTests: SetupTestsTeardown;
  let origin: string;

  beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      server: {
        appModule: BasicAppModule,
      } as PluginConfig,
    });
    teardownTests = result.teardownTests;
    origin = result.outputs.server.output.origin;
  });

  afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  describe("method", () => {
    it("should test something that relies on the nestjs plugin", async () => {
      // Arrange & Act
      const response = await fetch(new URL("/hello", origin));

      // Assert
      assertEquals(response.status, 200);
      assertEquals(await response.text(), "Hello, world!");
    });
  });
});
