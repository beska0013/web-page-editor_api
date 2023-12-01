import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('v1/web-scrapper')
  scrapWeb(@Body() body: { url: string }) {
    return this.appService.scrapWeb(body.url);
  }

  @Get('v1/web-scrapper')
  scrapWeb2(@Query('url') url: string) {
    return this.appService.scrapWeb(url);
  }
}