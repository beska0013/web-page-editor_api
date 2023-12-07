import { Injectable } from '@nestjs/common';
import { ScraperService } from './modules/scraper/scraper.service';
import { createHash } from 'crypto';
import { decompress } from 'compress-json';

@Injectable()
export class AppService {
  constructor(private scraper: ScraperService) {}

  async scrapWeb(url: string) {
    const response = await this.getTargetPageData(url);
    return !!response ? response : this.createTargetProject(url);
  }

  async getTargetPageData(targetPage: string) {
    const hash = createHash('sha256').update(targetPage).digest('hex');
    const res = await this.scraper.getTargetPageData(hash, targetPage);
    if (!res) return null;
    const decompressedData = decompress(JSON.parse(res.projectData));
    return {
      ...res.toJSON(),
      projectData: decompressedData,
    };
  }

  async createTargetProject(targetPageUrl: string) {
    const hash = createHash('sha256').update(targetPageUrl).digest('hex');
    const targetPage = await this.scraper.getTargetPageData(
      hash,
      targetPageUrl,
    );
    const targetPageExists = !!targetPage;
    return targetPageExists
      ? {
          ...targetPage.toJSON(),
          projectData: decompress(JSON.parse(targetPage.projectData)),
        }
      : this.scraper.create(targetPageUrl);
  }
}
