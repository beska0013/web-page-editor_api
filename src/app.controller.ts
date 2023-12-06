import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('v1/web-scrapper')
  scrapWeb2(@Query('url') url: string) {
    return this.appService.scrapWeb(url);
  }

  // @Post('v1/target-page')
  // createTargetPageData(@Body() body: any, @Query('url') url: string) {
  //   return this.appService.createTargetPageData(body, url);
  // }
}
