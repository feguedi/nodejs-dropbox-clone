/**
 * tcpServer
 * - Nssocket TCP server: Allow clients to connect and synchronize a directory via TCP sockets
 */
const fs = require('fs')
const nssocket = require('nssocket')
const chokidar = require('chokidar')
const path = require('path')
const util = require('util')

const DELETE = process.env.DELETE
const POST = process.env.POST
const PUT = process.env.PUT
const TCP_PORT = process.env.TCP_PORT

const { debug, info } = require('./utils/logger')
const Eventbus = require('./utils/eventBus')

const readFile = util.promisify(fs.readFile)

const DROPBOX_DIR = path.resolve(process.cwd())

const TCPserver = nssocket.createServer(socket => {
    // setup TCP message events for CRUD
    Eventbus.on(PUT, data => {
        socket.send(['io', PUT], data)
    })

    Eventbus.on(POST, data => {
        socket.send(['io', POST], data)
    })

    Eventbus.on(DELETE, data => {
        socket.send(['io', DELETE], data)
    })

    // File watcher at dropbox folder, ignored dot file
    // touch -d '14 May' test.txt
    const watcher = chokidar.watch(path.resolve(process.cwd(), 'dropbox'), { ignored: /[\/\\]\./ })
    watcher
        .on('add', async filePath => { //add file
            debug('Add file', filePath)

            try {
                const text = await readFile(filePath, 'utf8')
                Eventbus.emit(PUT, {
                    'type': PUT,
                    'filePath': filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
                    'isPathDir': false,
                    'bodyText': text,
                    'timestamp': Date.now()
                })
            } catch (error) {
                
            }
        })
        .on('change', async filePath => { //update file
            debug('Update file', filePath)

            try {
                const text = await readFile(filePath, 'utf8')
                Eventbus.emit(POST, {
                    'type': POST,
                    'filePath': filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
                    'isPathDir': false,
                    'bodyText': text,
                    'timestamp': Date.now()
                })
            } catch (error) {
                
            }
        })
        .on('addDir', (filePath) => { //add dir
            debug('Add dir', filePath)

            Eventbus.emit(PUT, {
                'type': PUT,
                'filePath': filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
                'isPathDir': true,
                'timestamp': Date.now()
            })
        })
        .on('unlink', filePath => { //delete file
            debug('delete file', filePath)

            Eventbus.emit(DELETE, {
                'type': DELETE,
                'filePath': filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
                'isPathDir': false,
                'timestamp': Date.now()
            })
        })
        .on('unlinkDir', filePath => { //delete folder
            debug('delete folder', filePath)

            Eventbus.emit(DELETE, {
                'type': DELETE,
                'filePath': filePath.replace(path.resolve(DROPBOX_DIR, 'dropbox'), ''),
                'isPathDir': true,
                'timestamp': Date.now()
            })
        })
})

TCPserver.listen(TCP_PORT, () => {
    info(`TCPserver is running on :${TCP_PORT}`)
})

module.exports = TCPserver
