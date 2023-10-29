// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  setupTestsFactory,
  type SetupTestsFn,
  type SetupTestsTeardown,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
} from "std/testing/asserts.ts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "std/testing/bdd.ts";
import { BasicAppModule } from "./fixtures/basic.app.ts";
import {
  AppService,
  ModuleWithProviders,
  NewAppService,
} from "./fixtures/providers.overrides.ts";
import {
  NestJsPlugin,
  nestJsPlugin,
  PluginConfig,
  ProviderOverride,
  ProviderOverrideType,
} from "./plugin.ts";

describe("nestJsPlugin", () => {
  let teardownTests: SetupTestsTeardown;
  let setupTests: SetupTestsFn<{ server: NestJsPlugin }>;

  beforeAll(() => {
    const result = setupTestsFactory({
      server: nestJsPlugin,
    });
    setupTests = result.setupTests;
  });

  beforeEach(() => {
    teardownTests = (() => {
      // No-op in-case this is not set
    }) as SetupTestsTeardown;
  });

  afterEach(async () => {
    // Teardown each test
    await teardownTests();
  });

  describe("setupTests", () => {
    it("should start an app for making requests", async () => {
      // Arrange & Act
      const result = await setupTests({
        server: { appModule: BasicAppModule } as PluginConfig,
      });
      teardownTests = result.teardownTests;
      const { origin } = result.outputs.server.output;
      const response = await fetch(new URL("/hello", origin));

      // Assert
      assertEquals(response.status, 200);
      assertEquals(await response.text(), "Hello, world!");
    });

    it("should start an app with module overrides", async () => {
      // Arrange
      const expectedMessage = "New app controller message";
      @Controller()
      class NewAppController {
        @Get("/hello")
        getHello(): string {
          return expectedMessage;
        }
      }
      @Module({
        controllers: [NewAppController],
      })
      class NewModule {}

      // Act
      const result = await setupTests({
        server: {
          appModule: BasicAppModule,
          modules: [{
            moduleToOverride: BasicAppModule,
            newModule: NewModule,
          }],
        } as PluginConfig,
      });
      teardownTests = result.teardownTests;
      const { origin } = result.outputs.server.output;
      const response = await fetch(new URL("/hello", origin));

      // Assert
      assertEquals(response.status, 200);
      assertEquals(await response.text(), expectedMessage);
    });

    [
      {
        type: ProviderOverrideType.VALUE,
        useValue: new NewAppService(),
        expectedMessage: "New App Service getHello",
      },
      {
        type: ProviderOverrideType.CLASS,
        useClass: NewAppService,
        expectedMessage: "New App Service getHello",
      },
      {
        type: ProviderOverrideType.FACTORY,
        useFactory: {
          factory: () => new NewAppService(),
        },
        expectedMessage: "New App Service getHello",
      },
    ].forEach(({ expectedMessage, ...override }) => {
      it(`should start an app with provider overrides by ${override.type}`, async () => {
        // Arrange & Act
        const result = await setupTests({
          server: {
            appModule: ModuleWithProviders,
            providers: [{ ...override, typeOrToken: AppService }],
          } as PluginConfig,
        });
        teardownTests = result.teardownTests;
        const { module } = result.outputs.server.output;
        const service = module.get(AppService);
        const message = service.getHello();

        // Assert
        assertInstanceOf(service, NewAppService);
        assertEquals(message, expectedMessage);
      });
    });

    it("should error when an unknown provider overrides is defined", async () => {
      // Arrange, Act & Assert
      await assertRejects(() =>
        setupTests({
          server: {
            appModule: ModuleWithProviders,
            providers: [
              {
                typeOrToken: AppService,
                type: "unknown",
              } as unknown as ProviderOverride,
            ],
          } as PluginConfig,
        }), "Unknown override type: unknown");
    });
  });

  describe("teardownTests", () => {
    it("should fully teardown an app", async () => {
      // Arrange
      const result = await setupTests({
        server: { appModule: BasicAppModule } as PluginConfig,
      });
      const { teardownTests } = result;
      const { origin } = result.outputs.server.output;

      // Act
      await teardownTests();

      // Assert
      await assertRejects(() => fetch(new URL("/hello", origin)), TypeError);
    });
  });
});
