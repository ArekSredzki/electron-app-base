'use strict';
/**
 * IO Service
 * This module handles all filesystem operations the app requires
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');

const IOService = exports;

/**
 * Resolves the names of products given a valid project directory.
 *
 * NOTE: This is something that must be changed to match your use case.
 *
 * @param  {String}  directory Absolute path of the target project directory
 * @return {Promise}           Resolved with the names of all products
 */
IOService.getProducts = function(directory) {
  return this._getDirectories(directory, false);
};

/**
 * Private methods
 */

/**
 * Determine the names of all directories in a given directory.
 * @param  {String} directory   Absolute path of the target directory
 * @param  {Boolean} includeDot Whether to include dot folders in the output
 * @return {Promise}            Resolved once the directory names have been
 *                              determined
 *                              Contains an array of directory names
 */
IOService._getDirectories = function(directory, includeDot) {
  return fs.readdir(directory)
    .then(files => {
      let promises = [];

      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        // Skip dot files/folders
        if (includeDot || file[0] !== '.') {
          promises.push(
            fs.stat(path.join(directory, file))
            .then(stat => stat.isDirectory() ? file : null)
          );
        }
      }

      return Promise.all(promises);
    })
    .then(directoryNames => _.compact(directoryNames));
};
