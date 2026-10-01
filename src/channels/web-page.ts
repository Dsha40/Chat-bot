/** Small demo chat page, handy to show the assistant to doctors before connecting WhatsApp. */
export function webChatPage(clinicName: string): string {
  const name = clinicName.replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} — Asistente</title>
<style>
:root{--bg:#efeae2;--me:#d9fdd3;--bot:#fff;--ink:#111b21;--muted:#667781;--bar:#008069}
@media (prefers-color-scheme:dark){:root{--bg:#0b141a;--me:#005c4b;--bot:#202c33;--ink:#e9edef;--muted:#8696a0;--bar:#202c33}}
*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui,sans-serif;background:var(--bg);color:var(--ink);display:flex;flex-direction:column;height:100dvh}
header{background:var(--bar);color:#fff;padding:12px 16px;font-weight:600}
#log{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:6px}
.m{max-width:80%;padding:7px 10px;border-radius:8px;white-space:pre-wrap;box-shadow:0 1px .5px rgba(0,0,0,.13)}
.u{align-self:flex-end;background:var(--me)}.b{align-self:flex-start;background:var(--bot)}
.t{align-self:center;color:var(--muted);font-size:13px}
form{display:flex;gap:8px;padding:10px 16px;background:var(--bar)}
input{flex:1;padding:10px 12px;border-radius:20px;border:0;font:inherit}
button{border:0;border-radius:20px;padding:0 16px;background:#25d366;color:#fff;font-weight:600}
</style></head><body>
<header>${name}</header><div id="log"></div>
<form id="f"><input id="i" autocomplete="off" placeholder="Escribe un mensaje" required><button>Enviar</button></form>
<script>
const log=document.getElementById('log'),f=document.getElementById('f'),i=document.getElementById('i');
let sid;try{sid=localStorage.getItem('sid')}catch{}if(!sid){sid=crypto.randomUUID();try{localStorage.setItem('sid',sid)}catch{}}
function add(t,c){const d=document.createElement('div');d.className='m '+c;d.textContent=t;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
f.onsubmit=async e=>{e.preventDefault();const text=i.value.trim();if(!text)return;i.value='';add(text,'u');const w=add('escribiendo…','t');
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid,text})});
const j=await r.json();w.remove();(j.replies||[]).forEach(t=>add(t,'b'));if(!j.replies?.length)add('(el equipo de la clínica continuará la conversación)','t')}
catch{w.textContent='Error de conexión'}};
</script></body></html>`;
}
