# Electron App Base
[![GitHub stars](https://img.shields.io/github/stars/ArekSredzki/electron-app-base.svg)](https://github.com/ArekSredzki/electron-app-base/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ArekSredzki/electron-app-base.svg)](https://github.com/ArekSredzki/electron-app-base/network)
> A base project for creating interactive desktop application with [Electron](https://electron.atom.io/).

## Basic Usage:
Add basic usage data for your application here.

## Quick Start
#### Production
The latest release is available here (add a link to your release server here).

If you do not already have a release server, consider using [electron-release-server](https://github.com/ArekSredzki/electron-release-server).

#### Development

Ensure that you have installed Node.js on your development machine.

**Note:** Node.js version `>= 8.x.x` is required.

```shell
npm install
npm start
```

## The Stack
The App Stack includes various tools and frameworks. Below is a list of those items and their intended purpose:
- **AngularJS**: Client Side Web-App Stack
- **Bower**: Managing CSS/JS dependencies (i.e. AngularJS)
- **Sass**: Enhanced Stylesheets (SCSS)
- **Jade**: HTML Templating Engine
- **Wiredep**: Injecting Bower dependencies into the Jade files
- **Karma/Jasmine**: Testing framework for AngularJS + code coverage support
- **Grunt**: Build Automation for compiling Sass + other resources before application is run
- **Electron**: Application wrapper which enables native multi-platform support
- **Node.js**: Running the Electron/Desktop Application
- **Electron Builder**: Used to generate release artifacts (executables and installers) for all target platforms.

## Adding new views
Thanks to the use of Grunt and Wiredep, resources are automatically included from the `main.jade` file. It is recommended that all views be written in the same directory as their controller, as`.jade` files.

## Adding/Managing Bower Resources
In order to add a new resource, simply install + save it using bower. Below is an example using Angular

```shell
bower install --save angular
```

And that's it. Since we are using Grump + Wiredep, all bower dependencies will be included on pages supporting the Wiredep tags.

## Adding/Managing NPM Resources
There are two package.json files for this project. One is found in this folder, the other in ./app

The package.json folder found in this folder contains only those node modules required for development, while all packages used by the app at runtime are in the app folder. This allows for more reliable packaging.

In order to add a new resource, simply install + save it using npm in the appropriate directory.

Below is an example using lodash for a package required at runtime

```shell
cd app
npm install --save lodash
```

Here is another example, this time using karma for testing during development

```shell
npm install --save-dev karma
```

## Using the Desktop Application During Development
To compile the application and run it for development usage, type in the project root directory:

```shell
npm start
```

In order to additionally run the application with the ability to connect a debugger to the main and database processes, run the following:

```shell
npm run debug
```

Note: The main process' debug port is `5858` whereas the database's is `5859`.


## Building the Desktop Application
This project is setup to package Windows/Mac/Linux apps for distribution.

For doing so we use [electron-builder](https://www.npmjs.com/package/electron-builder). See the GitHub page for more information on the tool and it's dependencies.

You will first need to run `npm install` in this directory if you have not already. Afterwards, run the following to build the app for all architectures and distributions:

```shell
npm run build
```

### Multi-Platform Builds
**Important:** Be sure to read the requirements set out by [electron-builder](https://www.electron.build/multi-platform-build).

### Distribution & Release Process
Release builds must be code signed and since all builds can be completed from OS X, it has been established that all release artifacts **must** be generated on the dedicated OS X build server.

Release artifacts will be generated on every commit pushed to the `master` branch. As a result, all changes to `master` must be submitted through a PR.

**Note:** The automatically generated artifacts are **not** auto-published, this must be done by hand.

#### Adding build machines
If a new build machine is to be used, it **must** have the code signing certificate applied to it.
