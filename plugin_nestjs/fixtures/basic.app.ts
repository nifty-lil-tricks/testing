// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";

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
