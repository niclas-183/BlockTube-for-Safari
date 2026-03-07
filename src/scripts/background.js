'use strict';

const has = Object.prototype.hasOwnProperty;
const unicodeBoundry = "[ \n\r\t!@#$%^&*()_\\-=+\\[\\]\\\\\\|;:'\",\\.\\/<>\\?`~:]+";
const rawBrowser = globalThis.browser || globalThis.chrome;
const ports = {};
const safariInjectedDocuments = new Set();
let enabled = true;
let initStorage = false;
let compiledStorage;
let storage = {
  filterData: {
    videoId: [],
    channelId: [],
    channelName: [],
    comment: [],
    title: [],
    vidLength: [null, null],
    javascript: "",
    percentWatchedHide: null
  },
  options: {
    trending: false,
    mixes: false,
    shorts: false,
    movies: false,
    suggestions_only: false,
    autoplay: false,
    enable_javascript: false,
    block_message: "",
    block_feedback: false,
    disable_db_normalize: false,
    disable_you_there: false,
    disable_on_history: false
  },
};

const utils = {
  compileRegex(entriesArr, type) {
    if (!(entriesArr instanceof Array)) {
      return undefined;
    }
    // empty dataset
    if (entriesArr.length === 1 && entriesArr[0] === '') return [];

    // skip empty and comments lines
    const filtered = [...new Set(entriesArr.filter(x => !(!x || x === '' || x.startsWith('//'))))];

    return filtered.map((v) => {
      v = v.trim();

      // unique id
      if (['channelId', 'videoId'].includes(type)) {
        return [`^${v}$`, ''];
      }

      // raw regex
      const parts = /^\/(.*)\/(.*)$/.exec(v);
      if (parts !== null) {
        return [parts[1], parts[2]];
      }

      // wildcard pattern: iran* / *iran* / ir?n etc.
      if (/[*?]/.test(v)) {
        const escaped = v.replace(/[\\^$+.()|[\]{}]/g, '\\$&');
        const pattern = escaped.replace(/\*/g, '\\S*').replace(/\?/g, '\\S');
        const lead = v.startsWith('*') ? '' : '(^|' + unicodeBoundry + ')';
        const trail = v.endsWith('*') ? '' : '(' + unicodeBoundry + '|$)';
        return [lead + '(' + pattern + ')' + trail, 'i'];
      }

      // regular keyword
      return ['(^|' + unicodeBoundry + ')(' +
        v.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') +
        ')(' + unicodeBoundry + '|$)', 'i'];
    });
  },

  compileAll(data) {
    const sendData = { filterData: {}, options: data.options };

    // compile regex props
    ['title', 'channelName', 'channelId', 'videoId', 'comment'].forEach((p) => {
      const dataArr = this.compileRegex(data.filterData[p], p);
      if (dataArr) {
        sendData.filterData[p] = dataArr;
      }
    });

    sendData.filterData.vidLength = data.filterData.vidLength;
    sendData.filterData.javascript = data.filterData.javascript;

    return sendData;
  },

  sendFilters(port) {
    port.postMessage({ type: 'filtersData', data: { storage, compiledStorage, enabled } });
  },

  sendFiltersToAll() {
    Object.keys(ports).forEach((p) => {
      try {
        ports[p].postMessage({ type: 'filtersData', data: { storage, compiledStorage, enabled } });
      } catch (e) {
        console.error('Where are you my child?');
      }
    });
  },

  sendReloadToAll() {
    Object.keys(ports).forEach((p) => {
      try {
        ports[p].postMessage({ type: 'reloadRequired'});
      } catch (e) {
        console.error('Where are you my child?');
      }
    });
  }
};

function isSafariWebExtension() {
  try {
    return typeof rawBrowser?.runtime?.getURL === 'function'
      && rawBrowser.runtime.getURL('').startsWith('safari-web-extension://');
  } catch (error) {
    return false;
  }
}

function getSafariDocumentKey(sender = {}) {
  if (sender.documentId) return sender.documentId;

  const parts = [];
  if (sender.tab && sender.tab.id !== undefined) parts.push(`tab:${sender.tab.id}`);
  if (sender.frameId !== undefined) parts.push(`frame:${sender.frameId}`);
  if (sender.url) parts.push(`url:${sender.url}`);
  return parts.length > 0 ? parts.join('|') : undefined;
}

async function registerSafariPageScripts() {
  if (!isSafariWebExtension() || !rawBrowser?.scripting || !(rawBrowser.scripting.registerContentScripts instanceof Function)) {
    return;
  }

  const scriptId = 'blocktube-page-context';
  const executionWorld = rawBrowser.scripting.ExecutionWorld?.MAIN || 'MAIN';
  const script = {
    id: scriptId,
    matches: ['https://www.youtube.com/*', 'https://m.youtube.com/*'],
    js: ['src/scripts/seed.js', 'src/scripts/inject.js'],
    runAt: 'document_start',
    allFrames: true,
    world: executionWorld,
  };

  try {
    if (rawBrowser.scripting.unregisterContentScripts instanceof Function) {
      await rawBrowser.scripting.unregisterContentScripts({ ids: [scriptId] });
    }
  } catch (error) {
    if (!/not found|No script/i.test(String(error?.message || error))) {
      console.debug('BlockTube Safari content script refresh skipped', error);
    }
  }

  try {
    await rawBrowser.scripting.registerContentScripts([script]);
  } catch (error) {
    console.error('Failed to register Safari main-world scripts', error);
  }
}

async function ensureSafariPageScripts(sender = {}) {
  if (!isSafariWebExtension() || !rawBrowser?.scripting || !(rawBrowser.scripting.executeScript instanceof Function)) {
    return;
  }
  if (!sender.tab || sender.tab.id === undefined) return;

  const documentKey = getSafariDocumentKey(sender);
  if (documentKey && safariInjectedDocuments.has(documentKey)) return;
  if (documentKey) safariInjectedDocuments.add(documentKey);

  const target = { tabId: sender.tab.id };
  if (sender.frameId !== undefined) {
    target.frameIds = [sender.frameId];
  }

  try {
    await rawBrowser.scripting.executeScript({
      target,
      files: ['src/scripts/seed.js', 'src/scripts/inject.js'],
      world: rawBrowser.scripting.ExecutionWorld?.MAIN || 'MAIN',
    });
  } catch (error) {
    if (documentKey) safariInjectedDocuments.delete(documentKey);
    console.error('Failed to inject Safari page scripts', error);
  }
}

BTBrowser.runtime.onConnect.addListener((port) => {
  const key = BTBrowser.getPortKey(port);
  const documentKey = getSafariDocumentKey(port.sender || {});

  port.onDisconnect.addListener(() => {
    delete ports[key];
    if (documentKey) safariInjectedDocuments.delete(documentKey);
  });

  ports[key] = port;
  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'contextBlock': {
        storage.filterData[msg.data.type].push(...msg.data.entries);
        BTBrowser.storage.local.set({ storageData: storage });
        break;
      }
      default:
        break;
    }
  });

  Promise.resolve(ensureSafariPageScripts(port.sender || {}))
    .catch((error) => {
      console.error('Failed preparing Safari page scripts', error);
    })
    .finally(() => {
      if (initStorage) {
        utils.sendFilters(port);
      }
    });
});

BTBrowser.storage.onChanged.addListener((changes) => {
  if (has.call(changes, 'storageData')) {
    storage = changes.storageData.newValue;
    compiledStorage = utils.compileAll(changes.storageData.newValue);
    utils.sendFiltersToAll();
  }
  if (has.call(changes, 'enabled')) {
    enabled = changes.enabled.newValue;
    utils.sendFiltersToAll();
  }
});

BTBrowser.storage.local.get(['storageData', 'enabled'], (data) => {
  if (data !== undefined && Object.keys(data).length > 0) {
    storage = data.storageData;
    compiledStorage = utils.compileAll(data.storageData);
  }
  if (Object.hasOwn(data, 'enabled')) {
    enabled = data.enabled;
  }
  initStorage = true;
  utils.sendFiltersToAll();
});

void registerSafariPageScripts();

BTBrowser.runtime.onInstalled.addListener((details) => {
  void registerSafariPageScripts();
  if (details.reason === BTBrowser.runtime.OnInstalledReason.UPDATE) {
    utils.sendReloadToAll();
  }
});
