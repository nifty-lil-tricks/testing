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

// TODO: docstrings
// TODO: examples
// TODO: readme

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
 */
export const nestJsPlugin = new PluginFactory().create();

/**
 * The NestJS Plugin.
 */
export interface PluginConfig {
  /**
   * The application module to start.
   */
  appModule: ClassType;

  /**
   * The application providers to override.
   */
  providers?: ProviderOverride[];
  /**
   * The application modules to override.
   */
  modules?: ModuleOverride[];
}

export interface ModuleOverride {
  moduleToOverride: ModuleDefinition;
  newModule: ModuleDefinition;
}

export type ModuleDefinition =
  | ForwardReference
  | Type<unknown>
  | DynamicModule
  | Promise<DynamicModule>;

export type ProviderOverride =
  | ProviderOverrideValue
  | ProviderOverrideFactory
  | ProviderOverrideClass;

export const ProviderOverrideType = {
  VALUE: "VALUE",
  FACTORY: "FACTORY",
  CLASS: "CLASS",
} as const;
export type ProviderOverrideType =
  typeof ProviderOverrideType[keyof typeof ProviderOverrideType];

export interface ProviderOverrideValue {
  type: typeof ProviderOverrideType["VALUE"];
  typeOrToken: unknown;
  useValue: unknown;
}

export interface ProviderOverrideFactory {
  type: typeof ProviderOverrideType["FACTORY"];
  typeOrToken: unknown;
  useFactory: OverrideByFactoryOptions;
}

export interface ProviderOverrideClass {
  type: typeof ProviderOverrideType["CLASS"];
  typeOrToken: unknown;
  useClass: ClassType;
}

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
