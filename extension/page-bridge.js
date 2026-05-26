(function () {
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window || message?.source !== "orbita-spend-sync" || message?.type !== "ORBITA_AJAX_REQUEST") {
      return;
    }

    const { id, path, payload } = message;
    if (!window.$?.ajax) {
      window.postMessage({
        source: "orbita-spend-sync",
        type: "ORBITA_AJAX_RESPONSE",
        id,
        ok: false,
        error: "Orbita page ajax is not available"
      }, "*");
      return;
    }

    window.$.ajax(path, {
      data: payload,
      method: "POST",
      success: (data) => {
        window.postMessage({
          source: "orbita-spend-sync",
          type: "ORBITA_AJAX_RESPONSE",
          id,
          ok: true,
          data
        }, "*");
      },
      error: (xhr) => {
        window.postMessage({
          source: "orbita-spend-sync",
          type: "ORBITA_AJAX_RESPONSE",
          id,
          ok: false,
          error: `${path} failed ${xhr?.status || ""}: ${xhr?.responseText || ""}`
        }, "*");
      }
    });
  });
})();
