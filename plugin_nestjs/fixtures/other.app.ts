// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { Controller, Get, Module } from "npm:@nestjs/common@^10.2.7";

@Controller()
export class OtherAppController {
  @Get()
  getRoot(): string {
    return "Root!";
  }

  @Get("/status")
  getStatus(): string {
    return "OK!";
  }

  @Get("/hello")
  getHello(): string {
    return "Ahoy!";
  }
}

@Module({
  imports: [],
  controllers: [OtherAppController],
})
export class OtherAppModule {}
