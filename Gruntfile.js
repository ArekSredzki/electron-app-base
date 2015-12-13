'use strict';

module.exports = function(grunt) {

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Automatically load required Grunt tasks
  require('jit-grunt')(grunt, {
    useminPrepare: 'grunt-usemin',
    ngtemplates: 'grunt-angular-templates',
    'string-replace': 'grunt-string-replace',
    angularFileLoader: 'grunt-angular-file-loader',
    bower_main: 'grunt-bower-main' // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
  });

  // Configurable paths for the application
  var appConfig = {
    src: 'src',
    app: 'app',
    out: 'app/out',
    dist: 'dist',
    bowerOrigin: 'bower_components',
    bowerDest: 'app/bower_components'
  };

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    directories: appConfig,

    // Make sure there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish'),
        force: true
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= directories.src %>/app/{,*/}*.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/{,*/}*.js']
      }
    },

    // Make sure code styles are up to par
    jscs: {
      options: {
        config: '.jscsrc',
        force: true
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= directories.src %>/{,*/}*.js'
        ]
      },
      test: {
        src: ['test/spec/{,*/}*.js']
      }
    },

    // Empties folders to start fresh
    clean: {
      compile: {
        options: {
          'no-write': false
        },
        files: [{
          dot: true,
          src: [
            '<%= directories.out %>/**/*',
            '<%= directories.bowerDest %>/**/*',
            '!<%= directories.out %>/.git{,*/}*'
          ]
        }]
      },
      html: {
        options: {
          'no-write': false
        },
        files: [{
          src: '<%= directories.out %>/app/**/*.html'
        }]
      },
      postBuild: {
        files: [{
          dot: true,
          cwd: '<%= directories.out %>',
          src: [
            '<%= directories.out %>/**/*.scss',
            '<%= directories.out %>/**/*.jade'
          ]
        }]
      },
      dist: {
        files: [{
          dot: true,
          cwd: '<%= directories.dist %>',
          src: [
            '<%= directories.dist %>/{,*/}*',
          ]
        }]
      },
      windows: {
        files: [{
          dot: true,
          cwd: '<%= directories.out %>',
          src: [
            '<%= directories.dist %>/win32/{,*/}*',
          ]
        }]
      },
      osx: {
        files: [{
          dot: true,
          cwd: '<%= directories.out %>',
          src: [
            '<%= directories.dist %>/osx/{,*/}*',
          ]
        }]
      },
      linux: {
        files: [{
          dot: true,
          cwd: '<%= directories.out %>',
          src: [
            '<%= directories.dist %>/linux/{,*/}*',
          ]
        }]
      }
    },

    // Only copies necessary bower files
    bower_main: { // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
      copy: {
        options: {
          dest: '<%= directories.bowerDest %>'
        }
      }
    },

    // Automatically inject Bower components into the app
    wiredep: {
      app: {
        src: ['<%= directories.src %>/main.jade'],
        ignorePath: '../<%= directories.out %>/'
      },
      sass: {
        src: ['<%= directories.src %>/styles/{,*/}*.{scss,sass}'],
        ignorePath: /(\.\.\/){1,2}bower_components\//
      }
    },

    // Compile jade markup to html
    jade: {
      compile: {
        options: {
          client: false,
          pretty: false
        },
        files: [{
          cwd: '<%= directories.src %>',
          src: '**/*.jade',
          dest: '<%= directories.out %>',
          expand: true,
          ext: '.html'
        }]
      }
    },

    // Compiles Sass to CSS and generates necessary files if requested
    sass: {
      options: {
        includePaths: [
          '<%= directories.src %>/styles/',
          '<%= directories.src %>/images',
          '<%= directories.src %>/app',
          '<%= directories.bowerOrigin %>'
        ]
      },
      dist: {
        files: {
          '<%= directories.out %>/styles/main.css': '<%= directories.src %>/styles/main.scss'
        }
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= directories.src %>/main.html',
      options: {
        dest: '<%= directories.out %>',
        flow: {
          html: {
            steps: {
              js: ['concat', 'uglifyjs'],
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },

    // Performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: ['<%= directories.out %>/**/*.html'],
      css: ['<%= directories.out %>/styles/**/*.css'],
      js: ['<%= directories.out %>/app/**/*.js'],
      options: {
        assetsDirs: [
          '<%= directories.out %>',
          '<%= directories.out %>/images',
          '<%= directories.out %>/styles'
        ],
        patterns: {
          js: [
            [/(images\/[^''""]*\.(png|jpg|jpeg|gif|webp|svg))/g, 'Replacing references to images']
          ]
        }
      }
    },

    ngtemplates: {
      dist: {
        options: {
          module: 'app'
        },
        cwd: '<%= directories.out %>',
        src: 'app/**/*.html',
        dest: '<%= directories.out %>/app/app.templates.js'
      }
    },

    // ng-annotate tries to make the code safe for minification automatically
    // by using the Angular long form for dependency injection.
    ngAnnotate: {
      compile: {
        files: [{
          expand: true,
          cwd: '<%= directories.out %>/app',
          src: '*.js',
          dest: '<%= directories.out %>/app'
        }]
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dev: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= directories.src %>',
          dest: '<%= directories.out %>',
          src: [
            'app/**/*.{js,html}',
            'icons/**/*',
            'images/**/*',
            'lib/**/*',
            'styles/fonts/**/*',
            '*.html',
            'main.js',
            'package.json'
          ]
        }]
      }
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      compile: [
        'sass',
        'jade'
      ]
    },

    angularFileLoader: {
      options: {
        scripts: ['<%= directories.src %>/app/**/*.js'],
        relative: true
      },
      compile: {
        src: '<%= directories.src %>/main.jade'
      }
    },

    'string-replace': {
      debug: {
        files: {
          '<%= directories.out %>/lib/common/constants.js': '<%= directories.out %>/lib/common/constants.js'
        },
        options: {
          replacements: [{
            pattern: '\'<!DEBUG!>\'',
            replacement: 'true'
          }, {
            pattern: '\'<!AUTO_UPDATER!>\'',
            replacement: 'false'
          }]
        }
      },
      release: {
        files: {
          '<%= directories.out %>/lib/common/constants.js': '<%= directories.out %>/lib/common/constants.js'
        },
        options: {
          replacements: [{
            pattern: '\'<!DEBUG!>\'',
            replacement: 'false'
          }, {
            pattern: '\'<!AUTO_UPDATER!>\'',
            replacement: 'true'
          }]
        }
      }
    },

    // Test settings
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          quiet: false, // Optionally suppress output to standard out (defaults to false)
          clearRequireCache: false // Optionally clear the require cache before running tests (defaults to false)
        },
        src: ['test/spec/**/*.js']
      }
    }
  });

  grunt.registerTask('compile', [
    'clean:compile',
    'bower_main',
    'wiredep',
    'angularFileLoader',
    'concurrent:compile',
    'ngtemplates',
    // Remove the html files now that they've compiled into templates
    'clean:html',
    'copy:dev'
  ]);

  grunt.registerTask('test', [
    'clean:compile',
    'copy:dev',
    'mochaTest:test'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'jscs',
    // 'test',
    'compile',
    'string-replace:debug'
  ]);

  grunt.registerTask('release', [
    'jshint',
    'jscs',
    // 'test',
    'compile',
    'string-replace:release'
  ]);
};
