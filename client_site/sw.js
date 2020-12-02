const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/favicon.ico',
    '/pg/signin.html',
    '/css/app.css',
    '/js/appcode.js',
    '/images/nails-intro.png',
    '/images/icons/nails-512x512.png',
    '/images/icons/nails-256x256.png',
    '/images/icons/nails-192x192.png',
    '/images/icons/nails-180x180.png',
    '/images/icons/nails-152x152.png',
    '/images/icons/nails-144x144.png',
    '/images/icons/nails-128x128.png',
    '/images/icons/nails-120x120.png',
    '/images/icons/nails-96x96.png',
    '/images/icons/nails-48x48.png'
];

const CACHE_NAME = 'app-cache-v20';

self.addEventListener('install', event => {
    event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
        //console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
    }));
    // don't wait
    self.skipWaiting();
});
self.addEventListener('activate', event => {
    // delete any caches that aren't in expectedCaches
    event.waitUntil(
            caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => {
            if (key !== CACHE_NAME && key.startsWith("app-cache-")) {
                //console.log('[ServiceWorker] Removing old cache', key);
                return caches.delete(key);
            }
        }));
    }));
    self.clients.claim();
});


var deparam = function (querystring) {
    // remove any preceding url and split
    querystring = querystring.substring(querystring.indexOf('?') + 1).split('&');
    var params = {}, pair, d = decodeURIComponent, i;
    // march and parse
    for (i = 0; i < querystring.length; i++) {
        pair = querystring[i].split('=');
        if (typeof (params[d(pair[0])]) !== 'undefined') {
            pair[1] = params[d(pair[0])] + "," + pair[1];
        }
        params[d(pair[0])] = d(pair[1]);
    }

    return params;
}; //--  fn  deparam

var getRequest = function (request, dataOpt) {
    const req_options = {
        ignoreSearch: false,
        ignoreMethod: true,
        ignoreVary: true
    };

    return new Promise((resolve, reject) => (dataOpt.cacheFirst ? resolve() : reject()))
            .then(() => {
                //console.log('[ServiceWorker] Cache Get', request.url);
                return caches.open(dataOpt.cachename).then((cache) => {
                    return cache.match(request.url, req_options).then((response) => {
                        if (response) {
                            return response;
                        }
                        return Promise.reject(new Error("X001"));
                    });
                });
            })
            .catch(err => {
                // whatever the error !!!
                //console.log('[ServiceWorker] Network Fetch', request.url);
                return fetch(request)
                        .then((response) => {
                            // If the response was good, clone it and store it in the cache.
                            //if (response.status === 200) {
                            if (response && response.ok && dataOpt.cache) {
                                let resp_Clone = response.clone();
                                caches.open(dataOpt.cachename).then((cache) => {
                                    cache.put(request.url, resp_Clone);
                                });
                            }
                            // -- SHOULD NOT return the network error
                            return response;
                        })
                        //.then(response => response.json())
                        .catch((err) => {
                            // Network request failed, try to get it from the cache.
                            if (!dataOpt.defaultToCache) {
                                const resp_options = {
                                    type: "basic",
                                    url: request.url,
                                    redirected: false,
                                    status: 404,
                                    ok: false,
                                    statusText: "NOT FOUND",
                                    headers: {
                                        //'Content-Type': 'application/json'
                                        'Content-Type': 'text/plain'
                                    }
                                };
                                //const jsonResponse = new Response('{}', options);
                                if (!dataOpt.suppressErrors) {
                                    return new Response(err.message, resp_options);
                                }
                                // NOTE : does NOT retrun an error
                                return new Response("NO-Data", resp_options);
                            }
                            caches.open(dataOpt.cachename).then((cache) => {
                                return cache.match(request.url, req_options).then((response) => {
                                    return response;
                                });
                            });
                        });
            });
};

/*
 * ====================================================================================
 * @param {type} event
 * @returns {undefined}
 * 
 * For JQUERY: the first return must be a respondWith !!!!!
 * ====================================================================================
 */

var proccmd = function (event) {
    const url = new URL(event.request.url);
    let fObj = deparam(url.search);

    if (event.request.method === "POST"
            || (typeof (fObj.direct) !== 'undefined' && fObj.direct === '0')) {
        return fetch(event.request);
    } else {
        return getRequest(event.request,
                {"cacheFirst": true, "cache": true, "defaultToCache": true,
                    "cachename": CACHE_NAME, "suppressErrors": true});
    }
};
self.addEventListener('fetch', event => {
    event.respondWith(proccmd(event));
    // serve the cat SVG from the cache if the request is
    // same-origin and the path is '/dog.svg'
});

// Listen to `push` notification event. Define the text to be displayed
// and show the notification.
// Register event listener for the 'push' event.
self.addEventListener('push', function(event) {
  // Retrieve the textual payload from event.data (a PushMessageData object).
  // Other formats are supported (ArrayBuffer, Blob, JSON), check out the documentation
  // on https://developer.mozilla.org/en-US/docs/Web/API/PushMessageData.
  const payload = event.data ? event.data.text() : 'no payload';

  // Keep the service worker alive until the notification is created.
  event.waitUntil(
    // Show a notification with title 'ServiceWorker Cookbook' and use the payload
    // as the body.
    self.registration.showNotification('Nailz', {
      body: payload,
      badge: '/images/icons/nails-128x128.png',
      icon: '/images/icons/nails-128x128.png'
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  const clickedNotification = event.notification;
  clickedNotification.close();

  // Do something as the result of the notification click
  //const promiseChain = doSomething();
  //event.waitUntil(promiseChain);
});
// Listen to  `pushsubscriptionchange` event which is fired when
// subscription expires. Subscribe again and register the new subscription
// in the server by sending a POST request with endpoint. Real world
// application would probably use also user identification.
/*self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Subscription expired');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
    .then(function(subscription) {
      console.log('Subscribed after expiration', subscription.endpoint);
      return fetch('register', {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          userid:"allusers"
        })
      });
    })
  );
});*/