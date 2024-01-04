import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('web-scrapper')
  scrapWeb(@Query('url') url: string) {
    return this.appService.scrapWeb(url);
  }



  @Post('web-scrapper')
  createTargetProject(@Body() body: { url: string }) {
    return this.appService.createTargetProject(body.url);
  }

  @Get('facet')
  getFacet(@Query('id') id: string) {
    return this.appService.getFacet(id);
  }

  @Put('facet')
  createFacet(@Body() { body }: any) {
    return this.appService.createFacet(body);
  }
}
