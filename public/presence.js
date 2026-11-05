// Each visible game tab is one presence client. Hidden/suspended tabs go offline.
export function installPresence(onAccount){
  const clientId=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');let inFlight=false;
  async function heartbeat(offline=false){
    if(inFlight&&!offline)return;if(!offline)inFlight=true;
    try{const r=await fetch('/api/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId,state:offline||document.hidden?'offline':'online'}),keepalive:offline});if(r.ok&&!offline){const data=await r.json();onAccount?.(data.account);}else if(r.status===401&&!offline)location.reload();}catch{}finally{if(!offline)inFlight=false;}
  }
  void heartbeat();setInterval(()=>{if(!document.hidden)void heartbeat();},20000);
  document.addEventListener('visibilitychange',()=>void heartbeat(document.hidden));
  window.addEventListener('pagehide',()=>void heartbeat(true));window.addEventListener('pageshow',()=>void heartbeat());window.addEventListener('online',()=>void heartbeat());
}
