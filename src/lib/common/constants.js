'use strict';
/**
 * Constants
 * Application-wide constants
 */

module.exports = {
  // Static Application Options
  APP: {
    DEBUG: '<!DEBUG!>',
    AUTO_UPDATER: '<!AUTO_UPDATER!>',
    MAIN_HTML: '/../../main.html',
    MAIN_ICON: 'icons/icon.png',

    UPDATE: {
      CHANNELS: [
        'stable',
        'rc',
        'beta',
        'alpha'
      ],
      // This is the base url used for automatic updates.
      BASE_URL: 'https://MYUPDATESERVER.com/update/'
    },
    EXTERNAL_URLS: {
      // Users are directed to this url for general information about the application.
      APP_HOMEPAGE: 'https://MYUPDATESERVER.com/',
      // Users are directed to this url on platforms where updates cannot be performed automatically.
      RELEASES: 'https://MYUPDATESERVER.com/releases'
    }
  },

  // Database
  DB: {
    NAME: 'project',
    OPTIONS: {},

    FIELDS: {
      IDENTIFIER: 'name',
      DEFAULT: {
        GROUPING_KEY: 'name'
      },
      LOKI: {
        ID: '$loki',
        META: 'meta'
      }
    },

    /**
     * COLLECTION - Resolves to the name of the collection
     *
     * PATH - Resolves to the path
     */
    COLLECTION: {
      // Used in collection names as a separator for directories
      SEPARATOR: '.',

      // Matches a grouping name
      GROUPING_REGEXP: '([a-z0-9-]+)',

      // Example Collection
      EXAMPLE: {
        COLLECTION: 'product.example'
      }
    },

    /**
     * Identifiers for custom reusable compound database computations/queries.
     */
    COMPOUND: {
    },

    /**
     * Identifiers for LokiJS query methods, allowing for remote execution.
     */
    QUERY: {
      GET: 'get',
      BY: 'by',
      FIND: 'find',
      FIND_OBJECT: 'findObject',
      FIND_OBJECTS: 'findObjects',
      FIND_ONE: 'findOne'
    },

    /**
     * Identifiers for LokiJS result set actions, allowing for remotely
     * requested action chains.
     */
    RESULT_SET: {
      FIND: 'find',
      WHERE: 'where',
      SORT: 'sort',
      SIMPLE_SORT: 'simpleSort',
      COMPOUND_SORT: 'compoundSort',
      UPDATE: 'update',
      REMOVE: 'remove',
      LIMIT: 'limit',
      OFFSET: 'offset'
    }
  },

  // IPC Communication
  IPC: {
    REQUEST: {
      // App state messages
      APP: {
        UPDATE: {
          CHANNEL_SELECT: 'app-update-channel-select',
          CHECK: 'app-update-check',
          INSTALL: 'app-update-install',
          STATUS: 'app-update-status'
        }
      },

      // Database state messages
      DB: {
        SELECT: 'database-select',
        UNLOAD: 'database-unload',
        LOAD: 'database-load',
        SAVE: 'database-save',
        STATUS: 'database-status'
      },

      // Database content
      // Queries or mutations
      CONTENT: {
        COMPOUND: 'content-compound',
        QUERY: 'content-query',
        RESULT_SET: 'content-result-set',
        INSERT: 'content-insert',
        UPDATE: 'content-update',
        REMOVE: 'content-remove'
      },
    },

    ALERT: {
      APP: {
        UPDATE_STATUS: 'alert-app-update-status',
        UPDATE_ERROR: 'alert-app-update-error',
      },

      DB: {
        STATUS: 'alert-db-status',
        STATUS_TEXT: 'alert-db-status-text',
        ERROR: 'alert-db-error'
      },

      CONTENT: {
        CHANGE: 'alert-content-change',
        WARNINGS: 'alert-content-warnings'
      }
    },

    // Used for IPC between main, renderer & database processes
    CMD: {
      ALERT: 'DB_ALERT',
      REQUEST: 'DB_REQUEST',
      RESPONSE: 'DB_RESPONSE'
    }
  },

  // AngularJS-specific constants
  NG: {
    EVENT: {
      APP: {
        UPDATE: {
          INTERNAL_CHANGE: 'app-update-status',
          STATUS: 'app-update-status-state',
          ERROR: 'app-update-error'
        }
      },

      DB: {
        STATUS: {
          DATA: 'db-status',
          TEXT: 'db-status-text',
          STATE: 'db-status-state'
        },
        SELECT: {
          SUCCESS: 'db-select-success'
        },
        UNLOAD: {
          SUCCESS: 'db-unload-success'
        },
        LOAD: {
          SUCCESS: 'db-load-success'
        },
        SAVE: {
          SUCCESS: 'db-save-success'
        },
        ERROR: 'db-error'
      },

      CONTENT: {
        INTERNAL_CHANGE: 'content-internal-change',
        CHANGE: 'content-change',
        WARNINGS: 'content-warnings'
      }
    },
    CACHE_SETTINGS: {
      capacity: 10
    }
  },

  // System States
  STATES: {
    UPDATE: {
      IDLE: 'idle',
      CHECKING: 'checking',
      DOWNLOADING: 'downloading',
      AVAILABLE: 'update-available',
      NONE_AVAILABLE: 'no-update-available',
      UNSUPPORTED: 'unsupported',
      ERROR: 'error'
    }
  },

  // Static Error Text
  ERROR: {
    APP: {
      UPDATE: {
        INSTALL: {
          GENERAL: 'Failed to install a downloaded update.',
        },
        CHECK: {
          GENERAL: 'Failed to check for updates.',
        },
        CHANNEL_SELECT: {
          GENERAL: 'Failed to select an update channel.',
        },
        STATUS: {
          GENERAL: 'Failed to get updater status.',
        }
      },
      IPC: {
        SEND: {
          ALERT: 'Failed to send app alert to renderer, IPC Service failed.',
        }
      }
    },
    DB: {
      PROCESS: {
        START: {
          RUNNING: 'Failed to start database process, an instance is already running.'
        },
        STOP: {
          NOT_RUNNING: 'Failed to stop database process, no instance found.'
        },
        SEND: {
          UNINITIALIZED: 'Failed to send request message to database, it has not been initialized.',
          DISCONNECTED: 'Failed to send request message to database, it is not connected.',
          IPC: {
            RENDERER: 'Failed to send database response to renderer, IPC Service failed.',
            DB: 'Failed to send request to database, process invalid failed.'
          }
        }
      },
      PROJECT: {
        SELECT: {
          INVALID: 'Failed to select project directory, the directory is invalid.',
          VERSION: 'Failed to select project directory, the schema version is unsupported.',
          ACTIVE: 'Failed to select project directory, a product is currently open.',
          GENERAL: 'An error occurred while selecting the project directory.'
        }
      },
      UNLOAD: {
        GENERAL: 'An error occurred while unloading the database.'
      },
      LOAD: {
        TITLE: 'Database Failed to Load.',
        CONCURRENT: {
          LOAD: 'Failed to load database, it is currently being loaded.',
          SAVE: 'Failed to load database, it is currently being saved.'
        },
        PRODUCT: {
          INVALID: 'Failed to load database, the requested product is invalid.'
        },
        GENERAL: 'An error occurred while loading the database.',
        MODIFIED: 'The database has been modified, use force to drop changes and continue reloading.'
      },
      SAVE: {
        TITLE: 'Database Failed to Save.',
        CONCURRENT: {
          LOAD: 'Failed to save database, it is currently being loaded.',
          SAVE: 'Failed to save database, it is currently being saved.'
        },
        GENERAL: 'An error occurred while saving the database.',
      },
      STATUS: {
        GENERAL: 'An error occurred while sending the database status.',
      },
      COMPUTE: {
        GENERAL: 'An error occured while computing implicit data parameters.',
        CONCURRENT: {
          COMPUTE: 'Failed to run complete computations on database, they are already running.'
        }
      },
      TITLE: 'Database Raised an Error.'
    },
    CONTENT: {
      COMPOUND: {
        TYPE: {
          INVALID: 'Attempted to perform a compound operation with an invalid compound type.'
        },
        OPTIONS: {
          INVALID: 'Attempted to perform a compound operation with invalid options.'
        },
        TITLE: 'Database Failed to Resolve Compound Operation.',
        GENERAL: 'An error occurred while performing a compound operation on the database.',
      },
      QUERY: {
        COLLECTION: {
          INVALID: 'Attempted to query for documents with an unspecified collection.',
          NONEXISTENT: 'Attempted to query document(s) from a non-existent collection.'
        },
        TYPE: {
          INVALID: 'Attempted to query for documents with an invalid query type.'
        },
        QUERY: {
          INVALID: 'Attempted to query documents without a valid query object.'
        },
        TITLE: 'Database Failed to Resolve Query.',
        GENERAL: 'An error occurred while querying the database.',
      },
      RESULT_SET: {
        COLLECTION: {
          INVALID: 'Attempted to perform result set actions for an unspecified collection.',
          NONEXISTENT: 'Attempted to perform result set actions for a non-existent collection.'
        },
        ACTION: {
          TYPE: {
            INVALID: 'Attempted to perform result set actions with an invalid action type.',
            UNSUPPORTED: 'Attempted to perform result set actions with an action type that is not yet supported.'
          },
          ARGS: {
            INVALID: 'Attempted to perform result set actions with invalid arguments.'
          }
        },
        GENERAL: 'An error occurred while performing result set actions on the database.',
      },
      INSERT: {
        COLLECTION: {
          NONEXISTENT: 'Attempted to insert document(s) into a non-existent collection.'
        },
        DATA: {
          INVALID: 'Attempted to insert invalid data.'
        },
        GENERAL: 'An error occurred while inserting records into the database.',
      },
      UPDATE: {
        COLLECTION: {
          NONEXISTENT: 'Attempted to update document(s) in a non-existent collection.'
        },
        DATA: {
          INVALID: 'Attempted to update invalid data.'
        },
        GENERAL: 'An error occurred while updating records in the database.',
      },
      REMOVE: {
        COLLECTION: {
          NONEXISTENT: 'Attempted to remove document(s) from a non-existent collection.'
        },
        FILTER: {
          INVALID: 'Attempted to remove documents without a valid filter object.'
        },
        GENERAL: 'An error occurred while removing records from the database.',
      }
    },
    IPC: {
      RESOLVE: {
        EARLY: 'Attempted to resolve rendererLoadPromise before it existed.'
      },
      REJECT: {
        EARLY: 'Attempted to reject rendererLoadPromise before it existed.'
      },
      SEND: {
        EARLY: 'Attempted to send an IPC message before the service was initialized.',
        CHANNEL: {
          INVALID: 'Attempted to send an IPC message to an invalid channel.'
        }
      },
      RESPONSE: {
        NONEXISTENT_REQUEST: 'The database sent a response to a non-existent request.'
      },
      NO_WEBCONTENTS: 'Attempted to send an IPC message, but the browser reference was invalid.'
    }
  },
  // Static Warning Text
  WARNING: {
    DB: {
      TITLE: 'Database Raised Warnings.',
      DESCRIPTION: 'Check the warnings pane for more information.',
      SAVE: {
        UNMODIFIED: 'The database has not been modified, no changes to save.'
      }
    }
  },

  // Status Info Text
  INFO: {
    DB: {
      SELECT: {
        SUCCESS: 'Project Directory Selected Successfully.'
      },
      UNLOAD: {
        SUCCESS: 'Database Unloaded Successfully.'
      },
      LOAD: {
        START: 'Loading Database.',
        SUCCESS: 'Database Loaded Successfully.',
        MODIFIED: 'The database has been modified, use force to drop changes and continue reloading.',
        STATUS: {
          START: 'Loading: Initializing.',
          FILE_SYSTEM: 'Loading: Reading file system.',
          DATABASE: 'Loading: Populating database.',
          CLEANUP: 'Loading: Cleaning up.'
        }
      },
      SAVE: {
        START: 'Saving Database.',
        SUCCESS: 'Database Saved Successfully.',
        STATUS: {
          START: 'Saving: Initializing.',
          DATABASE: 'Saving: Dumping database, processing.',
          FILE_SYSTEM: 'Saving: Writing to file system.',
          CLEANUP: 'Saving: Cleaning up.'
        }
      },
      COMPUTE: {
        STATUS: {
          START: 'Compute: Initializing.',
          CLEANUP: 'Compute: Cleaning up.'
        }
      }
    }
  }
};
