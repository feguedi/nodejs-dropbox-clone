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
        let arr = files.map(async fileName => { //bluebird .map(item) return [], item is resolved value of promise
            fileName = path.join(dirName, fileName) // ensure absolute path
            // return fs.stat.promise(fileName).then((stat) => {
            //     return stat.isFile() ? fileName : FileUtil.readdirRecursive(fileName)
            // })
            const stat = await statAsync(fileName)
            return stat.isFile() ? fileName : this.readdirRecursive(fileName)
        })
        arr = arr.reduce((a, b) => {
            return a.concat(b)
        }, []) // flatten array, init value []
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


// Test
//FileUtil.readdirRecursive("/Users/ycao2/walmart/github/nodejs-dropbox-clone/dropbox/", true).then((fileList) => {
//  console.log(fileList.join("\n"))
//})
