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

const CREATING_SESSION = 'CREATING_SESSION';
const CREATED_SESSION = 'CREATED_SESSION';
const WAITING = 'WAITING';
const ignoreArgs = ['base', 'gridUrl', 'suppressWarning', 'x-ua-compatible',
  'heartbeatInterval', 'promptOn', 'delayLaunch', 'windowGeometry'];
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

var SeleniumGridInstance = function (name, args, logger, baseLauncherDecorator,
    captureTimeoutLauncherDecorator, retryLauncherDecorator) {
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

  baseLauncherDecorator(this);
  captureTimeoutLauncherDecorator(this);
  retryLauncherDecorator(this);

  self.name = name;
  self.browser = null;

  var heartbeatErrors = 0;
  var heartbeat;

  const heartbeatFunction = () => {
    log.debug('hearbeat for ' + self.name);
    self.browser.getTitle()
      .catch((err) => {
        heartbeatErrors++;
        log.error('Caught error for browser ' + self.name + ' during ' +
          'heartbeat: ' + err);
        if (err.name !== 'NoSuchSessionError') {
          log.error(err.stack);
        }
        if (heartbeatErrors >= 5) {
          log.error('Too many heartbeat errors, attempting to stop ' + self.name);
          clearInterval(heartbeat);
          this.error = this.error || err;
          this.kill();
        }
      });
  };

  const promptFunction = (elId) => {
    return new Promise((resolve, reject) => {
      log.info('inside prompt function for ' + self.name);
      // sometimes we get stuck inside the prompt function when quitting,
      // so reject after a fixed amount of time just to unblock things
      let bumpTimeout = setTimeout(() => reject('prompt function stuck'), 10000);
      var windowRef;
      self.browser.getWindowHandle().then((ref) => {
        windowRef = ref;
        return self.browser.switchTo().frame(0);
      })
      .then(() => self.browser.wait(until.elementLocated(wd.By.id(elId))))
      .then(() => {
        log.debug('Trying to focus ' + self.name + ' with an alert...');
        return self.browser.switchTo().frame(null);
      })
      .then(() => self.browser.switchTo().window(windowRef))
      .then(() => self.browser.executeScript("alert('test')"))
      .then(() => self.browser.switchTo().alert())
      .then((alert) => alert.dismiss())
      .then(() => self.browser.switchTo().window(windowRef))
      .then(() => {
        resolve();
        clearTimeout(bumpTimeout);
      })
      .catch((err) => {
        log.error('caught in prompt for ' + self.name + ': ' + err);
        clearTimeout(bumpTimeout);
        reject(err);
      });
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

  var loadTimeout = null;
  var started;
  var startPromise;

  this.awaitingKill = () => {
    return this.state === this.STATE_BEING_KILLED ||
      this.state === this.STATE_BEING_FORCE_KILLED;
  };

  this.on('start', (url) => {
    // reset error state and heartbeat errors
    this.error = null;
    heartbeatErrors = 0;
    var urlObj = urlparse(url, true);

    handleXUaCompatible(urlObj);

    delete urlObj.search; //url.format does not want search attribute
    url = urlformat(urlObj);

    log.debug('Grid URL: ' + gridUrl);
    log.debug('Browser capabilities: ' + JSON.stringify(capabilities));

    let delayTime = 0;
    if (args.delayLaunch) {
      log.debug('Delaying launch of ' + args.browserName + ' for ' + args.delayLaunch + 'ms');
      this.state = WAITING;
      delayTime = args.delayLaunch;
    }

    loadTimeout = setTimeout(() => {
      let errorStage;
      log.debug('Launching ' + self.name);
      this.state = CREATING_SESSION;
      startPromise = new Promise((resolve, reject) => {
        self.browser = new wd.Builder()
          .setChromeOptions(options[wd.Browser.CHROME])
          .setEdgeOptions(options[wd.Browser.EDGE])
          .setFirefoxOptions(options[wd.Browser.FIREFOX])
          .setIeOptions(options[wd.Browser.IE])
          .setSafariOptions(options[wd.Browser.SAFARI])
          .usingServer(gridUrl)
          .withCapabilities(capabilities)
          .build()

        self.browser.then(() => {
          log.debug(self.name + ' started');
          resolve();
          started = true;
          this.state = CREATED_SESSION;
          startPromise = startPromise.then(() => {
            log.debug(self.name + ' resolved startPromise; navigating to karma page');
          });
          startPromise = startPromise.then(() => self.browser.get(url))
            .then(() => {
              log.debug(self.name + ' loaded karma; running applicable initialization');
              return Promise.resolve();
            })
            .catch(err => {
              errorStage = 'navigate';
              return Promise.reject(err);
            });
          if (args.windowGeometry) {
            startPromise = startPromise.then(() => {
              log.debug(self.name + ' setting window geometry');
              return self.browser.manage().window().setRect(args.windowGeometry).then(() => {
                log.debug(self.name + ' set window geometry');
                return Promise.resolve();
              });
            });
          }
          if (args.promptOn) {
            startPromise = startPromise.then(() => promptFunction(args.promptOn));
          }
          if (args.heartbeatInterval) {
            // TODO: This should maybe be before the `get` call?
            startPromise = startPromise.then(() => {
              log.debug(self.name + ' setting heartbeat');
              heartbeat = setInterval(heartbeatFunction, args.heartbeatInterval);
              return Promise.resolve();
            });
          }
          startPromise = startPromise.then(() => {
            log.debug(self.name + ' initialized');
            return Promise.resolve();
          });
          startPromise = startPromise.catch((err) => {
            if (errorStage) {
              // re-raise error caught during navigation
              return Promise.reject(err);
            } else {
              errorStage = 'init';
              return Promise.reject(err);
            }
          });
          return startPromise;
        })

        .catch((err) => {
          if (this.awaitingKill()) {
            log.info('ignoring error from ' + self.name + '; browser is shutting down');
            reject(err);
            return Promise.resolve();
          } else {
            started = false;
            let message;
            if (errorStage === 'init') {
              message = self.name + ' encountered error during initialization: ' + err;
            } else if (errorStage === 'navigate') {
              message = self.name + ' encountered error navigating to karma page: ' + err;
            } else {
              message = self.name + ' was unable to create WebDriver session: ' + err;
            }
            log.error(message);
            this.error = err;
            reject(message);
            self._done();
          }
        }); // self.browser.then

      }); // startPromise

    }, delayTime);
  });

  let killInterval;
  let killElapsed = 0;

  this._stopSession = (done, startError) => {
    var self = this;
    let killPromise = Promise.resolve();

    clearInterval(heartbeat);

    if (!started) {
      log.info(self.name + ' not started... Killed ' + self.name);
      done();
      return killPromise;
    }

    if (args.resetBeforeQuit) {
      // load a blank page and wait before quitting. for browsers that don't
      // close the window before quitting. noticed on real iOS 12 devices.
      killPromise = killPromise.then(() => {
        log.debug('Resetting ' + self.name + ' and pausing.');
        return new Promise((resolve, reject) => {
          self.browser.get('about:blank').then(() => setTimeout(() => {
            log.debug('Reset ' + self.name + ' to about:blank');
            resolve();
          }, 10000));
        });
      });
    }

    if (args.closeBeforeQuit) {
      // explicitly call browser.close(), which should be unnecessary according
      // to webdriver. noticed on real iOS 10 devices.
      killPromise = killPromise.then(() => {
        log.debug('Closing browser window for ' + self.name + '.');
        return self.browser.close().then(() => {
          log.debug('Closed browser window for ' + self.name);
          this.state = 'CLOSED';
          return Promise.resolve();
        });
      });
    }

    killPromise = killPromise.then(() => {
      log.debug('Quitting WebDriver for ' + self.name + '.');
      return self.browser.quit()
        .then(() => {
          log.info('Killed ' + self.name + '.');
          done();
          return Promise.resolve();
        });
    });

    killPromise = killPromise.catch((err) => {
      if (err.name !== 'NoSuchSessionError' && err !== startError) {
        // ignore NoSuchSessionErrors when killing
        log.error('Error stopping browser ' + self.name + ': ' + err.toString());
      }
      done();
      return Promise.resolve();
    });

    return killPromise;
  };

  this.on('kill', (done) => {
    var self = this;
    log.info('Trying to kill ' + self.name);
    const end = () => {
      self._done();
      if (done) {
        done();
      }
    };
    const stopSession = (err) => {
      return new Promise((startPromiseResolve, startPromiseReject) => {
        this._stopSession(end, err).then(() => {
          clearInterval(killInterval);
          resolve('shutting down');
          startPromiseResolve('shutting down');
        });
      });
    };

    if (!self.browser) {
        log.info('Browser ' + self.name + ' has not yet launched.');
        loadTimeout && clearTimeout(loadTimeout);
        end();
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      killInterval = setInterval(() => {
        killElapsed += 10;
        if (killElapsed < 600) {
          log.info('Waiting for ' + self.name + ' to quit... (' + killElapsed + 's)');
        } else {
          log.error(self.name + ' took more than 600s to quit. Ending now');
          end();
          resolve('Shutting down');
        }
      }, 10000);
      startPromise = startPromise.then(stopSession, stopSession);
    });
  });

};

// PUBLISH DI MODULE
module.exports = {
  'launcher:SeleniumGrid': ['type', SeleniumGridInstance]
};
