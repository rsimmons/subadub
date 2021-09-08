
// console.log('content script starting');

const styleElem = document.createElement('style');
styleElem.type = 'text/css';
styleElem.textContent = `
`;
document.head.insertBefore(styleElem, document.head.firstChild);


const scriptElem = document.createElement('script');
scriptElem.text = `
(function initializeSubadub() {
  const POLL_INTERVAL_MS = 500;
  const MANIFEST_URL = "/manifest";
  const WEBVTT_FMT = 'webvtt-lssdh-ios8';

  const SUBS_LIST_ELEM_ID = 'subadub-subs-list';
  const TOGGLE_DISPLAY_BUTTON_ID = 'subadub-toggle-display';
  const TRACK_ELEM_ID = 'subadub-track';
  const DOWNLOAD_BUTTON_ID = 'subadub-download';
  const CUSTOM_SUBS_ELEM_ID = 'subadub-custom-subs';

  const NETFLIX_PROFILES = [
    'heaac-2-dash',
    'heaac-2hq-dash',
    'playready-h264mpl30-dash',
    'playready-h264mpl31-dash',
    'playready-h264hpl30-dash',
    'playready-h264hpl31-dash',
    'vp9-profile0-L30-dash-cenc',
    'vp9-profile0-L31-dash-cenc',
    'dfxp-ls-sdh',
    'simplesdh',
    'nflx-cmisc',
    'BIF240',
    'BIF320'
  ]

  const trackListCache = new Map(); // from movie ID to list of available tracks
  const webvttCache = new Map(); // from 'movieID/trackID' to blob
  let urlMovieId; // this is mis-named now, it's pulled from the HTML
  let selectedTrackId;
  let showSubsState = true;

  let targetSubsList = null;
  let displayedSubsList = null;

  let targetTrackBlob = null;
  let displayedTrackBlob = null;

  // Convert WebVTT text to plain text plus "simple" tags (allowed in SRT)
  const TAG_REGEX = RegExp('</?([^>]*)>', 'ig');
  function vttTextToSimple(s, netflixRTLFix) {
    let simpleText = s;

    // strip tags except simple ones
    simpleText = simpleText.replace(TAG_REGEX, function (match, p1) {
      return ['i', 'u', 'b'].includes(p1.toLowerCase()) ? match : '';
    });

    if (netflixRTLFix) {
      // For each line, if it starts with lrm or rlm escape, wrap in LRE/RLE/PDF pair.
      // This is weird, but needed for compatibility with Netflix. See issue #1.
      const lines = simpleText.split('\\n');
      const newLines = [];
      for (const line of lines) {
        if (line.startsWith('&lrm;')) {
          newLines.push('\u202a' + line.slice(5) + '\u202c');
        } else if (line.startsWith('&rlm;')) {
          newLines.push('\u202b' + line.slice(5) + '\u202c');
        } else {
          newLines.push(line);
        }
      }
      simpleText = newLines.join('\\n');
    }

    return simpleText;
  }

  function extractMovieTextTracks(movieObj) {
    const movieId = movieObj.movieId;

    const usableTracks = [];
    // console.log('timedtexttracks', movieObj.timedtexttracks);
    for (const track of movieObj.timedtexttracks) {
      if (track.isForcedNarrative || track.isNoneTrack) {
        continue; // don't want these
      }

      if (!track.cdnlist || !track.cdnlist.length) {
        continue;
      }

      if (!track.ttDownloadables) {
        continue;
      }

      const webvttDL = track.ttDownloadables[WEBVTT_FMT];
      if (!webvttDL || !webvttDL.downloadUrls) {
        continue;
      }

      const bestUrl = getBestAvailableUrl({
        urls: webvttDL.downloadUrls,
        cdnList: track.cdnlist
      })

      if (!bestUrl) {
        continue;
      }

      const isClosedCaptions = track.rawTrackType === 'closedcaptions';

      usableTracks.push({
        id: track.new_track_id,
        language: track.language,
        languageDescription: track.languageDescription,
        bestUrl: bestUrl,
        isClosedCaptions: isClosedCaptions,
      });
    }

    // console.log('CACHING MOVIE TRACKS', movieId, usableTracks);
    trackListCache.set(movieId, usableTracks);
    renderAndReconcile();
  }

  function getBestAvailableUrl({ urls, cdnList }) {
    const { id: bestAvailableCDN } = cdnList.find((cdn) => urls[cdn.id])
    return urls[bestAvailableCDN]
  }

  function getSelectedTrackInfo() {
    if (!urlMovieId || !selectedTrackId) {
      throw new Error('Internal error, getSelectedTrackInfo called but urlMovieId or selectedTrackId is null');
    }
    const trackList = trackListCache.get(urlMovieId);
    const matchingTracks = trackList.filter(el => el.id === selectedTrackId);
    if (matchingTracks.length !== 1) {
      throw new Error('internal error, no matching track id');
    }
    return matchingTracks[0];
  }

  function handleSubsListSetOrChange(selectElem) {
    const trackId = selectElem.value;
    // console.log('selecting track', trackId);

    selectedTrackId = trackId;

    if (!selectedTrackId) {
      return;
    }

    const cacheKey = urlMovieId + '/' + selectedTrackId;
    if (!webvttCache.has(cacheKey)) {
      const trackInfo = getSelectedTrackInfo();
      const url = trackInfo.bestUrl;

      fetch(url).then(function(response) {
        if (response.ok) {
          return response.blob();
        }
        throw new Error('Bad response to WebVTT request');
      }).then(function(blob) {
        webvttCache.set(cacheKey, new Blob([blob], {type: 'text/vtt'})); // set type to avoid warning
        renderAndReconcile();
      }).catch(function(error) {
        console.error('Failed to fetch WebVTT file', error.message);
      });
    }

    // NOTE: We don't call renderAndReconcile here, caller should do it to avoid recursive loop bug
  }

  function enableDownloadButton() {
    const downloadButtonElem = document.getElementById(DOWNLOAD_BUTTON_ID);
    if (downloadButtonElem) {
      downloadButtonElem.style.color = 'black';
      downloadButtonElem.disabled = false;
    }
  }

  function disableDownloadButton() {
    const downloadButtonElem = document.getElementById(DOWNLOAD_BUTTON_ID);
    if (downloadButtonElem) {
      downloadButtonElem.style.color = 'grey';
      downloadButtonElem.disabled = true;
    }
  }

  function downloadSRT() {
    function formatTime(t) {
      const date = new Date(0, 0, 0, 0, 0, 0, t*1000);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      const ms = date.getMilliseconds().toString().padStart(3, '0');

      return hours + ':' + minutes + ':' + seconds + ',' + ms;
    }

    const trackElem = document.getElementById(TRACK_ELEM_ID);
    if (!trackElem || !trackElem.track || !trackElem.track.cues) {
      return;
    }

    // Figure out video title
    const srtFilenamePieces = [];
    for (const elem of document.querySelectorAll('.video-title *')) {
      if (!elem.firstElementChild && elem.textContent) { // only get 'leaf' elements with text
        srtFilenamePieces.push(elem.textContent);
      }
    }
    let srcFilename;
    if (srtFilenamePieces.length) {
      srtFilename = srtFilenamePieces.join('-');
    } else {
      srtFilename = urlMovieId.toString(); // fallback in case UI changes
    }
    srtFilename += '_' + trackElem.track.language; // append language code
    srtFilename += '.srt';

    const srtChunks = [];
    let idx = 1;
    for (const cue of trackElem.track.cues) {
      const cleanedText = vttTextToSimple(cue.text, true);
      srtChunks.push(idx + '\\n' + formatTime(cue.startTime) + ' --> ' + formatTime(cue.endTime) + '\\n' + cleanedText + '\\n\\n');
      idx++;
    }

    const srtBlob = new Blob(srtChunks, { type: 'text/srt' });
    const srtUrl = URL.createObjectURL(srtBlob);

    const tmpElem = document.createElement('a');
    tmpElem.setAttribute('href', srtUrl);
    tmpElem.setAttribute('download', srtFilename);
    tmpElem.style.display = 'none';
    document.body.appendChild(tmpElem);
    tmpElem.click();
    document.body.removeChild(tmpElem);
  }

  function updateToggleDisplay() {
    const buttomElem = document.getElementById(TOGGLE_DISPLAY_BUTTON_ID);
    if (buttomElem) {
      if (showSubsState) {
        buttomElem.textContent = 'Hide Subs [S]';
      } else {
        buttomElem.textContent = 'Show Subs [S]';
      }
    }
    const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
    if (subsElem) {
      if (showSubsState) {
        subsElem.style.visibility = 'visible';
      } else {
        subsElem.style.visibility = 'hidden';
      }
    }
  }

  function renderAndReconcile() {
    function addSubsList(tracks) {
      const toggleDisplayButtonElem = document.createElement('button');
      toggleDisplayButtonElem.id = TOGGLE_DISPLAY_BUTTON_ID;
      toggleDisplayButtonElem.style.cssText = 'margin: 5px; border: none; color: black; width: 8em';
      toggleDisplayButtonElem.addEventListener('click', function(e) {
        e.preventDefault();
        showSubsState = !showSubsState;
        updateToggleDisplay();
      }, false);

      const selectElem = document.createElement('select');
      selectElem.style.cssText = 'color: black; margin: 5px';
      selectElem.addEventListener('change', function(e) {
        handleSubsListSetOrChange(e.target);
        renderAndReconcile();
      }, false);

      let firstCCTrackId;
      for (const track of tracks) {
        const optElem = document.createElement('option');
        optElem.value = track.id;
        optElem.textContent = track.languageDescription + (track.isClosedCaptions ? ' [CC]' : '');
        selectElem.appendChild(optElem);

        if (track.isClosedCaptions && !firstCCTrackId) {
          firstCCTrackId = track.id;
        }
      }
      if (firstCCTrackId) {
        selectElem.value = firstCCTrackId;
      }

      const downloadButtonElem = document.createElement('button');
      downloadButtonElem.id = DOWNLOAD_BUTTON_ID;
      downloadButtonElem.textContent = 'Download SRT';
      downloadButtonElem.style.cssText = 'margin: 5px; border: none';
      downloadButtonElem.addEventListener('click', function(e) {
        e.preventDefault();
        // console.log('download click');
        downloadSRT();
      }, false);

      const panelElem = document.createElement('div');
      panelElem.style.cssText = 'position: absolute; z-index: 1000; top: 0; right: 0; font-size: 16px; color: white; pointer-events: auto';
      panelElem.appendChild(toggleDisplayButtonElem);
      panelElem.appendChild(selectElem);
      panelElem.appendChild(downloadButtonElem);

      const containerElem = document.createElement('div');
      containerElem.id = SUBS_LIST_ELEM_ID;
      containerElem.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none';
      containerElem.appendChild(panelElem);

      document.body.appendChild(containerElem);

      updateToggleDisplay();
      disableDownloadButton();

      handleSubsListSetOrChange(selectElem);
    }

    function removeSubsList() {
      const el = document.getElementById(SUBS_LIST_ELEM_ID);
      if (el) {
        el.remove();
      }
    }

    function addTrackElem(videoElem, blob, srclang) {
      const trackElem = document.createElement('track');
      trackElem.id = TRACK_ELEM_ID;
      trackElem.src = URL.createObjectURL(blob);
      trackElem.kind = 'subtitles';
      trackElem.default = true;
      trackElem.srclang = srclang;
      videoElem.appendChild(trackElem);
      trackElem.track.mode = 'hidden'; // this can only be set after appending

      trackElem.addEventListener('load', function() {
        enableDownloadButton();
      }, false);

      const customSubsElem = document.createElement('div');
      customSubsElem.id = CUSTOM_SUBS_ELEM_ID;
      customSubsElem.style.cssText = 'position: absolute; bottom: 20vh; left: 0; right: 0; color: white; font-size: 3vw; text-align: center; user-select: text; -moz-user-select: text; z-index: 100; pointer-events: none';

      trackElem.addEventListener('cuechange', function(e) {
        // Remove all children
        while (customSubsElem.firstChild) {
          customSubsElem.removeChild(customSubsElem.firstChild);
        }

        const track = e.target.track;
        // console.log('active now', track.activeCues);
        for (const cue of track.activeCues) {
          const cueElem = document.createElement('div');
          cueElem.style.cssText = 'background: rgba(0,0,0,0.8); white-space: pre-wrap; padding: 0.2em 0.3em; margin: 10px auto; width: fit-content; width: -moz-fit-content; pointer-events: auto';
          cueElem.innerHTML = vttTextToSimple(cue.text, true); // may contain simple tags like <i> etc.
          customSubsElem.appendChild(cueElem);
        }
      }, false);

      // Appending this to the player rather than the document changes details of behavior.
      const playerElem = document.querySelector('.watch-video');
      if (!playerElem) {
        throw new Error("Couldn't find player element to append subtitles to");
      }
      playerElem.appendChild(customSubsElem);

      updateToggleDisplay();
    }

    function removeTrackElem() {
      const trackElem = document.getElementById(TRACK_ELEM_ID);
      if (trackElem) {
        trackElem.remove();
      }

      const customSubsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
      if (customSubsElem) {
        customSubsElem.remove();
      }

      disableDownloadButton();
    }

    // Determine what subs list should be
    if (urlMovieId && (document.readyState === 'complete') && trackListCache.has(urlMovieId)) {
      targetSubsList = trackListCache.get(urlMovieId);
    } else {
      targetSubsList = null;
    }

    // Reconcile DOM if necessary
    if (targetSubsList !== displayedSubsList) {
      // console.log('updating subs list DOM', targetSubsList, displayedSubsList);

      removeSubsList();
      if (targetSubsList) {
        addSubsList(targetSubsList);
      }

      displayedSubsList = targetSubsList;
    }

    // Determine what subs blob should be
    const videoElem = document.querySelector('video');
    if (urlMovieId && selectedTrackId && videoElem) {
      const cacheKey = urlMovieId + '/' + selectedTrackId;
      if (webvttCache.has(cacheKey)) {
        targetTrackBlob = webvttCache.get(cacheKey);
      } else {
        targetTrackBlob = null;
      }
    } else {
      targetTrackBlob = null;
    }

    // Reconcile DOM if necessary
    if (targetTrackBlob !== displayedTrackBlob) {
      // console.log('need to update track blob', targetTrackBlob, displayedTrackBlob);

      removeTrackElem();
      if (targetTrackBlob) {
        // NOTE: super hacky to get the language code this way
        const languageCode = getSelectedTrackInfo().language;
        addTrackElem(videoElem, targetTrackBlob, languageCode);
      }

      displayedTrackBlob = targetTrackBlob;
    }
  }

  function isSubtitlesProperty(key, value) {
    return key === 'profiles' || value.some(item => NETFLIX_PROFILES.includes(item))
  }

  function findSubtitlesProperty(obj) {
    for (let key in obj) {
      let value = obj[key];
      if (Array.isArray(value)) {
          if (isSubtitlesProperty(key, value)) {
              return value;
          }
      }
      if (typeof value === 'object') {
        const prop = findSubtitlesProperty(value);
        if (prop) {
            return prop;
        }
      }
    }
    return null;
  }

  const originalStringify = JSON.stringify;
  JSON.stringify = function(value) {
    // Don't hardcode property names here because Netflix
    // changes them a lot; search instead
    let prop = findSubtitlesProperty(value);
    if (prop) {
      prop.unshift(WEBVTT_FMT);
    }
    return originalStringify.apply(this, arguments);
  };

  const originalParse = JSON.parse;
  JSON.parse = function() {
    const value = originalParse.apply(this, arguments);
    if (value && value.result && value.result.movieId && value.result.timedtexttracks) {
      // console.log('parse', value);
      extractMovieTextTracks(value.result);
    }
    return value;
  }

  // Poll periodically to see if current movie has changed
  setInterval(function() {
    let videoId;
    const videoIdElem = document.querySelector('*[data-videoid]');
    if (videoIdElem) {
      const dsetIdStr = videoIdElem.dataset.videoid;
      if (dsetIdStr) {
        videoId = +dsetIdStr;
      }
    }

    urlMovieId = videoId;
    if (!urlMovieId) {
      selectedTrackId = null;
    }

    renderAndReconcile();
  }, POLL_INTERVAL_MS);

  document.body.addEventListener('keydown', function(e) {
    if ((e.keyCode === 67) && !e.altKey && !e.ctrlKey && !e.metaKey) { // unmodified C key
      // console.log('copying subs text to clipboard');
      const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
      if (subsElem) {
        const pieces = [];
        for (child of [...subsElem.children]) {
          pieces.push(child.textContent); // copy as plain text
        }
        const text = pieces.join('\\n');
        navigator.clipboard.writeText(text);
      }
    } else if ((e.keyCode === 83) && !e.altKey && !e.ctrlKey && !e.metaKey) { // unmodified S key
      const el = document.getElementById(TOGGLE_DISPLAY_BUTTON_ID);
      if (el) {
        el.click();
      }
    }
  }, false);

  let hideSubsListTimeout;
  function hideSubsListTimerFunc() {
    const el = document.getElementById(SUBS_LIST_ELEM_ID);
    if (el) {
      el.style.display = 'none';
    }
    hideSubsListTimeout = null;
  }

  document.body.addEventListener('mousemove', function(e) {
    // If there are any popups, make sure our subs don't block mouse events
    const subsElem = document.getElementById(CUSTOM_SUBS_ELEM_ID);
    if (subsElem) {
      const popup = document.querySelector('.popup-content');
      if (popup) {
        subsElem.style.display = 'none';
      } else {
        subsElem.style.display = 'block';
      }
    }

    // Show subs list and update timer to hide it
    const subsListElem = document.getElementById(SUBS_LIST_ELEM_ID);
    if (subsListElem) {
      subsListElem.style.display = 'block';
    }
    if (hideSubsListTimeout) {
      clearTimeout(hideSubsListTimeout);
    }
    hideSubsListTimeout = setTimeout(hideSubsListTimerFunc, 3000);
  }, false);
})();
`;
document.head.insertBefore(scriptElem, document.head.firstChild);

// console.log('content script finished');
