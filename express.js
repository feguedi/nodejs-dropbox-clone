/**
 * express.js
 *
 * # run
 * npm start
 * nodemon --exec babel-node --stage 1 -- express.js --dir=/Users/ycao2/walmart/github/nodejs-dropbox-clone
 * http://localhost:3000/
 */
// ----------------------------------------------------------------------------
// Express Server
// ----------------------------------------------------------------------------
const { argv } = require('yargs')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const mkdirp = require('mkdirp')

const Promise = require('songbird')
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const methodOverride = require('method-override')
const favicon = require('serve-favicon')
const compression = require('compression')

const logger = require('./utils/logger')
const Constant = require('./constant')
require('./tcpServer')

const HOST = process.env.HOST || '127.0.0.1'
const HTTP_PORT = process.env.PORT || '3000'
const DROPBOX_DIR = argv.dir ? argv.dir : path.resolve(process.cwd()) //fallback to current path

// Express setup middleware
let app = express()
app.use(favicon(__dirname + '/public/favicon.ico'))
app.use(express.static('public', { maxage: '24h' })) // static assets, set Etag, maxage
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded w req.body
app.use(methodOverride()) // method override

// Cookie parser should be above session
// cookieParser - Parse Cookie header and populate req.cookies with an object keyed by cookie names
app.use(cookieParser())
app.locals.host = HOST // init global variables

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')) // http request logger middleware
} else {
    app.use(compression()) // gzip response for prod
}

// Express routes
app.use(require('./routes'))

// Start Express server
app.listen(HTTP_PORT)
logger.info(`Express server is running at http://${HOST}:${HTTP_PORT}`)
logger.info(`Folder DIR is ${DROPBOX_DIR}`)

module.exports = app
