import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import test from 'node:test';
import crypto from 'node:crypto';
const code = fs.readFileSync(new URL('../assets/ads-measurement.js', import.meta.url), 'utf8');
function page(initial = '', host = 'heimstart.de', failFetch = false) {
  const jar = new Map(initial.split(';').filter(Boolean).map(p=>p.trim().split('=')));
  const requests = [], images = [], listeners = {};
  const document = {
    get cookie() { return [...jar].map(p=>p.join('=')).join('; '); },
    set cookie(value) {
      const [pair,...attributes]=value.split(';'); const [name,valuePart] = pair.split('=');
      if (attributes.some(a=>a.trim()==='Max-Age=0')) jar.delete(name); else jar.set(name,valuePart);
    }
  };
  const window = {addEventListener(name,cb) { listeners[name]=cb; }, fetch(url,options) { requests.push({url:new URL(url),options}); return failFetch ? Promise.reject(new Error('transport unavailable')) : Promise.resolve({status:202,ok:true,json:()=>Promise.resolve({accepted_events:1})}); }};
  class TestImage { set src(value) { images.push(new URL(value)); } }
  vm.runInNewContext(code,{window,document,crypto,URL,Image:TestImage,location:{hostname:host,origin:`https://${host}`,href:`https://${host}/?oppref=gAAAAAtest_1&email=private&income=6200`}});
  return {window,document,requests,images,listeners,jar,api:window.HEIMSTART_ADS};
}
test('old GA consent and no marketing consent send nothing or store click references',()=>{
  for(const cookie of ['', 'heimstart_analytics_v1=accepted', 'heimstart_ads_v1=rejected']) {
    const p=page(cookie); assert.equal(p.requests.length,0); assert.equal(p.window.oaiq,undefined);
    assert.equal(p.api.send('store_click','apple'),false); assert.equal(p.jar.has('heimstart_ads_ref_v1'),false);
  }
});
test('independent consent emits allowlisted events without SDK, financial data or contacts',()=>{
  const p=page(); p.api.decide(true); p.api.decide(true);
  assert.equal(p.api.send('store_click','apple'),true); assert.equal(p.api.send('store_click','google'),true);
  assert.equal(p.api.send('leitfaden_download','teil-1'),true);
  assert.equal(p.api.send('registration_completed'),false); assert.equal(p.api.send('app_installed'),false);
  assert.equal(p.api.send('store_click','private'),false); assert.equal(p.api.send('leitfaden_download','private'),false);
  const events=p.requests.map(r=>JSON.parse(r.options.body).events[0]);
  assert.equal(events.filter(e=>e.type==='page_viewed').length,1);
  assert.deepEqual(events.filter(e=>e.type==='custom').map(e=>e.custom_event_name),['store_click','store_click','leitfaden_download']);
  assert.ok(p.requests.every(r=>r.options.keepalive && r.options.credentials==='omit' && r.options.referrerPolicy==='origin' && r.options.referrer==='https://heimstart.de/'));
  assert.ok(p.requests.every(r=>!JSON.stringify(r).includes('6200')&&!JSON.stringify(r).includes('private')&&!JSON.stringify(r).includes('email')));
  assert.ok(p.requests.every(r=>r.options.method==='POST' && r.options.headers['Content-Type']==='text/plain')); 
  assert.equal(new Set(events.map(e=>e.id)).size,4);
  assert.equal(p.jar.get('heimstart_ads_ref_v1'),'gAAAAAtest_1');
  assert.ok(events.every(e=>e.oppref==='gAAAAAtest_1' && e.source_url==='https://heimstart.de' && e.opt_out===true));
});
test('withdrawal removes attribution cookies and blocks subsequent sends',()=>{
  const p=page('heimstart_ads_v1=accepted; __obref=test; __oppref=test');
  p.api.send('store_click','google'); const previous=p.requests.length; p.api.decide(false);
  assert.equal(p.jar.has('__obref'),false); assert.equal(p.jar.has('__oppref'),false); assert.equal(p.jar.has('heimstart_ads_ref_v1'),false);
  assert.equal(p.api.send('store_click','google'),false); assert.equal(p.requests.length,previous);
});
test('revocation in another tab is respected immediately and on focus',()=>{
  const p=page('heimstart_ads_v1=accepted'); p.jar.set('heimstart_ads_v1','rejected');
  assert.equal(p.api.send('store_click','apple'),false); p.listeners.focus();
  assert.equal(p.jar.has('heimstart_ads_ref_v1'),false);
});
test('local previews do not transmit production measurement',()=>{
  const p=page('heimstart_ads_v1=accepted','127.0.0.1'); assert.equal(p.requests.length,0); assert.equal(p.api.send('store_click','apple'),false);
});

test('failed fetch uses the same event ID for its image fallback', async()=>{
  const p=page('', 'heimstart.de', true); p.api.decide(true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.images.length,1);
  assert.equal(p.images[0].searchParams.get('event_id'),JSON.parse(p.requests[0].options.body).events[0].id);
});
test('withdrawal cancels a pending fallback after transport failure', async()=>{
  const p=page('', 'heimstart.de', true); p.api.decide(true); p.api.decide(false);
  await new Promise(resolve=>setImmediate(resolve)); assert.equal(p.images.length,0);
});
