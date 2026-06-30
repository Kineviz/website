/*
 * hero-video-fix.js
 * The Squarespace static export ships the background-video hero as AES-128
 * encrypted HLS whose playlists point at expiring signed CDN URLs and rely on
 * a client-side fetch monkeypatch (rerouter.js). That chain does not work off
 * Squarespace, so the hero renders black ("Unable to load video").
 *
 * This replaces each native video-background block with a self-hosted MP4
 * (remuxed from the local .ts segments) played directly — no HLS, no MSE,
 * no CDN dependency.
 */
(function () {
  // systemDataId suffix -> self-hosted mp4 (root-absolute so it works at any URL depth)
  var MAP = {
    "9d03c46c": "/images/hero-9d.mp4",
    "f3107ccb": "/images/hero-f3.mp4"
  };

  function mp4For(block) {
    var cfg = block.getAttribute("data-config-native-video") || "";
    var m = cfg.match(/"systemDataId"\s*:\s*"[0-9a-f-]*?([0-9a-f]{8})"/);
    return m ? MAP[m[1]] : null;
  }

  function takeover(block) {
    if (block.__heroFixed) return;
    var src = mp4For(block);
    if (!src) return;
    block.__heroFixed = true;

    var v = document.createElement("video");
    v.src = src;
    v.muted = true;
    v.defaultMuted = true;
    v.autoplay = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("muted", "");
    v.setAttribute("autoplay", "");
    v.setAttribute("loop", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("preload", "auto");
    v.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border:0;";

    block.innerHTML = "";
    if (getComputedStyle(block).position === "static") {
      block.style.position = "absolute";
    }
    block.appendChild(v);

    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function run() {
    var blocks = document.querySelectorAll(".sqs-video-background-native");
    for (var i = 0; i < blocks.length; i++) takeover(blocks[i]);
  }

  function init() {
    run();
    // Re-assert in case the Squarespace player initializes after us.
    var n = 0;
    var t = setInterval(function () {
      run();
      if (++n >= 8) clearInterval(t);
    }, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
