/*global digitalData,YT*/
var digitalData = digitalData || {};
digitalData._log = digitalData._log || [];

var debug = function () {
  if (! window.console || ! console.log) {
    return;
  }
  return Function.prototype.bind.call(console.log, console);
} ();
/**
 * Update the Instance Variable with the new functionality
 * @param measure {function} The original function with page data
 * @param measure.q {Array}
 */
var measure = (function (measure) {
  /**
   * New function to operate the gathered data
   * @method measureInterface
   * @param data {object} Object with data to measure
   */
  var measureInterface = function (data) {
    var digitalDataSnapshot;
    if (typeof data.event !== "undefined") {
      measureInterface._fired = true;
      digitalData = measureInterface._deepMerge(digitalData, data);
      digitalDataSnapshot = JSON.parse(JSON.stringify(digitalData));
      delete digitalDataSnapshot._log;
      debug("Event captured. Available data:");
      debug(JSON.stringify(digitalDataSnapshot, null, 4));
      debug("---------------------------------------------");
      data._timestamp = new Date().getTime();
      digitalData._log.push(data);
      measureInterface._process(data);
    } else {
      throw "Missing Event ID";
    }
  };

  /**
   * Fired flag to fallback to the automatic URL-based measurement
   * @private
   */
  measureInterface._fired = false;

  /**
   * Function to merge objects recursively
   * @param target
   * @param src
   * @returns {boolean|*|Boolean|Array|{}}
   * @private
   */
  measureInterface._deepMerge = function (target, src) {
    var isArray = Array.isArray(src);
    var dst = isArray && src || {};

    if (!isArray) {
      if (target && typeof target === "object") {
        Object.keys(target).forEach(function (key) {
          dst[key] = target[key];
        })
      }
      Object.keys(src).forEach(function (key) {
        if (typeof src[key] !== "object" || !src[key]) {
          dst[key] = src[key];
        }
        else {
          if (!target[key]) {
            dst[key] = src[key];
          } else {
            dst[key] = measureInterface._deepMerge(target[key], src[key]);
          }
        }
      });
    }

    return dst;
  };

  /**
   * Default measure process function to override
   * @method _process
   * @private
   * @param data {object} Object with data to measure
   * @param data.contact {String}
   * @param data.error {String}
   * @param data.fileNAme {String}
   * @param data.username {String}
   */
  measureInterface._process = function (data) {
    dataLayer.push(data);
  };
  return measureInterface;
}(measure));

/*
 * Init Youtube Iframe API
 */
(function() {
  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
})();


/*
 * Global Variable for available Youtube players
 */
var youtubePlayers = [],
  youtubePlayerIframes = [];

/*
 * Refresh iframes without enabled API
 */
function refreshIframeAPI() {
  for (var iframes = document.getElementsByTagName("iframe"), i = iframes.length; i--;) {
    if (/youtube.com\/embed/.test(iframes[i].src)) {
      youtubePlayerIframes.push(iframes[i]);
      if (iframes[i].src.indexOf('enablejsapi=') === -1) {
        iframes[i].src += (iframes[i].src.indexOf('?') === -1 ? '?' : '&') + 'enablejsapi=1';
      }
    }
  }
}

function onYouTubeIframeAPIReady() {
  refreshIframeAPI();
  for (var i = 0; i < youtubePlayerIframes.length; i++) {
    youtubePlayers.push(new YT.Player(youtubePlayerIframes[i], {
      events: {
        "onStateChange": onPlayerStateChange
      }
    }));
  }
}

function onPlayerStateChange(event) {
  var videoData;
  videoData = event.target.getVideoData();
  switch (event.data) {
  case YT.PlayerState.PLAYING:
    measure({event: "videoPlay", video: {id: videoData.video_id, title: videoData.title}});
    break;
  case YT.PlayerState.PAUSED:
    measure({event: "videoPause", video: {id: videoData.video_id, title: videoData.title, timePlayed: event.target.getCurrentTime()}});
    break;
  case YT.PlayerState.ENDED:
    measure({event: "videoEnd", video: {id: videoData.video_id, title: videoData.title, timePlayed: event.target.getCurrentTime()}});
    break;
  }
}
