karma-selenium-grid-launcher
========================

A plugin for Karma that launches browsers on a remote [Selenium Grid].
Forked from [karma-webdriver-launcher].

Uses the [selenium-webdriver NPM module] behind the scenes.

[karma-webdriver-launcher]: https://github.com/karma-runner/karma-webdriver-launcher
[Selenium Grid]: https://www.seleniumhq.org/docs/07_selenium_grid.jsp
[selenium-webdriver NPM module]: https://www.npmjs.com/package/selenium-webdriver

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Usage](#usage)
- [Launcher-Specific Configuration Keys](#launcher-specific-configuration-keys)
  - [arguments](#arguments)
  - [base](#base)
  - [closeBeforeQuit](#closebeforequit)
  - [delayLaunch](#delaylaunch)
  - [extensions](#extensions)
  - [firefoxPreferences](#firefoxpreferences)
  - [gridUrl](#gridurl)
  - [heartbeatInterval](#heartbeatinterval)
  - [options](#options)
  - [promptOn (deprecated)](#prompton-deprecated)
  - [resetBeforeQuit](#resetbeforequit)
  - [suppressWarning](#suppresswarning)
  - [windowGeometry](#windowgeometry)
  - [x-ua-compatible](#x-ua-compatible)
- [Killing Tests Prematurely](#killing-tests-prematurely)
- [Browser Quirks and Workarounds](#browser-quirks-and-workarounds)
  - [Video Playback on macOS Safari](#video-playback-on-macos-safari)
  - [iOS 10 Safari](#ios-10-safari)
  - [iOS 12 Safari](#ios-12-safari)
- [Examples](#examples)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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
that only Chrome, Firefox, and IE accept this key; an error will be thrown if
another `browserName` is used.

### base

This is obviously only used by Karma to tell it from which base to extend, but
it's included here to make it clear that `base` will not be passed along as a
capability.

### closeBeforeQuit

Call `driver.close()` before calling `driver.quit()`. Set this to `true` to
work around browsers/devices which don't implicitly close the active window
when testing finishes.

See the [Browser Quirks and Workarounds] section for which browsers/devices
may require this for proper functionality.

### delayLaunch

Time in ms to wait before launching a browser. Use this when a browser must
end up as the foreground window for tests to pass, such as testing video
playback on Safari.

### extensions

Array of extension paths that should be installed on the remote browser. Note
that only Chrome and Firefox accept this key; an error will be thrown if
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

### promptOn (deprecated)

Send and then close a prompt when an element with the given `id` is found in
the document.

This option is deprecated, and is probably not needed in any scenario.

### resetBeforeQuit

Have the browser load `about:blank` before calling `driver.quit()`. Set this
to `true` to work around browsers/devices which don't support closing the
active window when testing finishes.

See the [Browser Quirks and Workarounds] section for which browsers/devices
may require this for proper functionality.

### suppressWarning

A value of `true` will suppress the internet explorer warning; any other value
will cause the warning to be displayed.

### windowGeometry

Object to use for setting the geometry of the window. If any of the keys
`width`, `height`, `x`, or `y` are present in the object, they will be used to
modify just that aspect of the window geometry. Any other keys will be ignored.

### x-ua-compatible

The value to use for an `X-UA-Compatible` `meta` tag. If not provided, Karma
will not add the `meta` tag.

[selenium-webdriver API docs]: https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/
[Browser Quirks and Workarounds]: #browser-quirks-and-workarounds

## Killing Tests Prematurely

If you stop tests prematurely (e.g. by hitting `Ctrl+c`) soon after launching
the tests, it may take some time for the browsers/devices to fully close. To
keep things simple(ish), there are a series of promises during
startup/initialization. When you stop the requests determines where in this
series there will be a call to `driver.quit()`.

If the remote driver has returned a session, then you will have to wait for
the browser/device to load the karma page and perform its initialization
before `driver.quit()` will be called.

If you're using mobile devices, also keep in mind that building/deploying
the controller app and/or starting a simulator can take some time. Since
the driver can only be used after this has finished, you must wait for this
process to complete to ensure proper cleanup.

From the time you stop the tests until a particular browser has closed, the
message `Waiting for ${browser} to quit... (${time}s)` will be output to the
console every 10s.

## Browser Quirks and Workarounds

This is a list of known compatibility issues for certain browsers/devices,
and how to work around those issues.

If you encounter any browser quirks not listed here, please open a PR that
adds it, even if there is no known workaround.

### Video Playback on macOS Safari

macOS Safari requires that it is the foreground window to play back video. Use
the [`delayLaunch`](#delayLaunch) option to ensure that Safari launches after
any other browsers on the same machine.

Note also that the video element must have some portion within the viewport
being displayed by the browser. In your tests, ensure this is done.

### iOS 10 Safari

iOS 10 Safari does not implicitly close the current window when `driver.quit()`
is called, as specified by the WebDriver spec. This causes the browser to
connect twice during the next test run; the old window and the newly-launched
window. You should use the [`closeBeforeQuit`](#closeBeforeQuit) option to
ensure the window is closed at the end of each test run.

### iOS 12 Safari

iOS 12 Safari does not support closing the current window either through
`driver.close()` or `driver.quit()`. This causes the old window to connect
to the next run, before being disconnected (the new test run reuses the old
window, so the page effectively refreshes). You should use the
[`resetBeforeQuit`](#resetBeforeQuit) option to ensure the window is set to
`about:blank` at the end of each test run.

## Examples

For a more detailed example, see [the example file].

[the example file]: https://github.com/squarebracket/karma-selenium-grid-launcher/blob/master/examples/karma.conf.js
