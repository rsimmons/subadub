/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subadub_1 = __importDefault(__webpack_require__(1));
(() => {
    const styleElem = document.createElement('link');
    styleElem.type = 'text/css';
    styleElem.rel = 'stylesheet';
    styleElem.id = 'subadub-style';
    styleElem.href = chrome.runtime.getURL("subadub.css");
    document.head.insertBefore(styleElem, document.head.firstChild);
    const scriptElem = document.createElement('script');
    scriptElem.type = 'text/javascript';
    scriptElem.id = 'subadub-script';
    scriptElem.innerHTML = subadub_1.default;
    document.head.insertBefore(scriptElem, document.head.firstChild);
})();


/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ("function initializeSubadub() {\n    console.info('Initializing Subadub');\n    const POLL_INTERVAL_MS = 500;\n    const WEBVTT_FMT = 'webvtt-lssdh-ios8';\n    const URL_MOVIEID_REGEX = RegExp('/watch/([0-9]+)');\n    const SUBS_LIST_ELEM_ID = 'subadub-subs-list';\n    const TOGGLE_DISPLAY_BUTTON_ID = 'subadub-toggle-display';\n    const TRACK_ELEM_ID = 'subadub-track';\n    const DOWNLOAD_BUTTON_ID = 'subadub-download';\n    const CUSTOM_SUBS_ELEM_ID = 'subadub-custom-subs';\n    const trackListCache = new Map(); // from movie ID to list of available tracks\n    const webvttCache = new Map(); // from 'movieID/trackID' to blob\n    let urlMovieId;\n    let selectedTrackId;\n    let showSubsState = true;\n    let targetSubsList = null;\n    let displayedSubsList = null;\n    let targetTrackBlob = null;\n    let displayedTrackBlob = null;\n    // Convert WebVTT text to plain text plus \"simple\" tags (allowed in SRT)\n    const TAG_REGEX = RegExp('</?([^>]*)>', 'ig');\n    function vttTextToSimple(s, netflixRTLFix) {\n        let simpleText = s;\n        // strip tags except simple ones\n        simpleText = simpleText.replace(TAG_REGEX, function (match, p1) {\n            return ['i', 'u', 'b'].includes(p1.toLowerCase()) ? match : '';\n        });\n        if (netflixRTLFix) {\n            // For each line, if it starts with lrm or rlm escape, wrap in LRE/RLE/PDF pair.\n            // This is weird, but needed for compatibility with Netflix. See issue #1.\n            const lines = simpleText.split('\\\\n');\n            const newLines = [];\n            for (const line of lines) {\n                if (line.startsWith('&lrm;')) {\n                    newLines.push('\\u202a' + line.slice(5) + '\\u202c');\n                }\n                else if (line.startsWith('&rlm;')) {\n                    newLines.push('\\u202b' + line.slice(5) + '\\u202c');\n                }\n                else {\n                    newLines.push(line);\n                }\n            }\n            simpleText = newLines.join('\\\\n');\n        }\n        return simpleText;\n    }\n    function extractMovieTextTracks(movieObj) {\n        const movieId = movieObj.movieId;\n        const usableTracks = [];\n        console.log('timedtexttracks', movieObj.timedtexttracks);\n        for (const track of movieObj.timedtexttracks) {\n            if (track.isForcedNarrative || track.isNoneTrack) {\n                continue; // don't want these\n            }\n            if (!track.cdnlist || !track.cdnlist.length) {\n                continue;\n            }\n            const firstCdnId = track.cdnlist[0].id;\n            if (!track.ttDownloadables) {\n                continue;\n            }\n            const webvttDL = track.ttDownloadables[WEBVTT_FMT];\n            if (!webvttDL || !webvttDL.downloadUrls) {\n                continue;\n            }\n            const bestUrl = webvttDL.downloadUrls[firstCdnId];\n            if (!bestUrl) {\n                continue;\n            }\n            const isClosedCaptions = track.rawTrackType === 'closedcaptions';\n            usableTracks.push({\n                id: track.new_track_id,\n                language: track.language,\n                languageDescription: track.languageDescription,\n                bestUrl: bestUrl,\n                isClosedCaptions: isClosedCaptions,\n            });\n        }\n        console.log('CACHING MOVIE TRACKS', movieId, usableTracks);\n        trackListCache.set(movieId, usableTracks);\n        renderAndReconcile();\n    }\n    function getSelectedTrackInfo() {\n        if (!urlMovieId || !selectedTrackId) {\n            throw new Error('Internal error, getSelectedTrackInfo called but urlMovieId or selectedTrackId is null');\n        }\n        const trackList = trackListCache.get(urlMovieId);\n        const matchingTracks = trackList.filter(el => el.id === selectedTrackId);\n        if (matchingTracks.length !== 1) {\n            throw new Error('internal error, no matching track id');\n        }\n        return matchingTracks[0];\n    }\n    function handleSubsListSetOrChange(selectElem) {\n        const trackId = selectElem.value;\n        console.log('selecting track', trackId);\n        selectedTrackId = trackId;\n        if (!selectedTrackId) {\n            return;\n        }\n        const cacheKey = urlMovieId + '/' + selectedTrackId;\n        if (!webvttCache.has(cacheKey)) {\n            const trackInfo = getSelectedTrackInfo();\n            const url = trackInfo.bestUrl;\n            fetch(url).then(function (response) {\n                if (response.ok) {\n                    return response.blob();\n                }\n                throw new Error('Bad response to WebVTT request');\n            }).then(function (blob) {\n                webvttCache.set(cacheKey, new Blob([blob], { type: 'text/vtt' })); // set type to avoid warning\n                renderAndReconcile();\n            }).catch(function (error) {\n                console.error('Failed to fetch WebVTT file', error.message);\n            });\n        }\n        // NOTE: We don't call renderAndReconcile here, caller should do it to avoid recursive loop bug\n    }\n    function enableDownloadButton() {\n        const downloadButtonElem = document.getElementById(DOWNLOAD_BUTTON_ID);\n        if (downloadButtonElem) {\n            downloadButtonElem.style.color = 'black';\n            downloadButtonElem.disabled = false;\n        }\n    }\n    function disableDownloadButton() {\n        const downloadButtonElem = document.getElementById(DOWNLOAD_BUTTON_ID);\n        if (downloadButtonElem) {\n            downloadButtonElem.style.color = 'grey';\n            downloadButtonElem.disabled = true;\n        }\n    }\n    function downloadSRT() {\n        function formatTime(t) {\n            const date = new Date(0, 0, 0, 0, 0, 0, t * 1000);\n            const hours = date.getHours().toString().padStart(2, '0');\n            const minutes = date.getMinutes().toString().padStart(2, '0');\n            const seconds = date.getSeconds().toString().padStart(2, '0');\n            const ms = date.getMilliseconds().toString().padStart(3, '0');\n            return hours + ':' + minutes + ':' + seconds + ',' + ms;\n        }\n        const trackElem = document.getElementById(TRACK_ELEM_ID);\n        if (!trackElem || !trackElem.track || !trackElem.track.cues) {\n            return;\n        }\n        // Figure out video title\n        const srtFilenamePieces = [];\n        for (const elem of document.querySelectorAll('.video-title *')) {\n            if (!elem.firstElementChild && elem.textContent) { // only get 'leaf' elements with text\n                srtFilenamePieces.push(elem.textContent);\n            }\n        }\n        let srtFilename;\n        if (srtFilenamePieces.length) {\n            srtFilename = srtFilenamePieces.join('-');\n        }\n        else {\n            srtFilename = urlMovieId.toString(); // fallback in case UI changes\n        }\n        srtFilename += '_' + trackElem.track.language; // append language code\n        srtFilename += '.srt';\n        const srtChunks = [];\n        let idx = 1;\n        for (const cue of trackElem.track.cues) {\n            const cleanedText = vttTextToSimple(cue.text, true);\n            srtChunks.push(idx + '\\\\n' + formatTime(cue.startTime) + ' --> ' + formatTime(cue.endTime) + '\\\\n' + cleanedText + '\\\\n\\\\n');\n            idx++;\n        }\n        const srtBlob = new Blob(srtChunks, { type: 'text/srt' });\n        const srtUrl = URL.createObjectURL(srtBlob);\n        const tmpElem = document.createElement('a');\n        tmpElem.setAttribute('href', srtUrl);\n        tmpElem.setAttribute('download', srtFilename);\n        tmpElem.style.display = 'none';\n        document.body.appendChild(tmpElem);\n        tmpElem.click();\n        document.body.removeChild(tmpElem);\n    }\n    function updateToggleDisplay() {\n        const buttomElem = document.getElementById(TOGGLE_DISPLAY_BUTTON_ID);\n        if (buttomElem) {\n            if (showSubsState) {\n                buttomElem.textContent = 'Hide Subs [S]';\n            }\n            else {\n                buttomElem.textContent = 'Show Subs [S]';\n            }\n        }\n        const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);\n        if (subsElem) {\n            if (showSubsState) {\n                subsElem.style.visibility = 'visible';\n            }\n            else {\n                subsElem.style.visibility = 'hidden';\n            }\n        }\n    }\n    function renderAndReconcile() {\n        function addSubsList(tracks) {\n            const toggleDisplayButtonElem = document.createElement('button');\n            toggleDisplayButtonElem.id = TOGGLE_DISPLAY_BUTTON_ID;\n            toggleDisplayButtonElem.style.cssText = 'margin: 5px; border: none; color: black; width: 8em';\n            toggleDisplayButtonElem.addEventListener('click', function (e) {\n                e.preventDefault();\n                showSubsState = !showSubsState;\n                updateToggleDisplay();\n            }, false);\n            const selectElem = document.createElement('select');\n            selectElem.style.cssText = 'color: black; margin: 5px';\n            selectElem.addEventListener('change', function (e) {\n                handleSubsListSetOrChange(e.target);\n                renderAndReconcile();\n            }, false);\n            let firstCCTrackId;\n            for (const track of tracks) {\n                const optElem = document.createElement('option');\n                optElem.value = track.id;\n                optElem.textContent = track.languageDescription + (track.isClosedCaptions ? ' [CC]' : '');\n                selectElem.appendChild(optElem);\n                if (track.isClosedCaptions && !firstCCTrackId) {\n                    firstCCTrackId = track.id;\n                }\n            }\n            if (firstCCTrackId) {\n                selectElem.value = firstCCTrackId;\n            }\n            const downloadButtonElem = document.createElement('button');\n            downloadButtonElem.id = DOWNLOAD_BUTTON_ID;\n            downloadButtonElem.textContent = 'Download SRT';\n            downloadButtonElem.style.cssText = 'margin: 5px; border: none';\n            downloadButtonElem.addEventListener('click', function (e) {\n                e.preventDefault();\n                console.log('download click');\n                downloadSRT();\n            }, false);\n            const panelElem = document.createElement('div');\n            panelElem.style.cssText = 'position: absolute; z-index: 1000; top: 0; right: 0; font-size: 16px; color: white';\n            panelElem.appendChild(toggleDisplayButtonElem);\n            panelElem.appendChild(selectElem);\n            panelElem.appendChild(downloadButtonElem);\n            const containerElem = document.createElement('div');\n            containerElem.id = SUBS_LIST_ELEM_ID;\n            containerElem.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; right: 0; bottom: 0; left: 0';\n            containerElem.appendChild(panelElem);\n            document.body.appendChild(containerElem);\n            updateToggleDisplay();\n            disableDownloadButton();\n            handleSubsListSetOrChange(selectElem);\n        }\n        function removeSubsList() {\n            const el = document.getElementById(SUBS_LIST_ELEM_ID);\n            if (el) {\n                el.remove();\n            }\n        }\n        function addTrackElem(videoElem, blob, srclang) {\n            const trackElem = document.createElement('track');\n            trackElem.id = TRACK_ELEM_ID;\n            trackElem.src = URL.createObjectURL(blob);\n            trackElem.kind = 'subtitles';\n            trackElem.default = true;\n            trackElem.srclang = srclang;\n            videoElem.appendChild(trackElem);\n            trackElem.track.mode = 'hidden'; // this can only be set after appending\n            trackElem.addEventListener('load', () => {\n                enableDownloadButton();\n            }, false);\n            const customSubsElem = document.createElement('div');\n            customSubsElem.id = CUSTOM_SUBS_ELEM_ID;\n            customSubsElem.style.cssText = 'position: absolute; bottom: 20vh; left: 0; right: 0; color: white; font-size: 3vw; text-align: center; user-select: text; -moz-user-select: text; z-index: 100; pointer-events: none';\n            trackElem.addEventListener('cuechange', (e) => {\n                // Remove all children\n                while (customSubsElem.firstChild) {\n                    customSubsElem.removeChild(customSubsElem.firstChild);\n                }\n                const track = e.target.track;\n                console.log('active now', track.activeCues);\n                for (const cue of track.activeCues) {\n                    const cueElem = document.createElement('div');\n                    cueElem.style.cssText = 'background: rgba(0,0,0,0.8); white-space: pre-wrap; padding: 0.2em 0.3em; margin: 10px auto; width: fit-content; width: -moz-fit-content; pointer-events: auto';\n                    cueElem.innerHTML = vttTextToSimple(cue.text, true); // may contain simple tags like <i> etc.\n                    customSubsElem.appendChild(cueElem);\n                }\n            }, false);\n            // Appending this to the player rather than the document fixes some issues:\n            // 1) Clicking on subtitle text doesn't take focus (keyboard events) away from player\n            // 2) Hover on subtitle prevents the \"sleep\" title screen from coming up, which is nice\n            const playerElem = document.querySelector('.NFPlayer');\n            if (!playerElem) {\n                throw new Error(\"Couldn't find player element to append subtitles to\");\n            }\n            playerElem.appendChild(customSubsElem);\n            updateToggleDisplay();\n        }\n        function removeTrackElem() {\n            const trackElem = document.getElementById(TRACK_ELEM_ID);\n            if (trackElem) {\n                trackElem.remove();\n            }\n            const customSubsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);\n            if (customSubsElem) {\n                customSubsElem.remove();\n            }\n            disableDownloadButton();\n        }\n        // Determine what subs list should be\n        if (urlMovieId && (document.readyState === 'complete') && trackListCache.has(urlMovieId)) {\n            targetSubsList = trackListCache.get(urlMovieId);\n        }\n        else {\n            targetSubsList = null;\n        }\n        // Reconcile DOM if necessary\n        if (targetSubsList !== displayedSubsList) {\n            console.log('updating subs list DOM', targetSubsList, displayedSubsList);\n            removeSubsList();\n            if (targetSubsList) {\n                addSubsList(targetSubsList);\n            }\n            displayedSubsList = targetSubsList;\n        }\n        // Determine what subs blob should be\n        const videoElem = document.querySelector('video');\n        if (urlMovieId && selectedTrackId && videoElem) {\n            const cacheKey = urlMovieId + '/' + selectedTrackId;\n            if (webvttCache.has(cacheKey)) {\n                targetTrackBlob = webvttCache.get(cacheKey);\n            }\n            else {\n                targetTrackBlob = null;\n            }\n        }\n        else {\n            targetTrackBlob = null;\n        }\n        // Reconcile DOM if necessary\n        if (targetTrackBlob !== displayedTrackBlob) {\n            console.log('need to update track blob', targetTrackBlob, displayedTrackBlob);\n            removeTrackElem();\n            if (targetTrackBlob) {\n                // NOTE: super hacky to get the language code this way\n                const languageCode = getSelectedTrackInfo().language;\n                addTrackElem(videoElem, targetTrackBlob, languageCode);\n            }\n            displayedTrackBlob = targetTrackBlob;\n        }\n    }\n    // Poll periodically to see if current movie has changed\n    setInterval(function () {\n        const movieIdMatch = URL_MOVIEID_REGEX.exec(window.location.pathname);\n        let movieId;\n        if (movieIdMatch) {\n            movieId = +movieIdMatch[1];\n        }\n        urlMovieId = movieId;\n        if (!urlMovieId) {\n            selectedTrackId = null;\n        }\n        renderAndReconcile();\n    }, POLL_INTERVAL_MS);\n    document.body.addEventListener('keydown', function (e) {\n        if ((e.keyCode === 67) && !e.altKey && !e.ctrlKey && !e.metaKey) { // unmodified C key\n            console.log('copying subs text to clipboard');\n            const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);\n            if (subsElem) {\n                const pieces = [];\n                for (const child of [...subsElem.children]) {\n                    pieces.push(child.textContent); // copy as plain text\n                }\n                const text = pieces.join('\\\\n');\n                navigator.clipboard.writeText(text);\n            }\n        }\n        else if ((e.keyCode === 83) && !e.altKey && !e.ctrlKey && !e.metaKey) { // unmodified S key\n            const el = document.getElementById(TOGGLE_DISPLAY_BUTTON_ID);\n            if (el) {\n                el.click();\n            }\n        }\n    }, false);\n    let hideSubsListTimeout;\n    function hideSubsListTimerFunc() {\n        const el = document.getElementById(SUBS_LIST_ELEM_ID);\n        if (el) {\n            el.style.display = 'none';\n        }\n        hideSubsListTimeout = null;\n    }\n    document.body.addEventListener('mousemove', function (e) {\n        // If there are any popups, make sure our subs don't block mouse events\n        const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);\n        if (subsElem) {\n            const popup = document.querySelector('.popup-content');\n            if (popup) {\n                subsElem.style.display = 'none';\n            }\n            else {\n                subsElem.style.display = 'block';\n            }\n        }\n        // Show subs list and update timer to hide it\n        const subsListElem = document.getElementById(SUBS_LIST_ELEM_ID);\n        if (subsListElem) {\n            subsListElem.style.display = 'block';\n        }\n        if (hideSubsListTimeout) {\n            clearTimeout(hideSubsListTimeout);\n        }\n        hideSubsListTimeout = setTimeout(hideSubsListTimerFunc, 3000);\n    }, false);\n}\ninitializeSubadub();\n");

/***/ })
/******/ ]);