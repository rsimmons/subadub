
// console.log('content script starting');

const styleElem = document.createElement('style');
styleElem.type = 'text/css';
styleElem.textContent = `
`;
document.head.insertBefore(styleElem, document.head.firstChild);

const scriptElem = document.createElement('script');
scriptElem.type = 'text/javascript';
scriptElem.src = chrome.runtime.getURL('page_script.js');
document.head.insertBefore(scriptElem, document.head.firstChild);

// console.log('content script finished');
