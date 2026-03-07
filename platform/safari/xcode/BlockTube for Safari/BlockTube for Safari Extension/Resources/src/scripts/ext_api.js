(function (global) {
  'use strict';

  const raw = global.browser || global.chrome;
  const usesPromises = !!global.browser;

  function callWithOptionalCallback(context, fn, args, callback) {
    if (!(fn instanceof Function)) {
      if (callback instanceof Function) callback();
      return undefined;
    }

    if (!(callback instanceof Function)) {
      return fn.apply(context, args);
    }

    try {
      if (!usesPromises) {
        return fn.apply(context, args.concat(callback));
      }

      const result = fn.apply(context, args);
      if (result && result.then instanceof Function) {
        result.then((value) => callback(value)).catch((error) => {
          console.error(error);
          callback();
        });
      } else {
        callback(result);
      }
      return result;
    } catch (error) {
      console.error(error);
      callback();
      return undefined;
    }
  }

  function queryTabs(queryInfo, callback) {
    if (!raw || !raw.tabs || !(raw.tabs.query instanceof Function)) {
      callback([]);
      return;
    }

    callWithOptionalCallback(raw.tabs, raw.tabs.query, [queryInfo], (tabs) => {
      callback(Array.isArray(tabs) ? tabs : []);
    });
  }

  function getPortKey(port) {
    if (port && port._btPortKey) return port._btPortKey;

    const sender = (port && port.sender) || {};
    const parts = [];

    if (sender.contextId) parts.push(`context:${sender.contextId}`);
    if (sender.documentId) parts.push(`document:${sender.documentId}`);
    if (sender.tab && sender.tab.id !== undefined) parts.push(`tab:${sender.tab.id}`);
    if (sender.frameId !== undefined) parts.push(`frame:${sender.frameId}`);
    if (sender.url) parts.push(`url:${sender.url}`);
    if (parts.length === 0) parts.push(`port:${port && port.name ? port.name : 'anonymous'}`);

    const key = parts.join('|');
    if (port) port._btPortKey = key;
    return key;
  }

  const runtime = raw && raw.runtime ? raw.runtime : {};
  const storage = raw && raw.storage ? raw.storage : {};
  const tabs = raw && raw.tabs ? raw.tabs : {};

  global.BTBrowser = {
    storage: {
      local: {
        get(keys, callback) {
          return callWithOptionalCallback(storage.local, storage.local && storage.local.get, [keys], callback);
        },
        set(items, callback) {
          return callWithOptionalCallback(storage.local, storage.local && storage.local.set, [items], callback);
        },
      },
      onChanged: storage.onChanged || {
        addListener() {},
        removeListener() {},
      },
    },
    runtime: {
      connect(connectInfo) {
        return runtime.connect(connectInfo);
      },
      openOptionsPage(callback) {
        if (runtime.openOptionsPage instanceof Function) {
          return callWithOptionalCallback(runtime, runtime.openOptionsPage, [], callback);
        }

        if (runtime.getURL instanceof Function && tabs.create instanceof Function) {
          return callWithOptionalCallback(tabs, tabs.create, [{ url: runtime.getURL('src/ui/options.html') }], callback);
        }

        if (callback instanceof Function) callback();
        return undefined;
      },
      onConnect: runtime.onConnect || {
        addListener() {},
      },
      onInstalled: runtime.onInstalled || {
        addListener() {},
      },
      OnInstalledReason: runtime.OnInstalledReason || {
        UPDATE: 'update',
      },
    },
    tabs: {
      reload(tabId, reloadProperties, callback) {
        if (!(tabs.reload instanceof Function)) {
          if (callback instanceof Function) callback();
          return;
        }

        if (typeof tabId === 'function') {
          callback = tabId;
          tabId = undefined;
          reloadProperties = undefined;
        } else if (typeof reloadProperties === 'function') {
          callback = reloadProperties;
          reloadProperties = undefined;
        }

        if (tabId !== undefined) {
          callWithOptionalCallback(tabs, tabs.reload, [tabId, reloadProperties], callback);
          return;
        }

        queryTabs({ active: true, currentWindow: true }, (foundTabs) => {
          const activeTab = foundTabs[0];
          if (!activeTab || activeTab.id === undefined) {
            if (callback instanceof Function) callback();
            return;
          }
          callWithOptionalCallback(tabs, tabs.reload, [activeTab.id, reloadProperties], callback);
        });
      },
    },
    getPortKey,
  };
}(globalThis));
