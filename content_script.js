
// console.log('content script starting');

const el = document.createElement('script');
el.text = `
(function initializeSubadub() {
  const POLL_INTERVAL_MS = 500;
  const WEBVTT_FMT = 'webvtt-lssdh-ios8';
  const URL_MOVIEID_REGEX = RegExp('/watch/([0-9]+)');
  const tracksCache = new Map(); // from movie ID to list of available tracks
  let urlMovieId;
  
  let targetSubsList;
  let displayedSubsList;

  function extractMovieTextTracks(movieObj) {
    const movieId = movieObj.movieId;

    const usableTracks = [];
    console.log('timedtexttracks', movieObj.timedtexttracks);
    for (const track of movieObj.timedtexttracks) {
      if (track.isForcedNarrative || track.isNoneTrack) {
        continue; // don't want these
      }

      if (!track.cdnlist || !track.cdnlist.length) {
        continue;
      }
      const firstCdnId = track.cdnlist[0].id;

      if (!track.ttDownloadables) {
        continue;
      }

      const webvttDL = track.ttDownloadables[WEBVTT_FMT];
      if (!webvttDL || !webvttDL.downloadUrls) {
        continue;
      }

      const bestUrl = webvttDL.downloadUrls[firstCdnId];
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

    console.log('CACHING MOVIE TRACKS', movieId, usableTracks);
    tracksCache.set(movieId, usableTracks);
    renderAndReconcile();
  }

  function handleSubsListSetOrChange(selectElem) {
    console.log('selecting track', selectElem.value);
  }

  function renderAndReconcile() {
    const SUBS_LIST_ID = 'subadub-subs-list'

    function addSubsList(tracks) {
      const selectElem = document.createElement('select');
      selectElem.style.cssText = 'position: absolute; z-index: 1000; top: 10px; right: 10px; color: black; font-size: 16px';
      selectElem.addEventListener('change', function(e) {
        handleSubsListSetOrChange(e.target);
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

      const containerElem = document.createElement('div');
      containerElem.id = SUBS_LIST_ID;
      containerElem.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; right: 0; bottom: 0; left: 0';
      containerElem.appendChild(selectElem);

      document.body.appendChild(containerElem);

      handleSubsListSetOrChange(selectElem);
    }

    function removeSubsList() {
      const el = document.getElementById(SUBS_LIST_ID);
      if (el) {
        el.remove();
      }
    }

    // Determine what subs list should be
    if (urlMovieId && (document.readyState === 'complete') && tracksCache.has(urlMovieId)) {
      targetSubsList = tracksCache.get(urlMovieId);
    } else {
      targetSubsList = null;
    }

    // Reconcile DOM if necessary
    if (targetSubsList != displayedSubsList) {
      console.log('updating subs list DOM');
      removeSubsList();
      if (targetSubsList) {
        addSubsList(targetSubsList);
      }
      displayedSubsList = targetSubsList;
    }
  }

  const originalStringify = JSON.stringify;
  JSON.stringify = function(value) {
    if (value && value.params && value.params.profiles) {
      value.params.profiles.unshift(WEBVTT_FMT);
      // console.log('stringify', value);
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
    const movieIdMatch = URL_MOVIEID_REGEX.exec(window.location.pathname);
    let movieId;
    if (movieIdMatch) {
      movieId = +movieIdMatch[1];
    }
    urlMovieId = movieId;

    renderAndReconcile();
  }, POLL_INTERVAL_MS);
})();
`;
document.head.insertBefore(el, document.head.firstChild);

// console.log('content script finished');
