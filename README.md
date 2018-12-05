karma-selenium-grid-launcher
========================

A plugin for Karma that launches browsers on a remote [Selenium Grid].
Forked from [karma-webdriver-launcher].

Uses the [selenium-webdriver NPM module] behind the scenes.

[karma-webdriver-launcher]: https://github.com/karma-runner/karma-webdriver-launcher
[Selenium Grid]: https://www.seleniumhq.org/docs/07_selenium_grid.jsp
[selenium-webdriver NPM module]: https://www.npmjs.com/package/selenium-webdriver

## Usage

```bash
$ npm install --save-dev karma-selenium-grid-launcher
```

In your karma.conf.js file define some custom launchers that inherit from
`SeleniumGrid`, providing the URL of the Selenium Grid as `gridUrl`.

```js
module.exports = function(karma) {

  ...

    config.set({

      ...

      customLaunchers: {
        'ie11': {
          base: 'SeleniumGrid',
          gridUrl: 'http://some-host:4444/wd/hub',
          browserName: 'internet explorer',
          platform: 'windows',
          version: '11',
          'x-ua-compatible': 'IE=EmulateIE7',
          heartbeatInterval: 10000
        }
      },

      browsers: ['ie11'],

      ...

    });


```

Other than the launcher-specific configuration keys described below, all keys
are passed along to the grid as capabilities, giving you the flexibility to
do anything the corresponding Selenium WebDriver supports (see the Selenium
docs for more information).

Note that if you're trying to test on several browsers/platforms and you're
using the default Selenium matcher, you'll probably want to make use of the
undocumented `applicationName` capability, as the only platforms that
Selenium will match are `WINDOWS`, `MAC`, and `LINUX`.

You may also wish to use the [browser constants] exported by selenium-webdriver
to make sure you're using the `browserName` expected by selenium.

[browser constants]: https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Browser.html

## Launcher-Specific Configuration Keys

The following keys provided as part of a `customLauncher` block will *not* be
interpreted as a capability to send to the Grid; instead, they are processed
in some way by the launcher.

### arguments

Array of arguments that should be used when launching the browser binary. Note
that only Chrome, Firefox, and IE accept this key; an error will be throws if
another `browserName` is used.

### base

This is obviously only used by Karma to tell it from which base to extend, but
it's included here to make it clear that `base` will not be passed along as a
capability.

### extensions

Array of extension paths that should be installed on the remote browser. Note
that only Chrome and Firefox accept this key; an error will be throws if
another `browserName` is used.

### firefoxPreferences

Object mapping Firefox preference keys to their desired value. If you wish to
override one of the preferences passed to firefox by default, this will do
the trick.

### gridUrl

The URL of the Selenium Grid to use to launch browsers. If not provided, it
will default to `http://localhost:4444/wd/hub`.

### heartbeatInterval

Interval in ms to send a heartbeat to avoid the session being killed by
timeout. If not provided or set to `0`, no heartbeat will be performed.

### options

Object mapping a method name for the appropriate `Options` object of the
browser to the value with which it should be called. See the
[selenium-webdriver API docs] for more information.

### suppressWarning

A value of `true` will suppress the internet explorer warning; any other value
will cause the warning to be displayed.

### x-ua-compatible

The value to use for an `X-UA-Compatible` `meta` tag. If not provided, Karma
will not add the `meta` tag.

[selenium-webdriver API docs]: https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/

## Examples

For a more detailed example, see [the example file].

[the example file]: https://github.com/squarebracket/karma-selenium-grid-launcher/blob/master/examples/karma.conf.js
