(function () {
  'use strict';

  const runtime = (globalThis.browser || globalThis.chrome).runtime;

  function getInjectionRoot() {
    return document.head || document.documentElement;
  }

  function injectScript(path, callback) {
    const root = getInjectionRoot();
    if (!root) {
      window.requestAnimationFrame(() => injectScript(path, callback));
      return;
    }

    const script = document.createElement('script');
    script.src = runtime.getURL(path);
    script.async = false;
    script.onload = () => {
      script.remove();
      if (callback instanceof Function) callback();
    };
    root.appendChild(script);
  }

  injectScript('src/scripts/seed.js', () => {
    injectScript('src/scripts/inject.js');
  });
}());
