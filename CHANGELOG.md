# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.3.0] - 2019-07-26
### Added
- `closeBeforeQuit` launcher option
- `resetBeforeQuit` launcher option
- `Waiting for <browser> to quit...` message
- Killing Tests Prematurely section to README
- Browser Quirks and Workarounds section to README

### Changed
- Deprecated `promptOn` launcher option
- Major code refactor

### Fixed
- Quitting while launching browsers should now be handled properly
- Reliability is generally better

## [0.2.0] - 2019-03-29
### Added
- `promptOn` launcher option
- `delayLaunch` launcher option
- `windowGeometry` launcher option

### Changed
- Make things more generic and promisified and generally better

## [0.1.2] - 2019-01-15
### Added
- Send and then close alert to non-Safari browsers to try to avoid focus problems

### Changed
- Error out after a certain number of heartbeat errors

## [0.1.1] - 2018-11-05
### Fixed
- Set browser display name based on `customLaunchers` key

## 0.1.0 - 2018-11-05
### Added
- Initial Code

[0.3.0]: https://github.com/squarebracket/karma-selenium-grid-launcher/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/squarebracket/karma-selenium-grid-launcher/compare/0.1.2...0.2.0
[0.1.2]: https://github.com/squarebracket/karma-selenium-grid-launcher/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/squarebracket/karma-selenium-grid-launcher/compare/0.1.0...0.1.1
