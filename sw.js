/* Indulge CRM service worker (Nov 27 2026, slow connections). Published next to index.html by encrypt_page.py --split-pages.
   It only touches this site's own files and cannot decrypt anything:
   - c/app-*.bin, c/data-*.bin: encrypted, content-named files that never change -> saved copy first, else network.
   - the page itself (index): saved copy first, refreshed in the background; ?crm_fresh=... -> network, then saved.
   - everything else (crm-sync Worker API, icons, other query strings): straight to the network.
   KILL=true (written when publishing falls back to the single-file page) deletes the saved copies and unregisters. */
var KILL=false,FILES='crm-files-v1',SHELL='crm-shell-v1';
self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return /^crm-/.test(k)&&(KILL||(k!==FILES&&k!==SHELL));}).map(function(k){return caches.delete(k);}));
  }).then(function(){return KILL?self.registration.unregister():self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  if(KILL)return;
  var req=e.request;if(req.method!=='GET')return;
  var u=new URL(req.url);if(u.origin!==self.location.origin)return;
  var scope=new URL(self.registration.scope);if(u.pathname.indexOf(scope.pathname)!==0)return;
  var rel=u.pathname.slice(scope.pathname.length);
  if(/^c\/(app|data)-[A-Za-z0-9_-]+\.bin$/.test(rel)){
    if(u.search)return;   /* ?s=0: fetched on the sign-in page while signed out -> never saved */
    e.respondWith(caches.open(FILES).then(function(c){return c.match(u.pathname).then(function(hit){
      return hit||fetch(req).then(function(r){if(r.ok&&r.status===200)c.put(u.pathname,r.clone());return r;});});}));
    return;
  }
  if(rel!==''&&rel!=='index.html')return;
  var key=scope.href;
  if(u.searchParams.has('crm_fresh')){
    e.respondWith(fetch(req.url,{cache:'no-store'}).then(function(r){
      if(r.ok&&r.status===200){var cl=r.clone();e.waitUntil(caches.open(SHELL).then(function(c){return c.put(key,cl);}));}return r;}));
    return;
  }
  if(u.search)return;
  e.respondWith(caches.open(SHELL).then(function(c){return c.match(key).then(function(hit){
    var net=fetch(req).then(function(r){if(r.ok&&r.status===200&&r.type==='basic')return c.put(key,r.clone()).then(function(){return r;});return r;});
    if(hit){e.waitUntil(net.catch(function(){}));return hit;}
    return net;});}));
});
