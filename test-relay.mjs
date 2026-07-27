const B='wss://gum-drop-hop.neodevils-contact.workers.dev';
const room='t'+Date.now();
const log=[];
const open=u=>new Promise((res,rej)=>{const w=new WebSocket(u);w.onopen=()=>res(w);w.onerror=e=>rej(new Error('ws error'));});
const a=await open(`${B}/ws?room=${room}`);
a.onmessage=e=>log.push(['A',e.data]);
await new Promise(r=>setTimeout(r,400));
const b=await open(`${B}/api/ws?room=${room}`);   // second peer uses the Discord-style path
b.onmessage=e=>log.push(['B',e.data]);
await new Promise(r=>setTimeout(r,600));
b.send(JSON.stringify({t:'key',code:'ArrowLeft',down:true}));   // viewer -> host
await new Promise(r=>setTimeout(r,600));
a.send(JSON.stringify({t:'offer',d:'sdp-here',to:2}));          // host -> that viewer only
await new Promise(r=>setTimeout(r,600));
b.close();
await new Promise(r=>setTimeout(r,600));
for(const [w,m] of log) console.log(w,m);
a.close();
