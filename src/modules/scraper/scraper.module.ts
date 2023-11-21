import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { PuppeteerModule } from 'nest-puppeteer';

@Module({
  imports: [],
  providers: [ScraperService],
  exports:[ScraperService]
})
export class ScraperModule {}
