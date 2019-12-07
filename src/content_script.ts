import rawSubadub from 'raw-loader!./subadub';

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
  scriptElem.innerHTML = rawSubadub;
  document.head.insertBefore(scriptElem, document.head.firstChild);
})();
