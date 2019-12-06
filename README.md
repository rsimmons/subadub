# Subadub

Subadub is a browser extension for Chrome and Firefox that enhances Netflix subtitles for foreign language study.

- Subtitles are displayed as selectable text, so you can copy+paste them to make flash cards and look up words in a dictionary (e.g. using the Yomichan or Rikaikun extensions for Japanese)
- Full subtitles for a video can be downloaded in SRT format for personal study/review

## Installation

- [Subadub for Google Chrome](https://chrome.google.com/webstore/detail/subadub/jamiekdimmhnnemaaimmdahnahfmfdfk)
- [Subadub for Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/subadub/)

## Process to Publish a New Version

- make changes to dist/content_script.js
- bump version number in dist/manifest.json
- (best to commit+push these changes, but not required)
- run archive.sh to produce new subadub.zip
- upload subadub.zip to Chrome Web Store (https://chrome.google.com/webstore/developer/dashboard) and Firefox Add-on Developer Hub (https://addons.mozilla.org/en-US/developers/)
