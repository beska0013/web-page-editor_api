import { Injectable } from '@nestjs/common';
import { ScraperService } from './modules/scraper/scraper.service';

@Injectable()
export class AppService {

  constructor(private scraper: ScraperService) {
  }
  getHello(): string {
    return 'Hello World!';
  }

  scrapWeb(url: string) {
    return this.scraper.create(url);
  }
}
