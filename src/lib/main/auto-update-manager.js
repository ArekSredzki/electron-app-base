'use strict';
/**
 * Release Utilities
 * Utility functions specific to release management.
 */
const _ = require('lodash');
const os = require('os');
const path = require('path');
const log = require('winston');
const childProcess = require('child_process');
const EventEmitter = require('events').EventEmitter;
const electron = require('electron');
const app = electron.app;
const autoUpdater = electron.autoUpdater;
const shell = electron.shell;

const CONST = require('../common/constants');
const UserSettings = require('./user-settings');
const IPCService = require('./ipc-service');

const ALERTS = CONST.IPC.ALERT.APP;
const CHANNELS = CONST.APP.UPDATE.CHANNELS;
const STATES = CONST.STATES.UPDATE;

class AutoUpdateManager extends EventEmitter {
  constructor() {
    super();

    this.currentVersion = app.getVersion();
    this.platform = os.platform() + '_' + os.arch();

    // The first channel is the default (usually 'stable')
    // By looking at the current version name, we can set the default channel
    // to the channel of the release they downloaded. If they downloaded an
    // alpha initially, then they will automatically be subscribed to alpha
    // releases in the future.
    this._defaultChannel = _.find(CHANNELS, channel => {
      return this.currentVersion.indexOf(channel) !== -1;
    }) || CHANNELS[0];

    this.channel = null;
    this.channelChanged = false;
    this.releaseNotes = null;
    this.updateVersion = null;
    this.errorMessage = null;
    this.timestamp = 0; // Time of last update check

    if (!CONST.APP.AUTO_UPDATER || process.platform === 'linux') {
      this.state = STATES.UNSUPPORTED;
    } else {
      this.state = STATES.IDLE;
    }
  }

  /**
   * Setup the auto updater feed url and event listeners.
   *
   * Note: this should only be run once per application run. Also, we are unable
   * to change the release channel used during application run.
   */
  setupAutoUpdater() {
    if (this.state === STATES.UNSUPPORTED) {
      return;
    }

    this.getChannel()
      .then(channel => {
        this.channel = channel;

        autoUpdater.on('error', (event, message) => {
          this.setState(STATES.ERROR, message);
          this.sendAlert(ALERTS.UPDATE_ERROR);
          log.error('Error Downloading Update: ' + message);
        });

        let feedUrl = CONST.APP.UPDATE.BASE_URL + this.platform + '/' +
          this.currentVersion + '/' + this.channel;

        log.debug('Using auto updater feed url:', feedUrl);

        autoUpdater.setFeedURL(
          feedUrl
        );

        autoUpdater.on('checking-for-update', () => {
          this.setState(STATES.CHECKING);
          this.sendAlert();
          log.info('Checking for updates.');
        });

        autoUpdater.on('update-not-available', () => {
          this.setState(STATES.NONE_AVAILABLE);
          this.sendAlert();
          log.info('No updates found.');
        });

        autoUpdater.on('update-available', () => {
          this.setState(STATES.DOWNLOADING);
          this.sendAlert();
          this.emit('did-begin-download');
          log.info('Update available and downloading.');
        });

        autoUpdater.on('update-downloaded',
          (event, releaseNotes, updateVersion) => {
            this.releaseNotes = releaseNotes;
            this.updateVersion = updateVersion;
            this.setState(STATES.AVAILABLE);

            if (this.updateVersion !== null) {
              this.sendAlert();
              log.info('Update downloaded.');
            }
          }
        );

        this.scheduleUpdateCheck();
      });
  }

  /**
   * Handle the windows update process.
   * @return {Boolean} Whether the application should exit
   */
  handleStartupEvent() {
    if (process.platform !== 'win32') {
      return false;
    }

    if (process.argv.length === 1) {
      return false;
    }

    const appFolder = path.resolve(process.execPath, '..');
    const rootElectronFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(
      path.join(rootElectronFolder, 'Update.exe')
    );
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
      let spawnedProcess;

      try {
        spawnedProcess = childProcess.spawn(command, args, {
          detached: true
        });
      } catch (error) {}

      return spawnedProcess;
    };

    const spawnUpdate = function(args) {
      return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
      case '--squirrel-install':
      case '--squirrel-updated':
        // Optionally do things such as:
        // - Add your .exe to the PATH
        // - Write to the registry for things like file associations and
        //   explorer context menus

        // Install desktop and start menu shortcuts
        spawnUpdate(['--createShortcut', exeName]);

        setTimeout(app.quit, 1000);
        return true;

      case '--squirrel-uninstall':
        // Undo anything you did in the --squirrel-install and
        // --squirrel-updated handlers

        // Remove desktop and start menu shortcuts
        spawnUpdate(['--removeShortcut', exeName]);

        setTimeout(app.quit, 1000);
        return true;

      case '--squirrel-obsolete':
        // This is called on the outgoing version of your app before
        // we update to the new version - it's the opposite of
        // --squirrel-updated

        app.quit();
        return true;
    }
  }

  /**
   * Sends an alert to the renderer, notifying it of update state.
   * @param  {String}  type    Type of alert
   * @param  {*}       payload Payload of the alert
   * @param  {Boolean} isError Whether the payload is an error object
   */
  sendAlert(type, payload, isError) {
    if (!type) {
      type = ALERTS.UPDATE_STATUS;
    }

    if (!payload) {
      payload = this.getStatus();
    }

    IPCService.sendAlert(type, payload, isError)
      .catch(err => log.error(
        CONST.ERROR.APP.IPC.SEND.ALERT,
        err
      ));
  }

  /**
   * Sets the internal update manager state.
   * @param {String}  state        State identifier
   * @param {String*} errorMessage Message describing the error if applicable.
   */
  setState(state, errorMessage) {
    let oldState = this.state;

    this.errorMessage = errorMessage || null;
    this.timestamp = new Date().getTime();
    this.state = state;

    if (this.state === oldState) {
      return;
    }

    this.emit('state-changed', this.state);
  }

  /**
   * Generate an object which represents the state of the update manager.
   */
  getStatus() {
    return {
      state: this.state,
      platform: this.platform,
      channel: this.channel,
      channelChanged: this.channelChanged,
      currentVersion: this.currentVersion,
      releaseNotes: this.releaseNotes,
      updateVersion: this.updateVersion,
      errorMessage: this.errorMessage,
      timestamp: this.timestamp
    };
  }

  /**
   * Checks as to whether an update is available.
   */
  checkForUpdates() {
    if (this.state === CONST.STATES.UPDATE.UNSUPPORTED) {
      shell.openExternal(CONST.APP.EXTERNAL_URLS.RELEASES);
    } else {
      autoUpdater.checkForUpdates();
    }
  }

  /**
   * Install the downloaded update & restart the app.
   */
  installUpdate() {
    autoUpdater.quitAndInstall();
  }

  /**
   * Schedules an update check that will be run every four hours
   */
  scheduleUpdateCheck() {
    if (!this._checkForUpdatesIntervalID) {
      const fourHours = 1000 * 60 * 60 * 4;

      this._checkForUpdatesIntervalID = setInterval(
        () => this.checkForUpdates(),
        fourHours
      );

      this.checkForUpdates();
    }
  }

  /**
   * Cancels a scheduled update check routine.
   */
  cancelScheduledUpdateCheck() {
    if (this._checkForUpdatesIntervalID) {
      clearInterval(this._checkForUpdatesIntervalID);
      return (this._checkForUpdatesIntervalID = null);
    }
  }

  /**
   * Retreives the selected update channel from persistent user setting store.
   *
   * @return {Promise} Resolves to selected update channel name
   */
  getChannel() {
    return UserSettings.get('channel')
      .catch(() => {
        log.debug('Unable to retrieve saved update channel.');

        UserSettings.set('channel', this._defaultChannel);

        return this._defaultChannel;
      })
      .then(channel => {
        if (!_.isString(channel)) {
          channel = this._defaultChannel;
        }

        return channel;
      });
  }

  /**
   * Sets the selected update channel, which will be used to set the feed url
   * on the next application boot.
   *
   * Note: electron does not support setting the feed url more than once.
   *
   * @param  {String} channel Desired update channel name
   * @throws {Error}          If input channel is not valid
   */
  selectChannel(channel) {
    if (CHANNELS.indexOf(channel) === -1) {
      throw Error('Desired channel is not valid.');
    }

    UserSettings.set('channel', channel);
    this.channel = channel;
    this.channelChanged = true;
    this.sendAlert();
  }
}

module.exports = new AutoUpdateManager();
