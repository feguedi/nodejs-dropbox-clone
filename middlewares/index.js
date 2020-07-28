const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const fileUtil = require('../utils/fileUtil')
const logger = require('../utils/logger')
const mime = require('mime-types')
const { promisify } = require('util')

const DROPBOX_DIR = process.env.DROPBOX_DIR || path.join(__dirname, '../dropbox')
const statAsync = promisify(fs.stat)

/**
 * setFileStat
 * - set req.stat = fs.stat(req.filePath)
 */
const setFileStat = async (req, res, next) => {
    req.filePath = path.resolve(path.join(DROPBOX_DIR, req.url))
    try {
        const stat = await statAsync(req.filePath)
        req.stat = stat
    } catch (error) {
        logger.error(error)
        req.stat = null
    }
    next()
}

/**
 * setDirInfo
 * - set req.isPathDir, req.dirPath, req.bodyText
 */
const setDirInfo = (req, res, next) => {
    if (req.body) {
        req.bodyText = Object.keys(req.body)[0] || ''
    }
    req.isPathDir = fileUtil.isPathDir(req.filePath)
    req.dirPath = req.isPathDir ? req.filePath : path.dirname(req.filePath)
    next()
}

/**
 * setHeader
 * - set header related common info
 * - dependent on req.stat & req.filePath from setFileStat
 * - if dir: set res.body = list of files
 * - if file: set contentType
 * - set req.stat {} as shared
 * -
 */
const setHeader = (req, res, next) => {
    if (!req.stat) {
        return next()
    }

    if (req.stat.isDirectory()) {
        // if dir && x-gtar
        if (req.header('Accept') === 'application/x-gtar') {
            logger.info('GET: directory zip')

            res.setHeader('Content-Type', 'application/zip')
            res.attachment('archive.zip')
            next()
        } else { // if dir: list file in dir
            const fileList = fileUtil.recursiveDir(req.filePath)
            const filesArr = _.map(fileList, file => {
                try {
                    const filename = file.replace(DROPBOX_DIR, '')  //to relative path
                    logger.debug(`MIDDLEWARE.SetHeader: ${ filename }`)
                    return filename
                } catch (error) {
                    logger.error('El chingado error de file.replace', error)
                }
            })
            res.body = filesArr
            res.setHeader('Content-Length', res.body.length)
            res.setHeader('Content-Type', 'application/json')
            next()
        }
    } else { // if file
        logger.info('GET: file')
        res.setHeader('Content-Length', req.stat.size)
        let contentType = mime.contentType((path.extname(req.filePath)))
        res.setHeader('Content-Type', contentType)
            //res.download(req.filePath) //download file w express helper
        const fileStream = fs.createReadStream(req.filePath)
        fileStream.on('error', (err) => {
            req.error = err
            logger.error(err)
            next()
        })
        fileStream.pipe(res)
        next()
    }
}

module.exports = {
    setFileStat,
    setHeader,
    setDirInfo
}
