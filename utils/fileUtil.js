/**
 * fileUtil
 *
 * # run
 * nodemon --exec babel-node --stage 1 -- utils/fileUtil.js
 */
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const logger = require('./logger')
const { promisify } = require('util')

const readdirAsync = promisify(fs.readdir)
const statAsync = promisify(fs.stat)

/**
 * readdirRecursive("path/to/fileordir").then()
 * - List file & sub-dir recursively, output as array of files w absolute path
 * - e.g. /Users/ycao2/walmart/github/nodejs-dropbox-clone/dropbox
 */
exports.readdirRecursive = async dirName => {
    if (!dirName) {
        throw new Error('dirname is required')
    }

    try {
        let files = await readdirAsync(dirName) //shallow readdir of path
        console.log(`- files: ${ JSON.stringify(files) }`)
        let arr = files.map(async fileName => { //bluebird .map(item) return [], item is resolved value of promise
            fileName = path.join(dirName, fileName) // ensure absolute path
            // return fs.stat.promise(fileName).then((stat) => {
            //     return stat.isFile() ? fileName : FileUtil.readdirRecursive(fileName)
            // })
            console.log(`\tChecando datos de ${ fileName }`)
            const stat = await statAsync(fileName)
            return stat.isFile() ? fileName : this.readdirRecursive(fileName)
        })
        console.log(`ARR: ${ JSON.stringify(arr) }`)
        arr = await arr.reduce((a, b) => a.concat(b), []) // flatten array, init value []
        return arr
    } catch (err) {
        //handle dirName is file case
        const stat = await statAsync(dirName)
        if (stat.isFile()) {
            return dirName
        }

        return stat
    }
}

/**
 * isPathDir("/user/folder/subfolder/")
 * - detect path is dir based on / or not has extension
 */
exports.isPathDir = filePath => {
    if (!filePath || !_.isString(filePath)) {
        throw new Error('filePath invalid')
    }
    //if last char is / or no ext
    if (_.last(filePath) === path.sep || !path.extname(filePath)) {
        return true
    }
    return false
}

exports.recursiveDir = (dir, arr) => {
    if (!dir) {
        throw new Error('dirname is required')
    }

    console.log('dir:', dir)
    try {
        let files = fs.readdirSync(dir)
        // arr = arr || []
        files = files.map(filename => {
            filename = path.join(dir, filename)

            const stats = fs.statSync(filename)
            return stats.isFile() ? filename : this.recursiveDir(filename, arr)
        })
        // return files

        files = files.reduce((a, b) => a.concat(b), [])
        return files
        // files.forEach(file => {
        //     if (fs.statSync(dir + '/' + file).isDirectory()) {
        //         console.log(`\t${ file } es una carpeta`)
        //         try {
        //             arr = this.recursiveDir(dir + '/' + file, arr)
        //         } catch (err) {
        //             logger.error(err)
        //         }
        //     } else {
        //         console.log(`\t${ file } es un archivo`)
        //         arr.push(fs.statSync(dir + '/' + file))
        //     }
        // })
        // console.log(`Arreglo de archivos: ${ JSON.stringify(arr) }`)
        // return arr
    } catch (error) {
        logger.error(error)
        const stat = fs.statSync(dir)
        if (stat.isFile()) {
            return dir
        }
    }
}

// Test
//FileUtil.readdirRecursive("/Users/ycao2/walmart/github/nodejs-dropbox-clone/dropbox/", true).then((fileList) => {
//  console.log(fileList.join("\n"))
//})
