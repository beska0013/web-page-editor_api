import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('scrap')
  scrapWeb(@Body() body: { url: string }) {
    return this.appService.scrapWeb(body.url);
  }

  @Get('web')
  scrapWeb2(@Query('url') url: string) {
    return this.appService.scrapWeb(url);
  }
}
