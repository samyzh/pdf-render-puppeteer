/*
 * @Author: samy
 * @email: yessz#foxmail.com
 * @time: 2022-04-07 10:15:23
 * @modAuthor: samy
 * @modTime: 2022-04-18 20:07:10
 * @desc: 入口文件
 * Copyright © 2015~2022 BDP FE
 */

'use strict'

const qs = require('qs')
const { URL } = require('url')
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const contentDisposition = require('content-disposition')
const createRenderer = require('./renderer')
// const testData = require('./data/big.json')
const testData = require('./data/test.json')

const isProd = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 8084
const app = express()
let renderer = null

const baseApi = '/pdfServer'
const defaultTime = 1000 * 60 * 10 //6min

app.set('query parser', s => qs.parse(s, { allowDots: true }))
app.disable('x-powered-by')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  req.setTimeout(defaultTime);
  res.setTimeout(defaultTime);
  next();
});

app.use(express.static('public'))

app.get(`${baseApi}/report/viewDetail/:id`, async function (req, res) {
  let { id } = req.params
  if (!isProd) console.log("----viewDetail----id--------", id);
  try {
    // const urlApi = `${autorunServerUrl}/autorunweb/report/viewDetail/${id}`
    // const { status, data } = await axios.get(urlApi)
    // if (status >= 200 && status < 300) {
    //   res.status(200).send(data)
    // } else {
    //   res.status(500).send({ message: 'error info' })
    // }
    res.status(200).send(testData)
  } catch (error) {
    console.error(error.message)
    res.status(500).send({ message: 'error info' })
  }
})

app.get(`${baseApi}/getPdf`, async function (req, res) {
  let { url, type, id, filename, ...options } = req.query
  if (!url) return res.status(400).send('Search with url parameter. For eaxample, ?url=http://yourdomain')
  if (!id) return res.status(400).send('Search with url parameter. For eaxample, ?url=http://yourdomain&id=xxx')
  if (!url.includes('://')) {
    url = `http://${url}`
  }
  if (!isProd) console.log("----getPdf----url, type, id--------", url, type, id);
  try {
    switch (type) {
      case 'pdf':
        const urlObj = new URL(url)
        if (!filename) {
          filename = urlObj.hostname
          if (urlObj.pathname !== '/') {
            filename = urlObj.pathname.split('/').pop()
            if (filename === '') filename = urlObj.pathname.replace(/\//g, '')
            const extDotPosition = filename.lastIndexOf('.')
            if (extDotPosition > 0) filename = filename.substring(0, extDotPosition)
          }
        }
        if (!filename.toLowerCase().endsWith('.pdf')) {
          filename += '.pdf'
        }
        const { contentDispositionType, ...pdfOptions } = options
        if (id) url = `${url}?id=${id}&type=${type}`
        const pdf = await renderer.pdf(url, {
          ...pdfOptions,
          printBackground: true,
          preferCSSPageSize: true,
          '-webkit-print-color-adjust': 'exact',
        })
        console.info("-----generator pdf success!----", new Date(), url);
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Length': pdf.length,
          'Content-Disposition': contentDisposition(filename, {
            type: contentDispositionType || 'attachment',
          }),
        })
          .send(pdf)
        break
      default:
        const html = await renderer.html(url, options)
        res.status(200).send(html)
    }
  } catch (error) {
    console.error('---getPdf---',error);
    res.status(500).send({ status: 500, message: error.message })
    // res.status(500).send({ status: 500, message: 'render pdf error!!!' })
  }
})


// Error page.
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send('Oops, An expected error seems to have occurred.')
})

// Create renderer and start server.
createRenderer({
  ignoreHTTPSErrors: !!process.env.IGNORE_HTTPS_ERRORS,
  defaultViewport: null,
  // headless: false,
  // executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'
})
  .then(createdRenderer => {
    renderer = createdRenderer
    console.info('Initialized renderer.')
    app.listen(port, () => {
      console.info(`Listen port on http://localhost:${port}.`)
      console.info(`Show report case on http://localhost:${port}/pdfServer/`)
    })
  })
  .catch(e => {
    console.error('Fail to initialze renderer.', e)
  })

// Terminate process
process.on('SIGINT', () => {
  process.exit(0)
})
