const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const QR = require('./vendor/QRCode');
const port = Number(process.env.PORT || 8080);
function lanAddress(){try{return Object.values(os.networkInterfaces()).flat().find(i=>i.family==='IPv4'&&!i.internal)?.address}catch{return null}}
const ip=process.env.LAN_IP||lanAddress()||'127.0.0.1';
const room = randomUUID().slice(0,8);
const join = 'http://' + ip + ':' + port + '/join/' + room;
const roles = {driver:null, runner:null,dispatcher:null};
const controls = {driver:['ShiftLeft','ArrowUp','ArrowLeft','ArrowRight','ArrowDown'],dispatcher:[],runner:['KeyW','KeyA','KeyD','KeyS']};
let map=null,order=null, muni='F line · Live arrival unavailable';
async function refreshArrival(){
 if(!process.env.MUNI_511_KEY)return;
 try{
  const q=new URLSearchParams({api_key:process.env.MUNI_511_KEY,agency:'SF',MonitoringRef:'14513',format:'json'});
  const res=await fetch('https://api.511.org/transit/StopMonitoring?'+q,{signal:AbortSignal.timeout(5000)});
  const data=await res.json();
  const delivery=data.ServiceDelivery?.StopMonitoringDelivery;
  const visits=(Array.isArray(delivery)?delivery[0]:delivery)?.MonitoredStopVisit||[];
  const arrivals=visits.map(v=>v.MonitoredVehicleJourney).filter(j=>j?.LineRef==='F').map(j=>Date.parse(j.MonitoredCall?.ExpectedArrivalTime)).filter(t=>t>=Date.now());
  muni=arrivals.length?'F line · Ferry Building '+new Date(Math.min(...arrivals)).toLocaleTimeString('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit'})+' PT':'F line · No upcoming prediction';
 }catch{muni='F line · Live arrival unavailable'}
}
refreshArrival();setInterval(refreshArrival,60000).unref();
const qr = new QR(-1,1);
qr.addData(join); qr.make();
const size = qr.getModuleCount()+8;
let pixels='';
for(let y=0;y<size-8;y++) for(let x=0;x<size-8;x++) if(qr.isDark(y,x)) pixels+='M'+(x+4)+' '+(y+4)+'h1v1h-1z';
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="'+pixels+'"/></svg>';
function page(name){return fs.readFileSync(path.join(__dirname,name),'utf8')}
// Serialize refreshes so a later round always reaches the published memory.
let refreshing=false,queued=false;
function refreshMemory(){
  queued=true;
  if(refreshing)return;
  refreshing=true;
  const {execFile}=require('node:child_process');
  function run(){
    queued=false;
    execFile('bruin',['run','./analysis/pipeline.yml'],{cwd:__dirname,timeout:120000},(error)=>{
      if(error)console.warn('Bruin refresh unavailable:',error.code);
      if(queued)run();else refreshing=false;
    });
  }
  run();
}
const server=http.createServer(async(req,res)=>{
  function send(code,body,type='application/json'){res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store'});res.end(type==='application/json'?JSON.stringify(body):body)}
  const url=req.url;
  if(req.method==='GET' && url==='/') return send(200,page('host.html').replaceAll('JOIN_URL',join).replaceAll('ROOM_ID',room),'text/html');
  if(req.method==='GET' && url==='/qr.svg') return send(200,svg,'image/svg+xml');
  if(req.method==='GET' && url==='/join/'+room) return send(200,page('phone.html').replaceAll('ROOM_ID',room),'text/html');
  if(!url.startsWith('/'+room+'/')) return send(404,{});
  if(req.method==='GET' && url.endsWith('/history'))return send(200,fs.existsSync(path.join(__dirname,'route-memory.json'))?JSON.parse(page('route-memory.json')):null);
  if(req.method==='GET'&&url.endsWith('/map'))return send(200,{map,muni});
  const now=Date.now();
  for(const r of Object.keys(roles)) if(roles[r] && now-roles[r].seen>5000) roles[r]=null;
  if(req.method==='GET' && url.endsWith('/state')) return send(200,{order,muni,...Object.fromEntries(Object.entries(roles).map(([r,p])=>[r,p?{keys:now-p.seen<600?p.keys:[],jump:p.jump}:null]))});
  if(req.method!=='POST'||req.headers['content-type']!=='application/json')return send(400,{});
  try{
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)return send(413,{})}
    const data=JSON.parse(raw);
    if(url.endsWith('/map')){
      const point=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
      if(typeof data.active!=='boolean'||!point(data.cab)||(data.pickup!==null&&!point(data.pickup))||!Array.isArray(data.queue)||data.queue.length>12||!data.queue.every(point))return send(400,{});
      map=data;return send(200,{});
    }
    if(url.endsWith('/round') && ['market','quay'].includes(data.route)){fs.appendFileSync(path.join(__dirname,'rounds.ndjson'),JSON.stringify({route:data.route,corner:typeof data.corner==='string'?data.corner.slice(0,60):null,open:Array.isArray(data.open)?data.open.filter(k=>['market','quay'].includes(k)):[]})+'\n');refreshMemory();return send(200,{})}
    const {role,token,keys,jump,seq}=data;
    if(!Object.hasOwn(roles,role))return send(400,{});
    if(url.endsWith('/claim')){
      if(roles[role])return send(409,{});
      roles[role]={token:randomUUID(),publicId:randomUUID(),seen:now,keys:[],jump:'',seq:0};
      return send(200,{token:roles[role].token});
    }
    const p=roles[role];
    if(!p||p.token!==token)return send(403,{});
    if(url.endsWith('/reroute')&&role==='dispatcher'){
      if(!map?.active||!map.towTarget||data.roundId!==map.roundId)return send(409,{});
      order={id:randomUUID(),type:'reroute',roundId:map.roundId};return send(200,{});
    }
    if(url.endsWith('/dispatch')&&role==='dispatcher'&&Number.isInteger(data.corner)&&data.corner>=0&&data.corner<3){
      order={id:randomUUID(),corner:data.corner};p.seen=now;return send(200,{});
    }
    if(url.endsWith('/input')&&Array.isArray(keys)&&Number.isSafeInteger(seq)&&Number.isSafeInteger(jump)){
      if(seq>p.seq){p.seq=seq;p.keys=controls[role].filter(k=>keys.includes(k));p.jump=jump?p.publicId+'-'+jump:'';p.seen=Date.now()}
      return send(200,{})
    }
    send(404,{})
  }catch{send(400,{})}
});
server.listen(port,'0.0.0.0',()=>console.log('Projector: http://localhost:'+port+'   Phones: '+join));
