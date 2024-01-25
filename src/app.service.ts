import { Injectable } from '@nestjs/common';
import { ScraperService } from './modules/scraper/scraper.service';
import { createHash } from 'crypto';
import { decompress } from 'compress-json';
import { FacetService } from './modules/facet/facet.service';

@Injectable()
export class AppService {
  constructor(
    private scraper: ScraperService,
    private facetSrv: FacetService,
  ) {}

  async scrapWeb(url: string) {
    const response = await this.getTargetPageData(url);

    return !!response ? response : this.createTargetProject(url);
  }

  async createTargetProject(targetPageUrl: string) {
    const hash = createHash('sha256').update(targetPageUrl).digest('hex');
    console.log('createTargetProject', targetPageUrl);
    console.log('createTargetProject', hash);

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

  private async getTargetPageData(targetPage: string) {
    const hash = createHash('sha256').update(targetPage).digest('hex');

    console.log('getTargetPageData', targetPage);
    console.log('getTargetPageData', hash);

    const res = await this.scraper.getTargetPageData(hash, targetPage);
    if (!res) return null;
    const decompressedData = decompress(JSON.parse(res.projectData));
    return {
      ...res.toJSON(),
      projectData: decompressedData,
    };
  }

  createFacet(data: any) {
    return this.facetSrv.createFacet(data);
  }

  getFacet(id: string) {
    return this.facetSrv.getFacet(id);
  }
}
