import { Injectable } from '@nestjs/common';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';
import { InjectModel } from '@nestjs/sequelize';
import { TargetPageModel } from '../../models/targetPage.model';

import * as grapesjs from 'grapesjs';
import { Component, Editor } from 'grapesjs';
import { createHash } from 'crypto';
import { compress, decompress } from 'compress-json';
import { CreateTargetPageType } from '../../../types/CreateTargetPage.type';

@Injectable()
export class ScraperService {
  private browser: Browser;
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

  getTargetPageData(projectHash: string, projectTarget: string) {
    return this._targetPageData.findOne({
      where: { projectHash, projectTarget },
      attributes: ['projectData', 'projectFonts', 'projectClasses'],
    });
  }

  async create(url: string) {
    const domParser = new DOMParser();

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
    console.time('--TOTAL-- EXECUTION TIME');

    const _URL_PATH = this.hasHttpOrHttpsProtocol(url) ? url : `https://${url}`;

    console.log('call for: ', _URL_PATH);

    console.time('--UTILS-- EXECUTION TIME');

    await page.goto(_URL_PATH, {
      waitUntil: 'domcontentloaded',
    });

    await this.autoScroll(page);

    const htmlContent = await page.content();

    const doc = domParser.parseFromString(htmlContent, 'text/html');

    const [headTag] = doc.getElementsByTagName('head');

    const [body] = doc.getElementsByTagName('body');

    console.time('--CSSContent-- EXECUTION TIME');
    const CSSContent = await this.getStyles(headTag, body, _URL_PATH);
    console.timeEnd('--CSSContent-- EXECUTION TIME');

    console.time('--bodyContent-- EXECUTION TIME');
    const bodyContent = this.generateBodyContent(body, _URL_PATH);
    console.timeEnd('--bodyContent-- EXECUTION TIME');

    const htmlResult = this.generateParsedHtml(CSSContent, bodyContent);
    //const bodyResult = this.buildElementStructure(bodyContent);

    console.timeEnd('--UTILS-- EXECUTION TIME');

    console.log('--createProjectData-- START');
    console.time('--createProjectData-- EXECUTION TIME');
    const projectData = this.createProjectData(
      htmlResult,
      CSSContent,
      bodyContent,
    );
    console.timeEnd('--createProjectData-- EXECUTION TIME');

    console.timeEnd('--TOTAL-- EXECUTION TIME');

    await page.close();

    // return htmlResult;

    return this.createTargetPageData({
      targetPage: url,
      hash,
      targetData: projectData.projectData,
      projectFonts: projectData.projectFonts,
      projectClasses: projectData.projectClasses,
    });
  }

  private generateParsedHtml(styles: string[], body: string) {
    return `<html lang="en"><head>${styles.join(' ')}</head>${body}</html>`;
  }

  private createProjectData(html: string, styles: string[], body: string) {
    console.time('--grapesjs init-- EXECUTION TIME');
    const editor: Editor = grapesjs['init']({
      components: html,
      storageManager: false,
      undoManager: false,
      avoidInlineStyle: true,
      autorender: false,
      headless: true,
    });

    console.timeEnd('--grapesjs init-- EXECUTION TIME');

    console.time('--getProjectFonts-- EXECUTION TIME');
    const projectFonts = this.getProjectFonts(editor);
    console.timeEnd('--getProjectFonts-- EXECUTION TIME');

    console.time('--getAllProjectClasses-- EXECUTION TIME');
    const projectClasses = this.getAllProjectClasses(
      editor.getComponents().models,
    );
    console.timeEnd('--getAllProjectClasses-- EXECUTION TIME');

    console.time('--loadAssets-- EXECUTION TIME');
    const assets = this.loadAssets(editor);
    console.timeEnd('--loadAssets-- EXECUTION TIME');

    // console.time('--assignIdsToComponents-- EXECUTION TIME');
    // this.assignIdsToComponents(editor.getComponents().models);
    // console.timeEnd('--assignIdsToComponents-- EXECUTION TIME');

    console.time('--compress editor.getProjectData-- EXECUTION TIME');
    const projectData = JSON.stringify(compress({ body, styles, assets }));
    //const projectData = JSON.stringify({ body, styles, assets });
    console.timeEnd('--compress editor.getProjectData-- EXECUTION TIME');

    return {
      projectData,
      projectFonts,
      projectClasses,
    };
  }

  private assignIdsToComponents(components: Component[]) {
    let count = 0;
    const idPrefix = 'intempt-cmp';
    const stack = [...components];

    while (stack.length > 0) {
      const currentComponent = stack.pop();

      if (currentComponent) {
        currentComponent.addAttributes({ id: `${idPrefix}-${count++}` });

        const cmpChildren = currentComponent.components();

        for (let i = 0; i < cmpChildren.length; i++) {
          if (cmpChildren[i]) {
            stack.push(cmpChildren[i]);
          }
        }
      }
    }
  }

  private getProjectFonts(editor: Editor): string[] {
    const _project_fonts: Set<any> = new Set(this._defaultFnNames);
    const fontProperty = 'font-family';

    editor.CssComposer.getAll().forEach((rule: any) => {
      const style = rule.getStyle();
      if (style.hasOwnProperty(fontProperty)) {
        const font = style[fontProperty].replace(/['"]+/g, '').split(',');
        font.forEach((f: string) => {
          const fontName = f.trim();
          if (
            !this._deprecateFontKeyWords.some((keyword) =>
              fontName.includes(keyword),
            )
          ) {
            _project_fonts.add(fontName);
          }
        });
      }
    });
    return Array.from(_project_fonts);
  }

  private loadAssets(editor: Editor) {
    const components = editor.getComponents().models;
    const stack: Component[] = [...components];
    const srcSet = new Set<string>();

    while (stack.length > 0) {
      const currentComponent = stack.pop() as Component;
      const type = currentComponent.get('type');

      if (type === 'image') {
        const src = currentComponent.get('src');
        //editor.AssetManager.add(src);
        srcSet.add(src);
      } else {
        const children = currentComponent.components();

        if (children.length > 0) {
          stack.push(...children.models);
        }
      }
    }
    return Array.from(srcSet);
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
        }, 200);
      });
    });
  }

  private generateBodyContent(body: HTMLBodyElement, base_url: string) {
    const TEXT_NODE = 3;
    const COMMENT_NODE = 8;
    const ELEMENT_NODE = 1;
    const hostNameReg =
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/im;

    //TODO: remove script tags ---->
    const scriptTagsToRemove = body.querySelectorAll('script');
    scriptTagsToRemove.forEach((script) => (!!script ? script.remove() : null));
    //TODO: remove script tags ----<

    //TODO: remove noscript tags ---->
    const noscriptTagsToRemove = body.querySelectorAll('noscript');
    noscriptTagsToRemove.forEach((noscript) =>
      !!noscript ? noscript.remove() : null,
    );
    //TODO: remove noscript tags ----<

    //TODO: remove style tags ---->
    const styleTagsToRemove = body.querySelectorAll('style');
    styleTagsToRemove.forEach((style) => (!!style ? style.remove() : null));
    //TODO: remove style tags ----<

    //TODO: remove link tags ---->
    const linkTagsToRemove = body.querySelectorAll('link');
    linkTagsToRemove.forEach((linkTag) =>
      !!linkTag ? linkTag.remove() : null,
    );
    //TODO: remove link tags ----<

    //TODO: replace img src with baseUrl if necessary ---->
    const imgTags = body.querySelectorAll('img');
    imgTags.forEach((imgTag) => {
      //TODO: optimize img tags loading
      imgTag.setAttribute('loading', 'lazy');

      const link = imgTag.src;
      const linkChunks = link.split('/').filter((chunk) => !!chunk);
      const potentialHostname = linkChunks.find(
        (l) => l !== 'http:' && l !== 'https:',
      );

      if (!!potentialHostname && !hostNameReg.test(potentialHostname)) {
        const origin = base_url.endsWith('/')
          ? base_url.slice(0, -1)
          : base_url;
        const imgUrl = linkChunks.join('/');

        imgTag.src = `${origin}/${imgUrl}`;
      }
    });
    //TODO: replace img src with baseUrl if necessary ----<

    const stack: {
      element: Element | ChildNode;
      parentId: string;
      index: number;
    }[] = [{ element: body, parentId: '0', index: 0 }];

    while (stack.length > 0) {
      const { element, parentId, index } = stack.pop();
      const selfId = `${parentId}:${index}`;

      if (element.nodeType === COMMENT_NODE) {
        //TODO: remove comments ---->
        element.remove();
        continue;
      } else if (element.nodeType === TEXT_NODE) {
        //TODO: trim text ---->
        element.textContent = element.textContent.trim();
      } else if (element.nodeType === ELEMENT_NODE) {
        //TODO: add custom attribute identifier ---->
        (element as Element).setAttribute('data-intempt-id', selfId);
      }

      const children = Array.from(element.childNodes);

      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        stack.push({ element: child, parentId: selfId, index: i });
      }
    }

    return `${body.outerHTML}`;
  }

  private async getStyles(
    htmlContent: HTMLHeadElement,
    body: HTMLBodyElement,
    base_url: string,
  ): Promise<string[]> {
    const stylesUrls = new Set<string>();
    const stylesTags = [];

    //TODO: remove last slash ---->
    const domainWithoutLastSlash = base_url.endsWith('/')
      ? base_url.slice(0, -1)
      : base_url;
    //TODO: remove last slash ----<

    const headStyleTags = htmlContent.querySelectorAll('style');
    const bodyStyleTags = body.querySelectorAll('style');
    const linkTags = htmlContent.querySelectorAll('link[rel="stylesheet"]');

    for (let i = 0; i < linkTags.length; i++) {
      const link = linkTags[i].getAttribute('href');
      stylesUrls.add(link);
    }

    const stylesUrlsArray = Array.from(stylesUrls);
    console.log('--DOMAIN--', domainWithoutLastSlash);

    const linkTagStyles =
      stylesUrlsArray.length > 0
        ? await Promise.all(
            stylesUrlsArray.map(async (link: string) => {
              const _URL_PATH = this.hasHttpOrHttpsProtocol(link)
                ? link
                : this.parseLink(link, domainWithoutLastSlash);

              console.log('--FETCHING--', _URL_PATH);

              try {
                const response = await fetch(_URL_PATH);
                const css = await response.text();
                return `<style data-css='${_URL_PATH}'>${css}</style>`;
              } catch (error) {
                console.error('--ERROR fetching--:', _URL_PATH, error);
                return '';
              }
            }),
          ).catch((error) => {
            console.log('--ERROR--: ', error);
            return [];
          })
        : [];

    const styles = [...headStyleTags, ...bodyStyleTags];

    for (let i = 0; i < styles.length; i++) {
      const cssText = styles[i].textContent;
      if (!!cssText) {
        stylesTags.push(`<style>${cssText}</style>`);
      }
    }

    return [...linkTagStyles, ...stylesTags];
  }

  private replaceBackgroundUrls(css: string, baseUrl: string) {
    const regex = /background(-image)?\s*:\s*url\((.*?)\)/g;
    const hostNameReg =
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/im;

    return css.replace(regex, (match: string, p1: any, url: any) => {
      url = url.replace(/["']/g, '');
      const urlChunks = url.startsWith('/')
        ? url.split('/').filter((chunk: string) => !!chunk)
        : [];
      const potentialHostname = urlChunks.find(
        (l: string) => l !== 'http:' && l !== 'https:',
      );

      if (!!potentialHostname && !hostNameReg.test(potentialHostname)) {
        const origin = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        console.log(url);
        const link = urlChunks.join('/');
        url = `${origin}/${link}`;
      }
      //
      // // Reconstruct the CSS rule with the possibly modified URL
      return `background${p1 ? '-image' : ''}: url('${url}')`;
    });
  }

  private async createTargetPageData(data: CreateTargetPageType) {
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

  buildElementStructure(element: any) {
    // Object to hold the information about elements
    const elementObj = {
      html: element.outerHTML, // The HTML of the element itself
      children: [], // An array to hold objects for each child
    };
    if (!!element.children) {
      // Iterate over child elements and build their structure
      Array.from(element.children).forEach((child) => {
        elementObj.children.push(this.buildElementStructure(child)); // Recursive call for children
      });
    }

    return elementObj;
  }

  parseLink(link: string, domain: string) {
    const hostNameReg =
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/im;

    const baseURL = new URL(domain);
    const protocol = 'https://';

    const linkChunks = link.split('/').filter((chunk) => !!chunk);
    const [potentialHostname] = linkChunks;

    const parsedLink = linkChunks.join('/');

    const condition =
      hostNameReg.test(potentialHostname) ||
      parsedLink.startsWith(baseURL.hostname);

    return condition
      ? `${protocol}${parsedLink}`
      : `${protocol}${baseURL.hostname}/${parsedLink}`;
  }
}
