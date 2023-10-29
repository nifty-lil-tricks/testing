// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
  Controller,
  Get,
  Injectable,
  Module,
} from "npm:@nestjs/common@^10.2.7";

@Injectable()
export class NewAppService {
  getHello(): string {
    return "New App Service getHello";
  }
}

@Injectable()
export class AppService {
  getHello(): string {
    return "App Service getHello";
  }
}

@Controller()
export class AppController {
  @Get("/hello")
  getHello(): string {
    return "Hello, world!";
  }
}

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class ModuleWithProviders {}
