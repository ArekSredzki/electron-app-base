'use strict';

const CONST = require('./lib/common/constants');

if (CONST.APP.AUTO_UPDATER) {
  if (require('electron-squirrel-startup')) {
    return;
  }
}

if (!CONST.APP.DEBUG) {
  process.stderr.write = console.error.bind(console);
  process.stdout.write = console.log.bind(console);
}

const electron = require('electron');
// Module to control application life.
const app = electron.app;

const log = require('./lib/main/log'); // jshint ignore:line
const IPCService = require('./lib/main/ipc-service');
const AutoUpdateManager = require('./lib/main/auto-update-manager');
const Database = require('./lib/main/database');
const UserSettings = require('./lib/main/user-settings');
const Application = require('./lib/main/application');

// Report crashes to our server.
// require('crash-reporter').start();

// ####################################################
// ####################################################

// On OS X the package must be signed to use autoupdater, and this is not
// desired local dev.
if (CONST.APP.AUTO_UPDATER) {
  // Instantly quit the application if updating on windows
  if (AutoUpdateManager.handleStartupEvent()) {
    return app.quit();
  }
}

// Load user settings
UserSettings.load();

// #############################################################################
// #############################################################################

// Electron has finished initialization and is ready to create browser windows.
app.on('ready', function() {

  // Start database process
  Database.initialize();

  // Initialize IPCService to allow it to send/receive signals to/from the
  // renderer.
  IPCService.initialize();

  if (CONST.APP.AUTO_UPDATER) {
    // Set auto update feed
    AutoUpdateManager.setupAutoUpdater();
  }

  Application.createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar to stay active
  // until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the dock icon is
  // clicked and there are no other windows open.
  if (Application.mainWindow === null) {
    Application.createWindow();
  }
});

app.on('will-quit', function() {
  UserSettings.save();
});
