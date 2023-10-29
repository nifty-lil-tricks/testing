// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  assertNever,
  type Plugin,
  type PluginInstance,
} from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
import {
  DynamicModule,
  ForwardReference,
  INestApplication,
  Type,
} from "npm:@nestjs/common@^10.2.7";
import { ExpressAdapter } from "npm:@nestjs/platform-express@^10.2.7";
import {
  OverrideByFactoryOptions,
  Test,
  TestingModule,
  TestingModuleBuilder,
} from "npm:@nestjs/testing@^10.2.7";

class PluginFactory {
  public create(): NestJsPlugin {
    return {
      setup: this.#setup.bind(this),
    };
  }

  async #setup(
    config: PluginConfig,
  ): Promise<PluginInstance<PluginResult>> {
    let baseModule = Test.createTestingModule({
      imports: [config.appModule],
    });

    // Overrides
    baseModule = this.#shouldOverrideModules(config, baseModule);
    baseModule = this.#shouldOverrideProviders(config, baseModule);

    // Create application and listen on an available port
    const module = await baseModule.compile();
    const app = module.createNestApplication(new ExpressAdapter(), {
      logger: false,
      forceCloseConnections: true,
    });
    await app.listen(0);
    return {
      teardown: () => app.close(),
      output: { app, origin: await app.getUrl(), module },
    };
  }

  #shouldOverrideProviders(
    config: PluginConfig,
    baseModule: TestingModuleBuilder,
  ): TestingModuleBuilder {
    if (config.providers) {
      for (const override of config.providers) {
        const overrideProvider = baseModule.overrideProvider(
          override.typeOrToken,
        );
        const { type } = override;
        switch (type) {
          case ProviderOverrideType.VALUE: {
            baseModule = overrideProvider.useValue(override.useValue);
            break;
          }
          case ProviderOverrideType.CLASS: {
            baseModule = overrideProvider.useClass(override.useClass);
            break;
          }
          case ProviderOverrideType.FACTORY: {
            baseModule = overrideProvider.useFactory(override.useFactory);
            break;
          }
          default: {
            assertNever(type, `Unknown override type: ${type}`);
          }
        }
      }
    }
    return baseModule;
  }

  #shouldOverrideModules(
    config: PluginConfig,
    baseModule: TestingModuleBuilder,
  ): TestingModuleBuilder {
    if (config.modules) {
      for (const { moduleToOverride, newModule } of config.modules) {
        baseModule = baseModule.overrideModule(
          moduleToOverride,
        ).useModule(newModule);
      }
    }
    return baseModule;
  }
}

/**
 * The NestJS Plugin.
 *
 * **Basic server setup:**
 * @example
 * ```ts
 * import {
 *   setupTestsFactory,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
 * import {
 *   nestJsPlugin,
 *   type PluginConfig,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
 * import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";
 *
 * // In another file, load plugins as follows to generate a setupTests function:
 * const { setupTests } = setupTestsFactory({ server: nestJsPlugin });
 *
 * // In another file, define a NestJS app as follows:
 *
 * // Uncomment
 * //@Controller()
 * export class BasicAppController {
 *   // Uncomment
 *   //@Get("/hello")
 *   getHello(): string {
 *     return "Hello, world!";
 *   }
 * }
 *
 * // Uncomment
 * //@Module({
 * //  imports: [],
 * //  controllers: [BasicAppController],
 * //})
 * export class BasicAppModule {}
 *
 * // Setup NestJS app for testing
 * const { teardownTests, outputs } = await setupTests({
 *   server: {
 *     appModule: BasicAppModule,
 *   } as PluginConfig,
 * });
 * const { origin } = outputs.server.output;
 *
 * // Test NestJS app and do work
 * const response = await fetch(new URL("/hello", origin));
 *
 * // Teardown tests to restore environment after tests have run
 * await teardownTests();
 * ```
 *
 * **Basic server setup with overrides:**
 * @example
 * ```ts
 * import {
 *   setupTestsFactory,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
 * import {
 *   nestJsPlugin,
 *   type PluginConfig,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
 * import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";
 *
 * // In another file, load plugins as follows to generate a setupTests function:
 * const { setupTests } = setupTestsFactory({ server: nestJsPlugin });
 *
 * // In another file, define a NestJS app as follows:
 *
 * // Uncomment
 * //@Controller()
 * export class BasicAppController {
 *   // Uncomment
 *   //@Get("/hello")
 *   getHello(): string {
 *     return "Hello, world!";
 *   }
 * }
 *
 * // Uncomment
 * //@Module({
 * //  imports: [],
 * //  controllers: [BasicAppController],
 * //})
 * export class BasicAppModule {}
 *
 * // Uncomment // In another file, define a NestJS app overrides for testing as follows:
 * //@Controller()
 * class NewAppController {
 *   // Uncomment
 *   //@Get("/hello")
 *   getHello(): string {
 *     return "Ahoy!";
 *   }
 * }
 *
 * // Uncomment
 * //@Module({
 * //  controllers: [NewAppController],
 * //})
 * class NewModule {}
 *
 * // Setup NestJS app for testing
 * const { teardownTests, outputs } = await setupTests({
 *   server: {
 *     appModule: BasicAppModule,
 *     modules: [{
 *        moduleToOverride: BasicAppModule,
 *        newModule: NewModule,
 *      }],
 *   } as PluginConfig,
 * });
 * const { origin } = outputs.server.output;
 *
 * // Test NestJS app and do work
 * const response = await fetch(new URL("/hello", origin));
 *
 * // Teardown tests to restore environment after tests have run
 * await teardownTests();
 * ```
 */
export const nestJsPlugin = new PluginFactory().create();

/**
 * The NestJS Plugin.
 *
 * **Basic server setup:**
 * @example
 * ```ts
 * import {
 *   setupTestsFactory,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
 * import {
 *   nestJsPlugin,
 *   type PluginConfig,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
 * import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";
 *
 * // In another file, load plugins as follows to generate a setupTests function:
 * const { setupTests } = setupTestsFactory({ server: nestJsPlugin });
 *
 * // In another file, define a NestJS app as follows:
 *
 * // Uncomment
 * //@Controller()
 * export class BasicAppController {
 *   // Uncomment
 *   //@Get("/hello")
 *   getHello(): string {
 *     return "Hello, world!";
 *   }
 * }
 *
 * // Uncomment
 * //@Module({
 * //  imports: [],
 * //  controllers: [BasicAppController],
 * //})
 * export class BasicAppModule {}
 *
 * // Setup NestJS app for testing
 * const { teardownTests, outputs } = await setupTests({
 *   server: {
 *     appModule: BasicAppModule,
 *   } as PluginConfig,
 * });
 * const { origin } = outputs.server.output;
 *
 * // Test NestJS app and do work
 * const response = await fetch(new URL("/hello", origin));
 *
 * // Teardown tests to restore environment after tests have run
 * await teardownTests();
 * ```
 *
 * **Basic server setup with overrides:**
 * @example
 * ```ts
 * import {
 *   setupTestsFactory,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/mod.ts";
 * import {
 *   nestJsPlugin,
 *   type PluginConfig,
 * } from "https://deno.land/x/nifty_lil_tricks_testing/plugin_nestjs/mod.ts";
 * import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";
 *
 * // In another file, load plugins as follows to generate a setupTests function:
 * const { setupTests } = setupTestsFactory({ server: nestJsPlugin });
 *
 * // In another file, define a NestJS app as follows:
 *
 * // Uncomment
 * //@Controller()
 * export class BasicAppController {
 *   // Uncomment
 *   //@Get("/hello")
 *   getHello(): string {
 *     return "Hello, world!";
 *   }
 * }
 *
 * // Uncomment
 * //@Module({
 * //  imports: [],
 * //  controllers: [BasicAppController],
 * //})
 * export class BasicAppModule {}
 *
 * // Uncomment // In another file, define a NestJS app overrides for testing as follows:
 * //@Controller()
 * class NewAppController {
 *   // Uncomment
 *   //@Get("/hello")
 *   getHello(): string {
 *     return "Ahoy!";
 *   }
 * }
 *
 * // Uncomment
 * //@Module({
 * //  controllers: [NewAppController],
 * //})
 * class NewModule {}
 *
 * // Setup NestJS app for testing
 * const { teardownTests, outputs } = await setupTests({
 *   server: {
 *     appModule: BasicAppModule,
 *     modules: [{
 *        moduleToOverride: BasicAppModule,
 *        newModule: NewModule,
 *      }],
 *   } as PluginConfig,
 * });
 * const { origin } = outputs.server.output;
 *
 * // Test NestJS app and do work
 * const response = await fetch(new URL("/hello", origin));
 *
 * // Teardown tests to restore environment after tests have run
 * await teardownTests();
 * ```
 */
export interface PluginConfig {
  /**
   * The application module to start.
   */
  appModule: ClassType;

  /**
   * The application providers to override. If not provided, no providers will be overridden.
   */
  providers?: ProviderOverride[];
  /**
   * The application modules to override. If not provided, no modules will be overridden.
   */
  modules?: ModuleOverride[];
}

/**
 * The Module Override options.
 */
export interface ModuleOverride {
  /**
   * The module definition to override.
   */
  moduleToOverride: ModuleDefinition;
  /**
   * The new module definition to use instead.
   */
  newModule: ModuleDefinition;
}

/**
 * The Module Definition.
 */
export type ModuleDefinition =
  | ForwardReference
  | Type<unknown>
  | DynamicModule
  | Promise<DynamicModule>;

/**
 * The Provider Override options.
 */
export type ProviderOverride =
  | ProviderOverrideValue
  | ProviderOverrideFactory
  | ProviderOverrideClass;

/**
 * The Provider Override type.
 */
export const ProviderOverrideType = {
  /**
   * The provider override type by value.
   */
  VALUE: "VALUE",
  /**
   * The provider override type by factory.
   */
  FACTORY: "FACTORY",
  /**
   * The provider override type by class.
   */
  CLASS: "CLASS",
} as const;
export type ProviderOverrideType =
  typeof ProviderOverrideType[keyof typeof ProviderOverrideType];

/**
 * The Provider Override by value options.
 */
export interface ProviderOverrideValue {
  /**
   * The provider override type.
   */
  type: typeof ProviderOverrideType["VALUE"];
  /**
   * The provider type or token that is used to identify which provider to override.
   */
  typeOrToken: unknown;
  /**
   * The value to use instead of the provider.
   */
  useValue: unknown;
}

/**
 * The Provider Override by factory options.
 */
export interface ProviderOverrideFactory {
  /**
   * The provider override type.
   */
  type: typeof ProviderOverrideType["FACTORY"];
  /**
   * The provider type or token that is used to identify which provider to override.
   */
  typeOrToken: unknown;
  /**
   * The factory to use instead of the provider.
   */
  useFactory: OverrideByFactoryOptions;
}

/**
 * The Provider Override by class options.
 */
export interface ProviderOverrideClass {
  /**
   * The provider override type.
   */
  type: typeof ProviderOverrideType["CLASS"];
  /**
   * The provider type or token that is used to identify which provider to override.
   */
  typeOrToken: unknown;
  /**
   * The class to use instead of the provider.
   */
  useClass: ClassType;
}

/**
 * The class type contract.
 */
export type ClassType<T = unknown> = new (...args: unknown[]) => T;

/**
 * The NestJS Plugin Result.
 */
export interface PluginResult {
  /**
   * The running NestJS application.
   */
  app: INestApplication;
  /**
   * The origin of the created application.
   */
  origin: string;
  /**
   * The compiled module.
   */
  module: TestingModule;
}

/**
 * The NestJS Plugin.
 */
export type NestJsPlugin = Plugin<
  PluginConfig,
  PluginResult
>;
