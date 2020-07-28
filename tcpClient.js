/**
 * tcpClient
 * - Nssocket TCP client listener
 * npm run client
 */
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const { NsSocket } = require('nssocket')
const { promisify } = require('util')
const argv = require('yargs').argv
require('dotenv').config({ silent: true })

const { debug, info, error: logerr } = require('./utils/logger')
const unlinkAsync = promisify(fs.unlink)
const truncateAsync = promisify(fs.truncate)
const writeFileAsync = promisify(fs.writeFile)

const PUT = process.env.PUT
const POST = process.env.POST
const DELETE = process.env.DELETE
const TCP_PORT = process.env.TCP_PORT

const ROOT_DIR = argv.dir ? argv.dir : path.join(process.cwd(), '/client')

//let TCPclient = new nssocket.NsSocket({ reconnect: true })
const TCPclient = new NsSocket()

// TCP server message listener
// PUT: create
TCPclient.data(['io', PUT], async data => {
    debug('PUT', data)

    const filePath = path.resolve(path.join(ROOT_DIR, data.filePath))

    if (data.isPathDir) { //if folder
        try {
            await mkdirp(filePath)
            info(`PUT: Folder created ${filePath}`)
        } catch (error) {
            logerr(`PUT: mkdirp ${ error }`)
        }
    } else { // file
        try {
            const wf = await writeFileAsync(filePath, data.bodyText)
            info(`PUT: File created ${filePath} content is ${data.bodyText}\n${wf}`)
        } catch (error) {
            logerr(`PUT: writeFile ${ error }`)
        }
    }
})

// DELETE: remove
TCPclient.data(['io', DELETE], async data => {
    debug('DELETE', data)

    let filePath = path.resolve(path.join(ROOT_DIR, data.filePath))

    if (data.isPathDir) { //dir
        try {
            await rimraf(filePath)
            info(`DELETE: Folder deleted ${filePath}`)
        } catch (error) {
            logerr(`DELETE: rimraf ${ error }`)
        }
    } else { //file
        try {
            await unlinkAsync(filePath)
            info(`DELETE: File deleted ${filePath}`)
        } catch (error) {
            logerr(`DELETE: unlink ${ error }`)
        }
    }
})

// POST: update
TCPclient.data(['io', POST], async data => {
    debug('POST', data)

    let filePath = path.resolve(path.join(ROOT_DIR, data.filePath))
    try {
        await truncateAsync(filePath, 0)
        await writeFileAsync(filePath, data.bodyText)
        info(`POST: File updated ${filePath} content is ${data.bodyText}`)
    } catch (error) {
        logerr(`POST: ${ error }`)
    }
})

TCPclient.connect(TCP_PORT)
info(`TCPclient connected to TCPserver:${TCP_PORT}`)
info(`Client ROOT_DIR is ${ROOT_DIR}`)

module.exports = TCPclient
