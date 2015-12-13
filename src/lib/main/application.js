'use strict';
/**
 * Application
 * This module handles application state, it handles the browser windows.
 */
const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const _ = require('lodash');
const log = require('winston');
const path = require('path');

const CONST = require('../common/constants');
const Database = require('./database');
const IPCService = require('./ipc-service');

let Application = function() {
  // Keep a reference of the window object as it is useful to have on hand, and
  // if you don't, the window will be closed automatically when the JavaScript
  // object is garbage collected.
  this.mainWindow = null;
};

/**
 * Create the browser window & set the IPCService webContents reference
 */
Application.prototype.createWindow = function() {
  if (this.mainWindow !== null) {
    return;
  }

  app.focus();

  this.mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 500,
    useContentSize: true,
    backgroundColor: '#333',
    icon: path.join(__dirname, CONST.APP.MAIN_ICON)
  });

  // Allow IPC Service to resolve it's internal promise once the page has loaded
  IPCService.setWebContents(this.mainWindow.webContents);

  // Load the app's homepage.
  this.mainWindow.loadURL('file://' + __dirname + CONST.APP.MAIN_HTML);

  // Open the DevTools.
  if (CONST.APP.DEBUG) {
    this.mainWindow.webContents.openDevTools({
      detach: true
    });
  }

  // Emitted when the window is closed.
  this.mainWindow.on('closed', () => {
    // Dereference the window object.
    this.mainWindow = null;

    if (Database.isLoaded()) {
      Database.sendRequest({
        type: CONST.IPC.REQUEST.DB.UNLOAD
      })
      .catch(err => {
        log.error(
          CONST.ERROR.DB.UNLOAD.GENERAL,
          _.get(err, 'message')
        );
      });
    }
  });
};

/**
 * Export as a Singleton
 */
module.exports = new Application();
