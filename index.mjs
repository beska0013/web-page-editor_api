import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

export const handler = async (event, context) => {
    let browser = null;
    let url = event.url;
    console.log(event.url);
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });


        let page = await browser.newPage();
        let html = await create(page, url)
        const response = {
            statusCode: 200,
            body: html,
        };
        await page.close();
        await browser.close();
        return response;
    } catch (error) {
        console.log(error)
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
    const response = {
        statusCode: 500,
    };
    return response;
};

async function create(url, page) {
    console.time('Execution Time'); // Start the timer

    const _URL_PATH = hasHttpOrHttpsProtocol(url) ? url : `https://${url}`;

    console.log('call for: ', _URL_PATH);

    await page.goto(_URL_PATH, { waitUntil: 'domcontentloaded' });

    await autoScroll(page);

    const htmlContent = await page.content();

    const headContent = await getHeadContent(htmlContent);

    const CSSContent = await getStyles(headContent);

    const bodyContent = getBodyContent(htmlContent);

    const result = {
        //htmlContent,
        CSSContent,
        headContent,
        bodyContent,
    };
    console.timeEnd('Execution Time'); // End the timer and log the time
    const html = { htmlContent:`<!DOCTYPE html><html lang="en"><head>${headContent}<style>${CSSContent.join()}</style></head><body>${bodyContent}</body></html>`};

    return html;
}

function hasHttpOrHttpsProtocol(url) {
    return url.startsWith('http://') || url.startsWith('https://');
}


async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
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

async function getStyles(htmlContent) {
    const stylesheetLinks = [];
    const linkTagRegex = /<link[^>]*href=["']([^"']*?\.css[^"']*)["']/gi;

    let match= [];

    while ((match = linkTagRegex.exec(htmlContent)) !== null) {
        console.log('Matched URL:', match[1]);
        stylesheetLinks.push(match[1] || match[2]);
    }
    return stylesheetLinks.length > 0
        ? await Promise.all([
            ...stylesheetLinks.map(async (link) => {
                const _URL_PATH = hasHttpOrHttpsProtocol(link)
                    ? link
                    : `https://${link}`;
                const response = await fetch(_URL_PATH);
                return await response.text();
            }),
        ])
        : [];
}

async function getBodyContent(htmlContent) {
    const bodyTagRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
    const match = bodyTagRegex.exec(htmlContent);
    return match ? match[1].trim() : '';
}

async function getHeadContent(htmlContent) {
    const headTagRegex = /<head[^>]*>([\s\S]*?)<\/head>/i;
    const match = headTagRegex.exec(htmlContent);
    return match ? match[1].trim() : '';
}



