import { Injectable } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';

@Injectable()
export class ScraperService {
  private browser: Browser;
  constructor() { }

  async create(url: string) {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        executablePath: `/usr/bin/chromium`,
        args: [`--disable-gpu`, `--disable-setuid-sandbox`, `--no-sandbox`, `--no-zygote`]
      })
    }

    const page = await this.browser.newPage();
    console.time('Execution Time'); // Start the timer

    const _URL_PATH = this.hasHttpOrHttpsProtocol(url) ? url : `https://${url}`;

    console.log('call for: ', _URL_PATH);

    await page.goto(_URL_PATH, { waitUntil: 'domcontentloaded' });

    await this.autoScroll(page);

    const htmlContent = await page.content();

    const headContent = await this.getHeadContent(htmlContent);

    const CSSContent = await this.getStyles(headContent);

    const bodyContent = this.getBodyContent(htmlContent);

    const result = {
      //htmlContent,
      CSSContent,
      headContent,
      bodyContent,
    };
    console.timeEnd('Execution Time'); // End the timer and log the time
    const html = { htmlContent:`<!DOCTYPE html><html lang="en"><head>${headContent}<style>${CSSContent.join()}</style></head><body>${bodyContent}</body></html>`};
    await page.close();
    return html;
  }

  private hasHttpOrHttpsProtocol(url: string) {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  private async autoScroll(page: any) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 160);
      });
    });
  }

  private async getStyles(htmlContent: string) {
    const stylesheetLinks = [];
    const linkTagRegex = /<link[^>]*href=["']([^"']*?\.css[^"']*)["']/gi;

    let match: string[];

    while ((match = linkTagRegex.exec(htmlContent)) !== null) {
      console.log('Matched URL:', match[1]);
      stylesheetLinks.push(match[1] || match[2]);
    }
    return stylesheetLinks.length > 0
      ? await Promise.all([
          ...stylesheetLinks.map(async (link: any) => {
            const _URL_PATH = this.hasHttpOrHttpsProtocol(link)
              ? link
              : `https://${link}`;
            const response = await fetch(_URL_PATH);
            return await response.text();
          }),
        ])
      : [];
  }

  private getBodyContent(htmlContent: string) {
    const bodyTagRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
    const match = bodyTagRegex.exec(htmlContent);
    return match ? match[1].trim() : '';
  }

  private async getHeadContent(htmlContent: string) {
    const headTagRegex = /<head[^>]*>([\s\S]*?)<\/head>/i;
    const match = headTagRegex.exec(htmlContent);
    return match ? match[1].trim() : '';
  }

  private testFunc() {
    // const linkTagRegex =
    //   /<link\s+[^>]*?rel=["']stylesheet["'][^>]*?href=["'](.*?)["'][^>]*?>/g;
    // const headTagRegex = /<head[^>]*>([\s\S]*?)<\/head>/i;
    // const bodyTagRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
    // const scriptTagRegex =
    //   /<script\s+src=["'](.*?)["'][^>]*?>[^<]*?<\/script>/g;
    //
    // let match: string[];
    // let headContent = '';
    // let bodyContent = '';
    //
    // const stylesheetLinks = [];
    // const scriptLinks = [];
    //
    // match = bodyTagRegex.exec(htmlContent);
    //
    // if (match) {
    //   bodyContent = match[1].trim();
    // }
    //
    // while ((match = linkTagRegex.exec(htmlContent)) !== null) {
    //   stylesheetLinks.push(match[1]);
    // }
    //
    // while ((match = scriptTagRegex.exec(bodyContent)) !== null) {
    //   scriptLinks.push(match[1]);
    // }
    //
    // match = headTagRegex.exec(htmlContent);
    //
    // if (match) {
    //   headContent = match[1].trim();
    // }
    //
    // match = bodyTagRegex.exec(htmlContent);
    // if (match) {
    //   bodyContent = match[1].trim();
    // }
    //
    // const CSSContent = await Promise.all([
    //   ...stylesheetLinks.map(async (link: any) => {
    //     const response = await fetch(link);
    //     return await response.text();
    //   }),
    // ]);
    // const JSContent = await Promise.all(
    //   scriptLinks.map(async (link) => {
    //     try {
    //       const response = await fetch(link);
    //       return await response.text();
    //     } catch (error) {
    //       console.error(`Error fetching JS from ${link}:`, error);
    //       return '';
    //     }
    //   }),
    // );
    //
    // const html = `<!DOCTYPE html><html lang="en"><head><style>${CSSContent.join()}</style>${headContent}</head><body>${bodyContent}<script>${JSContent.join(
    //   '\n',
    // )}</script></body></html>`;
  }
}
