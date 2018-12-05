module.exports = function (karma) {


  const gridUrl = 'http://some.remote-host.com:4444/wd/hub';
  const firefoxPreferences = {
    // use OS cert store on windows
    'security.enterprise_roots.enabled': true
  };

  let customLaunchers = {
    'chrome-win7': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: 'chrome',
      applicationName: 'chrome/win7',
      heartbeatInterval: 10000,
      acceptInsecureCerts: true
    },
    'chrome-beta-win7': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: 'chrome',
      applicationName: 'chrome/win7',
      heartbeatInterval: 10000,
      acceptInsecureCerts: true,
      options: {
        setChromeBinaryPath: "C:\\Program Files (x86)\\Google\\Chrome Beta\\Application\\chrome.exe"
      }
    },
    'firefox-win7': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: 'firefox',
      applicationName: 'firefox/win7',
      heartbeatInterval: 10000,
      acceptInsecureCerts: true,
      firefoxPreferences: firefoxPreferences,
      options: {
        setBinary: 'c:\\program files\\mozilla firefox\\firefox.exe'
      },
      arguments: [
        '-headless'
      ]
    },
    'chrome-beta-win81': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: 'chrome',
      applicationName: 'chrome/win81',
      heartbeatInterval: 10000,
      acceptInsecureCerts: true,
      options: {
        setChromeBinaryPath: "C:\\Program Files (x86)\\Google\\Chrome Beta\\Application\\chrome.exe"
      }
    },
    'IE11-win10': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: 'internet explorer',
      applicationName: 'ie11/win10',
      suppressWarning: true,
      heartbeatInterval: 10000,
    },
    'edge-win10': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: 'MicrosoftEdge',
      heartbeatInterval: 10000,
      acceptInsecureCerts: true
    },
    'chrome-mac1011': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: wd.Browser.CHROME,
      applicationName: 'chrome/mac1011',
      heartbeatInterval: 10000,
      acceptInsecureCerts: true,
      someCustomCapability: 'customValue'
    },
    'chrome-beta-mac1011': {
      base: 'SeleniumGrid',
      gridUrl: gridUrl,
      browserName: wd.Browser.CHROME,
      applicationName: 'chrome/mac1011',
      heartbeatInterval: 10000,
      acceptInsecureCerts: true,
      options: {
        setChromeBinaryPath: "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome"
      }
    }
  };

  config.set({
    basePath: './',
    frameworks: ["jasmine"],
    reporters: ['progress'],
    logLevel: karma.LOG_INFO,
    customLaunchers: customLaunchers,
    browsers: ['firefox-win7', 'chrome-beta-win81', 'chrome-mac1011'];
    files: [
      "tests/*.spec.js"
    ],
    singleRun: true
  });
}
