import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('v1/web-scrapper')
  scrapWeb2(@Query('url') url: string) {
    return this.appService.scrapWeb(url);
  }

}
