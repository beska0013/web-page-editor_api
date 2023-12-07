import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('v1/web-scrapper')
  scrapWeb(@Query('url') url: string) {
    console.log(url);
    return this.appService.scrapWeb(url);
  }

  @Post('v1/web-scrapper')
  createTargetProject(@Body() body: { url: string }) {
    return this.appService.createTargetProject(body.url);
  }
}
