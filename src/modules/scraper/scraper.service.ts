import { Injectable } from '@nestjs/common';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';
import { InjectModel } from '@nestjs/sequelize';
import { TargetPageModel } from '../../models/targetPage.model';

import * as grapesjs from 'grapesjs';
import { Component, Components, Editor } from 'grapesjs';
import { createHash } from 'crypto';
import { compress, decompress } from 'compress-json';

@Injectable()
export class ScraperService {
  private browser: Browser;
  private _project_fonts: Set<any> = new Set();
  private _project_classes: Set<any> = new Set();
  private _deprecateFontKeyWords = [
    'inherit',
    'serif',
    'monospace',
    'cursive',
    'sans-serif',
    '!important',
  ];
  private _defaultFnNames = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Times',
    'Courier New',
    'Courier',
    'Verdana',
    'Georgia',
    'Comic Sans MS',
    'Trebuchet MS',
    'Arial Black',
    'Impact',
  ];

  constructor(
    @InjectModel(TargetPageModel)
    private _targetPageData: typeof TargetPageModel,
  ) {}

  async create(url: string) {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        executablePath: `/usr/bin/chromium`,
        args: [
          `--disable-gpu`,
          `--disable-setuid-sandbox`,
          `--no-sandbox`,
          `--no-zygote`,
        ],
      });
    }
    const hash = createHash('sha256').update(url).digest('hex');

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

    const htmlResult = `<!DOCTYPE html><html lang="en"><head>${headContent}<style>${CSSContent.join()}</style></head><body>${bodyContent}</body></html>`;

    const projectData = this.createProjectData(htmlResult);

    console.timeEnd('Execution Time');

    await page.close();

    return this.createTargetPageData({
      targetPage: url,
      hash,
      targetData: projectData.projectData,
      projectFonts: projectData.projectFonts,
      projectClasses: projectData.projectClasses,
    });
  }

  private createProjectData(html: string) {
    const editor = grapesjs['init']({
      container: document.createElement('div'), // Dummy element
      components: html,
      height: '1px',
      width: '1px',
      storageManager: false,
      undoManager: false,
      avoidInlineStyle: true,
      plugins: [],
    });

    const projectFonts = this.getProjectFonts(editor);
    const projectClasses = this.getAllProjectClasses(
      editor.getComponents().models,
    );
    const projectAssets = this.loadAssets(editor.getComponents().models);
    projectAssets.forEach((asset: string) => {
      editor.AssetManager.add(asset);
    });

    this.assignIdsToComponents(editor.getComponents().models);

    const projectData = JSON.stringify(compress(editor.getProjectData()));

    // global.window = undefined;
    // global.document = undefined;
    // global.DOMParser = undefined;

    return {
      projectData,
      projectFonts,
      projectClasses,
    };
  }

  private assignIdsToComponents(components: Components) {
    let count = 0;
    const idPrefix = 'cmp';
    const stack = [...components];

    while (stack.length > 0) {
      const currentComponent = stack.pop();
      currentComponent.addAttributes({ id: `${idPrefix}-${count++}` });

      currentComponent.components().each((child) => {
        stack.push(child);
      });
    }
  }

  private getProjectFonts(editor: Editor): string[] {
    editor.CssComposer.getAll().forEach((rule: any) => {
      const style = rule.getStyle();
      if (style.hasOwnProperty('font-family')) {
        const font = style['font-family'].replace(/['"]+/g, '').split(',');
        font.forEach((f: string) => {
          const fontName = f.trim();
          if (
            !this._deprecateFontKeyWords.some((keyword) =>
              fontName.includes(keyword),
            )
          ) {
            this._project_fonts.add(fontName);
          }
        });
      }
    });

    this._defaultFnNames.forEach((font: string) => {
      this._project_fonts.add(font);
    });

    return Array.from(this._project_fonts);
  }

  private loadAssets(components: Component[]) {
    const projectAssets: string[] = [];
    const stack: Component[] = [...components];
    while (stack.length > 0) {
      const currentComponent = stack.pop() as Component;
      const type = currentComponent.get('type');

      if (type === 'image') {
        const src = currentComponent.get('src');
        projectAssets.push(src);
      }

      const children = currentComponent.components();
      if (children.length) {
        stack.push(...children.models);
      }
    }

    // [...projectAssets].forEach((asset: string) => {
    //   this.editor.AssetManager.add(asset);
    // });
    return projectAssets;
  }

  private getAllProjectClasses(components: Component[]): string[] {
    components.forEach((component: Component) => {
      const selectors = component.get('classes');
      if (selectors.length === 0) return;

      selectors.each((selector: any) => {
        this._project_classes.add(selector.get('name'));
      });
      const children = component.components();
      if (children.length) {
        this.getAllProjectClasses(children.models);
      }
    });

    return Array.from(this._project_classes);
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

  async createTargetPageData(data: {
    targetPage: string;
    hash: string;
    targetData: any;
    projectFonts: string[];
    projectClasses: string[];
  }) {
    const res = await this._targetPageData.create({
      projectTarget: data.targetPage,
      projectHash: data.hash,
      projectData: data.targetData,
      projectFonts: data.projectFonts,
      projectClasses: data.projectClasses,
    });
    const decompressedData = decompress(JSON.parse(res.projectData));
    return {
      projectFonts: res.projectFonts,
      projectClasses: res.projectClasses,
      projectData: decompressedData,
    };
  }

  getTargetPageData(projectHash: string, projectTarget: string) {
    return this._targetPageData.findOne({
      where: { projectHash, projectTarget },
      attributes: ['projectData', 'projectFonts', 'projectClasses'],
    });
  }
}
