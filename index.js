var wd = require('selenium-webdriver');
var urlModule = require('url');
var urlparse = urlModule.parse;
var urlformat = urlModule.format;
var chrome = require('selenium-webdriver/chrome');
var edge = require('selenium-webdriver/edge');
var firefox = require('selenium-webdriver/firefox');
var ie = require('selenium-webdriver/ie');
var safari = require('selenium-webdriver/safari');
var until = wd.until;

const ignoreArgs = ['base', 'gridUrl', 'suppressWarning', 'x-ua-compatible',
  'heartbeatInterval', 'delayLaunch', 'windowGeometry', 'startFunction'];
// default preferences shamelessly taken from karma-firefox-launcher
const defaultFirefoxPrefs = {
  'browser.shell.checkDefaultBrowser': false,
  'browser.bookmarks.restore_default_bookmarks': false,
  'dom.disable_open_during_load': false,
  'dom.max_script_run_time': 0,
  'extensions.autoDisableScopes': 0,
  'browser.tabs.remote.autostart': false,
  'browser.tabs.remote.autostart.2': false,
  'extensions.enabledScopes': 15,
};
// default chrome args shamelessly taken from karma-chrome-launcher
const defaultChromeArgs = [
  '--no-default-browser-check',
  '--no-first-run',
  '--disable-default-apps',
  '--disable-popup-blocking',
  '--disable-translate',
  '--disable-background-timer-throttling',
  // on macOS, disable-background-timer-throttling is not enough
  // and we need disable-renderer-backgrounding too
  // see https://github.com/karma-runner/karma-chrome-launcher/issues/123
  '--disable-renderer-backgrounding',
  '--disable-device-discovery-notifications',
];
const defaultIeOptions = {
  browserAttachTimeout: 30000,
};

var SeleniumGridInstance = function (name, baseBrowserDecorator, args, logger) {
  if (!args.browserName) {
    throw new Error('browserName is required!');
  }

  var log = logger.create('SeleniumGrid');

  var gridUrl = args.gridUrl || 'http://localhost:4444/wd/hub';
  var self = this;

  // Intialize capabilities with default values
  const capabilities = new wd.Capabilities({
    platform: 'ANY',
    testName: 'Karma test',
    version: ''
  });

  if (args.browserName === 'internet explorer') {
    if (!args.suppressWarning) {
      log.warn('Internet Explorer requires some specific configuration to work properly. ' +
        'Follow the instructions on https://github.com/SeleniumHQ/selenium/wiki/InternetExplorerDriver#required-configuration ' +
        'and then add `suppressWarning` to the launcher config.');
    }
    // workaround until IE options are properly implemented in selenium-webdriver
    capabilities.set('se:ieOptions', defaultIeOptions);
  }

  const options = {};
  options[wd.Browser.CHROME] = new chrome.Options();
  options[wd.Browser.EDGE] = new edge.Options();
  options[wd.Browser.FIREFOX] = new firefox.Options();
  options[wd.Browser.IE] = new ie.Options();
  options[wd.Browser.SAFARI] = new safari.Options();

  Object.keys(defaultFirefoxPrefs).forEach((pref) => {
    options[wd.Browser.FIREFOX].setPreference(pref, defaultFirefoxPrefs[pref]);
  });
  options[wd.Browser.CHROME].addArguments(defaultChromeArgs);

  Object.keys(args).forEach(function (key) {
    if (ignoreArgs.indexOf(key) !== -1) {
      // used strictly for karma
      return;
    }

    if (key === 'firefoxPreferences') {
      Object.keys(args.firefoxPreferences).forEach((pref) => {
        options[wd.Browser.FIREFOX].setPreference(pref,
          args.firefoxPreferences[pref]);
      });
      return;
    }

    if ((key === 'arguments' || key === 'extensions' || key === 'options') &&
        (!options[args.browserName])) {
      throw new Error(key + ' not supported when using non-standard browser ' +
        args.browserName + '; you must use the equivalent capability');
    }

    if (key === 'arguments') {
      if (args[key].constructor !== Array) {
        throw new Error('arguments must be an Array for ' + args.browserName);
      }
      if (!options[args.browserName].addArguments) {
        throw new Error('arguments not supported for ' + args.browserName);
      }
      options[args.browserName].addArguments(args[key]);
      return;
    }

    if (key === 'extensions') {
      if (args[key].constructor !== Array) {
        throw new Error('extensions must be an Array for ' + args.browserName);
      }
      if (!options[args.browserName].addExtensions) {
        throw new Error('extensions not supported for ' + args.browserName);
      }
      options[args.browserName].addArguments(args[key]);
      return;
    }

    if (key === 'options') {
      if (!typeof args[key] === 'object') {
        throw new Error('options must be an object for ' + args.browserName);
      }
      Object.keys(args[key]).forEach((option) => {
        if (!options[args.browserName][option]) {
          throw new Error('option ' + option + ' not supported for ' + args.browserName);
        }
        options[args.browserName][option](args[key][option]);
      });
      return;
    }

    capabilities.set(key, args[key]);

  });

  baseBrowserDecorator(this);

  self.name = name;

  const heartbeatFunction = () => {
    log.debug('hearbeat for ' + self.name);
    self.browser.getTitle()
      .catch((err) => {
        heartbeatErrors++;
        log.error('Caught error for browser ' + self.name + ' during ' +
          'heartbeat: ' + err);
        if (heartbeatErrors >= 5) {
          log.error('Too many heartbeat errors, attempting to stop ' + self.name);
          args.heartbeatInterval && clearInterval(heartbeat);
          self.browser.quit()
            .then(() => {
              log.info('Killed ' + self.name + '.');
              self._done();
              self._onProcessExit(self.error ? -1 : 0, self.error);
            })
            .catch(() => {
              log.info('Error stopping browser ' + self.name);
              self._done();
              self._onProcessExit(self.error ? -1 : 0, self.error);
            });
        }
      });
  };

  const promptFunction = (elId) => {
    return new Promise((resolve, reject) => {
      var windowRef = self.browser.getWindowHandle();
      self.browser.switchTo().frame(0);
      var query = self.browser.wait(until.elementLocated(wd.By.id(elId)))
        .then(() => {
          log.debug('Trying to focus ' + self.name + ' with an alert...');
          self.browser.switchTo().frame(null);
          self.browser.switchTo().window(windowRef).then(() => {
            self.browser.executeScript("alert('test')").then(() => {
              self.browser.switchTo().alert().then((alert) => {
                alert.dismiss();
                self.browser.switchTo().window(windowRef);
                resolve();
              });
            })
          });
        })
        .catch(() => reject('caught'));
    });
  };

  // This is done by passing the option on the url, in response the Karma server will
  // set the following meta in the page.
  //   <meta http-equiv="X-UA-Compatible" content="[VALUE]"/>
  function handleXUaCompatible(urlObj) {
    if (args['x-ua-compatible']) {
      urlObj.query['x-ua-compatible'] = args['x-ua-compatible'];
    }
  }

  this._start = function (url) {
    var urlObj = urlparse(url, true);

    handleXUaCompatible(urlObj);

    delete urlObj.search; //url.format does not want search attribute
    url = urlformat(urlObj);

    log.debug('Grid URL: ' + gridUrl);
    log.debug('Browser capabilities: ' + JSON.stringify(capabilities));

    let delayTime = 0;
    if (args.delayLaunch) {
      log.debug('Delaying launch of ' + args.browserName + ' for ' + args.delayLaunch + 'ms');
      delayTime = args.delayLaunch;
    }

    setTimeout(() => {
      self.browser = new wd.Builder()
        .setChromeOptions(options[wd.Browser.CHROME])
        .setEdgeOptions(options[wd.Browser.EDGE])
        .setFirefoxOptions(options[wd.Browser.FIREFOX])
        .setIeOptions(options[wd.Browser.IE])
        .setSafariOptions(options[wd.Browser.SAFARI])
        .usingServer(gridUrl)
        .withCapabilities(capabilities)
        .build();

      var heartbeatErrors = 0;
      var heartbeat;

      self.browser
          .get(url)
          .then(() => {
            log.debug(self.name + ' started');
            let promise = Promise.resolve();
            if (args.windowGeometry) {
              promise = promise.then(() => self.browser.manage().window().setRect(args.windowGeometry));
            }
            if (args.promptOn) {
              promise = promise.then(() => promptFunction(args.promptOn));
            }
            if (args.heartbeatInterval) {
              promise = promise.then(() => {
                heartbeat = setInterval(heartbeatFunction, args.heartbeatInterval);
                return Promise.resolve();
              });
            }
            promise = promise.catch(err => log.error(args.browserName + ' caught err ' + err.toString()));
            return promise;
            //if (args.browserName !== 'safari') {
            //}
          })
          .catch((err) => {
            log.error(self.name + ' was unable to start: ' + err);
            self._done('failure');
            self._onProcessExit(self.error ? -1 : 0, self.error);
          });

      self._process = {
        kill: function() {
          heartbeat && clearInterval(heartbeat);
          self.browser.quit()
            .then(() => {
              log.info('Killed ' + self.name + '.');
              self._done();
              self._onProcessExit(self.error ? -1 : 0, self.error);
            })
            .catch(() => {
              log.info('Error stopping browser ' + self.name);
              self._done();
              self._onProcessExit(self.error ? -1 : 0, self.error);
            });
        }
      };
    }, delayTime);
  };

  // We can't really force browser to quit so just avoid warning about SIGKILL
  this._onKillTimeout = function(){};
};

SeleniumGridInstance.prototype = {
  name: 'SeleniumGrid',

  DEFAULT_CMD: {
    linux: undefined,
    darwin: undefined,
    win32: undefined
  },
  ENV_CMD: 'SeleniumGrid_BIN'
};

SeleniumGridInstance.$inject = ['name', 'baseBrowserDecorator', 'args', 'logger'];

// PUBLISH DI MODULE
module.exports = {
  'launcher:SeleniumGrid': ['type', SeleniumGridInstance]
};
