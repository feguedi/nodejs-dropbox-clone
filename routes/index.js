const app = require('express')()
const {
    setDirInfo,
    setFileStat,
    setHeader
} = require('../middlewares')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const archiver = require('archiver')
const Eventbus = require('../utils/eventBus')
const fs = require('fs')
const { promisify } = require('util')
const logger = require('../utils/logger')

const writeFileAsync = promisify(fs.writeFile)
const unlinkAsync = promisify(fs.unlink)
const truncateAsync = promisify(fs.truncate)

const PUT = process.env.PUT
const POST = process.env.POST
const DELETE = process.env.DELETE

/**
 * @GET
 * - Client can make GET requests to get file or directory contents
 curl -v http://127.0.0.1:3000/dropbox -X GET //for get dir list of files
 curl -v http://127.0.0.1:3000/dropbox/package2.json -X GET //for get file
 curl -v -H "Accept:application/x-gtar" http://127.0.0.1:3000/dropbox -X GET //for download archive of dir
 */
app.get('*', [setFileStat, setHeader], (req, res) => {
    if (res.err) {
        return res.status(500).send('Something broke!')
    }

    if (req.stat.isDirectory() && req.header('Accept') === 'application/x-gtar') {
        let zip = archiver('zip')
        zip.on('error', (err) => {
            logger.error(err)
        })
        zip.on('close', () => {
            return res.status(200).send('ok').end()
        })
        zip.pipe(res)
        zip.bulk([{
            expand: true,
            cwd: req.filePath,
            src: ['**']
        }])
        zip.finalize((err) => {
            if (err) {
                logger.error(err)
            }
        })
    }

    if (res.body) {
        logger.debug(res.body)
        return res.json(res.body)
    }
})

/**
 * @HEAD
 * - Client can make HEAD request to get just the GET headers (Content-Header,Content-Length)
 * - curl -v http://127.0.0.1:3000/dropbox --head
 * - curl -v http://127.0.0.1:3000/dropbox/index2.js --head
 */
app.head('*', [setFileStat, setHeader], (req, res) => {
    res.end()
})

/**
 * @PUT
 * - create new directories and files with content
 curl -v http://127.0.0.1:3000/dropbox/foo -X PUT
 curl -v http://127.0.0.1:3000/dropbox/foo/bar.txt -X PUT -d "hello world"
 */
app.put('*', [setFileStat, setDirInfo], async (req, res) => {
    if (req.stat) {
        logger.error('PUT 405: File/folder exists')
        return res.status(405).send('PUT 405: File/folder exists')
    }

    if (req.isPathDir) { //if new folder
        try {
            const str = await mkdirp(req.dirPath)
            logger.info(`PUT: Folder created ${req.dirPath}\n\t[str]: ${str}`)
            res.end()
        } catch (err) {
            logger.error(err)
        }
    } else { //if new File
        //TODO: new file under new folder
        try {
            await writeFileAsync(req.filePath, req.bodyText)
            logger.info(`PUT: File created ${req.filePath} content is ${req.bodyText}`)
            res.end()
        } catch (err) {
            logger.error(err)
        }
    }

    // Notify TCP client: PUT
    Eventbus.emit(PUT, {
        'type': PUT,
        'filePath': req.filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
        'isPathDir': req.isPathDir,
        'bodyText': req.bodyText,
        'timestamp': Date.now()
    })
})

/**
 * @DELETE
 * - DELETE requests to delete files and folders
 curl -v http://127.0.0.1:3000/dropbox/foo/bar.txt -X DELETE
 curl -v http://127.0.0.1:3000/dropbox/foo -X DELETE
 ls dropbox
 */
app.delete('*', setFileStat, async (req, res) => {
    if (!req.stat) { //validate path not exist
        logger.error('DELETE 400: Invalid path')
        return res.status(400).send('DELETE 400: Invalid path')
    }

    if (req.stat.isDirectory()) { //if dir: rimraf
        try {
            await rimraf(req.filePath)
            logger.info(`DELETE: Folder deleted ${req.filePath}`)
            res.end()
        } catch (error) {
            logger.error(error)
        }
    } else { //if file: unlink
        try {
            await unlinkAsync(req.filePath)
            logger.info(`DELETE: File deleted ${req.filePath}`)
            res.end()
        } catch (error) {
            logger.error(error)
        }
    }

    // Notify TCP client: DELETE
    Eventbus.emit(DELETE, {
        'type': DELETE,
        'filePath': req.filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
        'isPathDir': req.stat.isDirectory(),
        'timestamp': Date.now()
    })
})

/**
 * @POST
 * - POST requests to update the contents of a file
 curl -v http://127.0.0.1:3000/dropbox/foo -X POST
 curl -v http://127.0.0.1:3000/dropbox/foo/bar.txt -X POST -d "hello world from POST"
 cat dropbox/foo/bar.txt
 */
app.post('*', [setFileStat, setDirInfo], async (req, res) => {
    //validate if not exist or folder
    if (!req.stat || req.isPathDir) {
        logger.error('POST 405: File doesn\'t exist or it\'s a folder')
        return res.status(405).send('POST 405: File doesn\'t exist or it\'s a folder')
    }

    try {
        await truncateAsync(req.filePath, 0)
        await writeFileAsync(req.filePath, req.bodyText)
        logger.info(`POST: File updated ${req.filePath} content is ${req.bodyText}`)
        res.end()
    } catch (error) {
        logger.error(error)
    }

    // Notify TCP client: POST
    Eventbus.emit(POST, {
        'type': POST,
        'filePath': req.filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
        'isPathDir': req.isPathDir,
        'bodyText': req.bodyText,
        'timestamp': Date.now()
    })
})

module.exports = app
