const CACHE='sam-v1';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>
if(e.request.method!=='GET')return;
e.respondWith(
caches.open(CACHE).then(cache=>
cache.match(e.request).then(cached=>{
const fetched=fetch(e.request).then(res=>{
if(res&&res.status===200)cache.put(e.request,res.clone());
return res;
).catch(()=>cached);
return cached||fetched;
})
)
);
});
