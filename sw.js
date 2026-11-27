// Swing Links offline cache
const V='swing-links-v2';
const CORE=['./','index.html','golf.html','baseball.html','bowling.html','tennis.html','vendor/three.min.js','manifest.json','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  const isPage=req.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/');
  const isFont=url.hostname.includes('fonts.googleapis.com')||url.hostname.includes('fonts.gstatic.com');
  if(isPage){ // fresh when online, cached when offline
    e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(V).then(c=>c.put(req,cp));return r}).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
    return}
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(r=>{if(r.ok||isFont){const cp=r.clone();caches.open(V).then(c=>c.put(req,cp))}return r}).catch(()=>hit)));
});
