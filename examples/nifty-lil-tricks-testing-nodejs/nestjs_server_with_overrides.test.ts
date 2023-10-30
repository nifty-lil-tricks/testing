// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Controller, Get, Injectable, Module } from "@nestjs/common";
import {
  setupTestsFactory,
  SetupTestsTeardown,
} from "@nifty-lil-tricks/testing";
import {
  nestJsPlugin,
  PluginConfig,
  ProviderOverrideType,
} from "@nifty-lil-tricks/testing-plugin-nestjs";
import t from "tap";

// In another file, load plugins as follows to generate a setupTests function:
const { setupTests } = setupTestsFactory({ server: nestJsPlugin });

// In another file, define a NestJS app as follows:
@Injectable()
export class BasicAppService {
  getHello(): string {
    return "Hello, world!";
  }
}

@Controller()
export class BasicAppController {
  constructor(private readonly service: BasicAppService) {}

  @Get("/hello")
  getHello(): string {
    return this.service.getHello();
  }
}

@Module({
  imports: [],
  controllers: [BasicAppController],
  providers: [BasicAppService],
})
export class BasicAppModule {}

// In another file, define a NestJS app overrides for testing as follows:
@Injectable()
export class NewAppService {
  getHello(): string {
    return "Ahoy!";
  }
}

// Then one can use this in any test file as follows:
t.test("Service", async (t) => {
  let teardownTests: SetupTestsTeardown;
  let origin: string;

  t.beforeEach(async () => {
    // Setup tests with configured plugins
    const result = await setupTests({
      server: {
        appModule: BasicAppModule,
        providers: [{
          type: ProviderOverrideType.CLASS,
          typeOrToken: BasicAppService,
          useClass: NewAppService,
        }],
      } as PluginConfig,
    });
    teardownTests = result.teardownTests;
    origin = result.outputs.server.output.origin;
  });

  t.afterEach(async () => {
    // Teardown tests to restore environment after tests have run
    await teardownTests();
  });

  t.test("should test something that relies on the nestjs plugin", async (t) => {
    // Arrange & Act
    const response = await fetch(new URL("/hello", origin));

    // Assert
    t.equal(response.status, 200);
    t.equal(await response.text(), "Ahoy!");
  });
});
