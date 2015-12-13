(function() {
  'use strict';

  /**
   * A Service which interacts through IPC to control application state.
   */
  let AppService = function(
    $state, PubSub, Notification, CONST, Utils, IPCService
  ) {
    const remote = require('electron').remote;
    const Menu = remote.Menu;

    // App Update State
    this.updateStatus = {
      state: CONST.STATES.UPDATE.UNSUPPORTED,
      platform: null,
      channel: null,
      channelChanged: null,
      currentVersion: null,
      releaseNotes: null,
      updateVersion: null,
      errorMessage: null,
      timestamp: 0
    };

    /**
     * Update the update status object if valid and emit an event if a change
     * occurred.
     * @param {Object} status Status data
     */
    this.setUpdateStatus = status => {
      let desiredKeys = _.keys(this.updateStatus);

      // Filter out extra properties
      status = _.pick(status, desiredKeys);

      // Ensure that all expected fields are present
      if (_.keys(status).length !== desiredKeys.length) {
        throw new Error('Invalid update status object received.');
      }

      // Check if the content has status has changed
      if (!_.isMatch(
          status,
          this.updateStatus
        )) {
        PubSub.publish(CONST.NG.EVENT.APP.UPDATE.STATUS, status);

        if (
          status.state === CONST.STATES.UPDATE.AVAILABLE &&
          status.updateVersion !== this.updateVersion
        ) {
          Notification.success('New Update Available: ' + status.updateVersion);
        }

        this.updateStatus = status;
      }
    };

    /**
     * Status Queries
     */

    /**
     * Retreives the update status and sets the internal knowledge of of it
     * on receipt.
     * @return {Promise} Resolved with the return of the request result
     */
    this.getUpdateStatus = () => {
      return IPCService.sendRequest(
          CONST.IPC.REQUEST.APP.UPDATE.STATUS
        )
        .then(payload => {
          this.setUpdateStatus(payload);
          return this.updateStatus;
        });
    };

    /**
     * Status Modifiers
     */

    /**
     * Selects a new channel and checks for application updates.
     * @param  {String}  channel Name of the target release channel
     * @return {Promise}         Resolved once the channel has been selected and
     *                           an update check has started
     */
    this.selectChannel = channel => {
      return IPCService.sendRequest(
          CONST.IPC.REQUEST.APP.UPDATE.CHANNEL_SELECT,
          channel
        )
        .catch(err => {
          IPCService.notifyOfFailedRequest(
            err,
            CONST.ERROR.APP.UPDATE.CHANNEL_SELECT.GENERAL
          );

          return Promise.reject(err);
        });
    };

    /**
     * Checks for application updates.
     *
     * @return {Promise} Resolved once the update check has started
     */
    this.checkForUpdates = () => {
      return IPCService.sendRequest(CONST.IPC.REQUEST.APP.UPDATE.CHECK)
        .catch(err => {
          IPCService.notifyOfFailedRequest(
            err,
            CONST.ERROR.APP.UPDATE.CHECK.GENERAL
          );

          return Promise.reject(err);
        });
    };

    /**
     * Install the downloaded update.
     *
     * @return {Promise} Resolved once the update installation has started
     */
    this.installUpdate = () => {
      return IPCService.sendRequest(CONST.IPC.REQUEST.APP.UPDATE.INSTALL)
        .catch(err => {
          IPCService.notifyOfFailedRequest(
            err,
            CONST.ERROR.APP.UPDATE.INSTALL.GENERAL
          );

          return Promise.reject(err);
        });
    };

    /**
     * Subscibe to Events
     */
    PubSub.subscribe(
      CONST.NG.EVENT.APP.UPDATE.INTERNAL_CHANGE, (payload) => {
        this.setUpdateStatus(payload);
      }
    );

    /**
     * Request database status.
     */
    this.getUpdateStatus()
      .catch(err => {
        console.log(CONST.ERROR.APP.UPDATE.STATUS.GENERAL, err);
        Notification.error(CONST.ERROR.APP.UPDATE.STATUS.GENERAL);
      });

    /**
     * Create menu items
     */
    this.createMenuItems = () => {
      let template = [{
        label: 'Edit',
        submenu: [{
          label: 'Select Directory',
          click: () => {
            $state.go('workspace.project.directory');
          }
        }, {
          label: 'Select Product',
          click: () => {
            $state.go('workspace.project.product');
          }
        }, {
          label: 'View Product',
          click: () => {
            $state.go('product');
          }
        }]
      }, {
        label: 'View',
        submenu: [{
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: function(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          }
        }, {
          label: 'Toggle Full Screen',
          accelerator: (() => {
            if (process.platform === 'darwin') {
              return 'Ctrl+Command+F';
            } else {
              return 'F11';
            }
          })(),
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          }
        }, {
          label: 'Toggle Developer Tools',
          accelerator: (() => {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I';
            } else {
              return 'Ctrl+Shift+I';
            }
          })(),
          click: function(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        }, ]
      }, {
        label: 'Window',
        role: 'window',
        submenu: [{
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        }, {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }, ]
      }, {
        label: 'Help',
        role: 'help',
        submenu: [{
          label: 'Learn More',
          click: () => {
            require('electron').shell.openExternal(CONST.APP.EXTERNAL_URLS.APP_HOMEPAGE);
          }
        }, ]
      }, ];

      if (process.platform === 'darwin') {
        var name = remote.app.getName();
        template.unshift({
          label: name,
          submenu: [{
            label: 'About ' + name,
            click: () => {
              $state.go('workspace.about');
            }
          }, {
            label: 'Version ' + remote.app.getVersion(),
            enabled: false
          }, {
            type: 'separator'
          }, {
            label: 'Services',
            role: 'services',
            submenu: []
          }, {
            type: 'separator'
          }, {
            label: 'Hide ' + name,
            accelerator: 'Command+H',
            role: 'hide'
          }, {
            label: 'Hide Others',
            accelerator: 'Command+Alt+H',
            role: 'hideothers'
          }, {
            label: 'Show All',
            role: 'unhide'
          }, {
            type: 'separator'
          }, {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
              remote.app.quit();
            }
          }, ]
        });
        // Window menu.
        template[3].submenu.push({
          type: 'separator'
        }, {
          label: 'Bring All to Front',
          role: 'front'
        });
      }

      let menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
    };
    this.createMenuItems();
  };

  angular.module('app.core.services')
    .service('AppService', AppService);
}());
