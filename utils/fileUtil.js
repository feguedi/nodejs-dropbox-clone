/**
 * fileUtil
 *
 * # run
 * nodemon --exec babel-node --stage 1 -- utils/fileUtil.js
 */
const fs = require('fs')
const path = require('path')
const Promise = require('songbird')
const _ = require('lodash')
const logger = require('./logger')

/**
 * readdirRecursive("path/to/fileordir").then()
 * - List file & sub-dir recursively, output as array of files w absolute path
 * - e.g. /Users/ycao2/walmart/github/nodejs-dropbox-clone/dropbox
 */
exports.readdirRecursive = async dirName => {
    if (!dirName) { throw new Error('dirname is required') }

    try {
        const files = await fs.readdir(dirName) //shallow readdir of path
        return files.map(async fileName => { //bluebird .map(item) return [], item is resolved value of promise
                fileName = path.join(dirName, fileName) // ensure absolute path
                    // return fs.stat.promise(fileName).then((stat) => {
                    //     return stat.isFile() ? fileName : FileUtil.readdirRecursive(fileName)
                    // })
                const stat = await fs.stat(fileName)
                return stat.isFile() ? fileName : this.readdirRecursive(fileName)
            })
            .reduce((a, b) => {
                return a.concat(b)
            }, []) // flatten array, init value []
    } catch (err) {
        //handle dirName is file case
        return fs.stat.promise(dirName).then((stat) => {
            if (stat.isFile()) { return dirName }
        })
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
