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
const argv = require('yargs').argv

const { debug, info } = require('./utils/logger')

const PUT = process.env.PUT
const POST = process.env.POST
const DELETE = process.env.DELETE
const TCP_PORT = process.env.TCP_PORT

const ROOT_DIR = argv.dir ? argv.dir : path.join(process.cwd(), '/client')

//let TCPclient = new nssocket.NsSocket({ reconnect: true })
const TCPclient = new NsSocket()

// TCP server message listener
// PUT: create
TCPclient.data(['io', PUT], data => {
  debug('PUT', data)

  const filePath = path.resolve(path.join(ROOT_DIR, data.filePath))

  if (data.isPathDir) { //if folder
    mkdirp.promise(filePath).then(() => {
      info(`PUT: Folder created ${filePath}`)
    })
  } else { // file
    try {
      const wf = fs.writeFileSync(filePath, data.bodyText)
      info(`PUT: File created ${filePath} content is ${data.bodyText}\n${wf}`)
    } catch (error) {
      
    }
  }
})

// DELETE: remove
TCPclient.data(['io', DELETE], (data) => {
  debug('DELETE', data)

  let filePath = path.resolve(path.join(ROOT_DIR, data.filePath))

  if (data.isPathDir) { //dir
    rimraf.promise(filePath).then(() => {
      info(`DELETE: Folder deleted ${filePath}`)
    })
  } else { //file
    try {
      const unlink = fs.unlinkSync(filePath)
      info(`DELETE: File deleted ${filePath}`)
    } catch (error) {
      
    }
  }
})

// POST: update
TCPclient.data(['io', POST], (data) => {
  debug('POST', data)

  let filePath = path.resolve(path.join(ROOT_DIR, data.filePath))
  fs.truncate.promise(filePath, 0).then(() => {
    fs.writeFile.promise(filePath, data.bodyText).then(() => {
      info(`POST: File updated ${filePath} content is ${data.bodyText}`)
    })
  })
})

TCPclient.connect(TCP_PORT)
info(`TCPclient connected to TCPserver:${TCP_PORT}`)
info(`Client ROOT_DIR is ${ROOT_DIR}`)

module.exports = TCPclient
