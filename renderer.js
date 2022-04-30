/*
 * @Author: samy
 * @email: yessz#foxmail.com
 * @time: 2022-04-07 10:15:23
 * @modAuthor: samy
 * @modTime: 2022-04-27 01:00:21
 * @desc: 渲染相关封装
 * Copyright © 2015~2022 BDP FE
 */

'use strict'
const yup = require('yup')
let chromium;
let puppeteer;

// // vercel兼容方案处理
// // if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
// // running on the Vercel platform.
// puppeteer = require('puppeteer-core');
chromium = require('chrome-aws-lambda');
// // } else {
puppeteer = require('puppeteer');// running locally.
// // }

const defaultTime = 1000 * 60 * 10 //6min

const pageSchema = yup.object({
  timeout: yup.number().default(30 * 1000),
  waitUntil: yup.string().default('networkidle2'),
  credentials: yup.string(),
  headers: yup.string(),
  emulateMediaType: yup.string(),
})

const pdfSchema = yup.object({
  path: yup.string(),
  scale: yup.number().default(1.0),
  displayHeaderFooter: yup.boolean(),
  headerTemplate: yup.string(),
  footerTemplate: yup.string(),
  printBackground: yup.boolean(),
  landscape: yup.boolean(),
  pageRanges: yup.string(),
  format: yup.string(),
  width: yup.string(),
  height: yup.string(),
  margin: yup.object({
    top: yup.string(),
    right: yup.string(),
    bottom: yup.string(),
    left: yup.string(),
  }),
  preferCSSPageSize: yup.boolean(),
})

class Renderer {
  constructor(browser) {
    this.browser = browser
  }

  async html(url, options = {}) {
    let page = null
    try {
      const { timeout, waitUntil, credentials, headers } = options
      page = await this.createPage(url, { timeout, waitUntil, credentials, headers })
      const html = await page.content()
      return html
    } finally {
      this.closePage(page)
    }
  }

  async pdf(url, options = {}) {
    let page = null
    try {
      const { timeout, waitUntil, credentials, headers, emulateMediaType, ...extraOptions } = options
      page = await this.createPage(url, {
        timeout,
        waitUntil,
        credentials,
        headers,
        emulateMediaType: emulateMediaType || 'print',
      })
      const pdfOptions = await pdfSchema.validate(extraOptions)
      console.info("----begin---page.pdf-----", new Date(), url);
      return await page.pdf({ ...pdfOptions, timeout: defaultTime })
    } catch (error) {
      console.error('---pdf---', error);
      throw new Error(error)
    } finally {
      this.closePage(page)
    }
  }

  async createPage(url, options = {}) {
    try {
      const { timeout, waitUntil, credentials, emulateMediaType, headers, waitForFunction } = await pageSchema.validate(options)
      const page = await this.browser.newPage()
      if (headers) {
        await page.setExtraHTTPHeaders(JSON.parse(headers))
      }
      await page.setCacheEnabled(false)
      await page.setDefaultNavigationTimeout(0); //这个配置跟下面的goto中的设置冲突；
      // await page.setDefaultTimeout(defaultTime);
      page.on('error', async error => {
        await this.closePage(page)
        throw new Error(error)
      })
      if (emulateMediaType) {
        await page.emulateMediaType(emulateMediaType)
      }
      if (credentials) {
        await page.authenticate(credentials)
      }
      console.log("-----begin--page.goto-----", new Date(), url);
      // await page.goto(url, { timeout: timeout || defaultTime, waitUntil })
      await page.goto(url, { waitUntil })
      const renderdoneHandle = await page.waitForFunction('window.renderReportFlag', { polling: 120, timeout: defaultTime })
      const renderdone = await renderdoneHandle.jsonValue();
      if (renderdone) {
        console.info('页面请求接口加载成功!', new Date(), url)
      } else {
        console.info('页面请求加载中...')
      }
      return page
    } catch (error) {
      console.error('---createPage---', error);
      throw new Error(error)
    }
  }

  async closePage(page) {
    try {
      if (page && !page.isClosed()) {
        await page.close()
      }
    } catch (e) { }
  }

  async close() {
    await this.browser.close()
  }
}

async function create(options = {}) {
  // const browser = await puppeteer.launch(Object.assign({
  const browser = await chromium.puppeteer.launch(Object.assign({
    args: [
      '--disable-gpu',
      '--full-memory-crash-report',
      '--unlimited-storage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
    ],
  }, {
    ...options,
    // args: chromium.args,
    // headless: chromium.headless,
    // executablePath: await chromium.executablePath,
  }))
  // const browser = await chromium.puppeteer.launch({
  //   args: chromium.args,
  //   executablePath: await chromium.executablePath,
  //   headless: chromium.headless,
  //   ignoreHTTPSErrors: true,
  // });
  return new Renderer(browser)
}

module.exports = create
