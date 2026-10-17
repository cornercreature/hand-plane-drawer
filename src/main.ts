import './style.css';
import {WIDTH,HEIGHT,LIMIT,validQuad,movement,contains,cameraPoint,demoQuad,svgDocument,parseProject,stabilizePlane,planeFaces} from './geometry.mjs';
import type {HandLandmarker,NormalizedLandmark} from '@mediapipe/tasks-vision';
type Point={x:number;y:number};
type Style={color:string;edge:string;fill:boolean;opacity:number;width:number;thickness?:number};
type Plane={points:Point[];style:Style;stroke:number};
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const cameraIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3z"/></svg>';
$('app').innerHTML=`
<header class="app-header"><div class="brand"><svg viewBox="0 0 36 36" fill="none" stroke="#d6f39a" stroke-width="1.3"><path d="m4 12 20-7 8 19-21 7Z"/><path d="m4 12 25 3-18 16M24 5l5 10 3 9"/></svg><span class="wordmark">plane</span><small>A studio for your hands.</small></div><div class="header-right"><span class="quiet">Creative tools / 001</span><span class="badge">EXPERIMENTAL</span></div></header>
<main class="workspace"><section class="drawing-area" aria-label="Drawing workspace"><div class="toolbar"><div class="segmented" aria-label="Workspace mode"><button id="draw-mode" aria-pressed="true">✧ Draw</button><button id="edit-mode" aria-pressed="false">↖ Edit</button></div><div class="tool-actions"><button id="undo" title="Undo (⌘/Ctrl Z)">↶ Undo</button><button id="redo" title="Redo (⌘/Ctrl Shift Z)">↷</button><button id="clear">Clear</button></div></div>
<div class="stage-wrap"><div class="stage"><canvas id="canvas" width="1200" height="800" aria-label="Plane drawing canvas. Use the camera or drag in demo mode." tabindex="0"></canvas><div id="welcome" class="onboarding"><svg class="hand-diagram" viewBox="0 0 170 91" fill="none"><path d="m28 26 113 13-13 42L39 64Z" fill="#d6f39a" fill-opacity=".055" stroke="#a4bc80" stroke-width=".8"/><path d="M28 26 39 64M141 39l-13 42" stroke="#d6f39a" stroke-width="2"/><path d="M3 62 8 37q1-5 6-3l14-8M5 80l19-17q5-4 15 1M168 55l-9-25q-2-5-6-2l-12 11M165 85l-18-7q-8-3-19 3" stroke="#8e9d7d" stroke-width="1.5" stroke-linecap="round"/><g fill="#d6f39a"><circle cx="28" cy="26" r="3"/><circle cx="141" cy="39" r="3"/><circle cx="128" cy="81" r="3"/><circle cx="39" cy="64" r="3"/></g></svg><span class="eyebrow">Four fingertips. Infinite forms.</span><h1>Draw in the space<br><span>between your hands.</span></h1><p>Your thumbs and index fingers become four corners. Move your hands. Leave a little geometry behind.</p><button id="start" class="primary">${'Enable camera'} &nbsp; ↗</button><button id="demo" class="text-button">Or explore with your mouse →</button></div><div id="countdown" class="countdown" aria-live="polite"></div></div></div>
<div class="stage-footer"><div class="status"><i id="status-dot" class="dot"></i><span id="status" role="status">Your canvas is ready</span></div><span id="stats">0 planes · 0 strokes</span></div><p id="hint" class="keyboard-hint"><kbd>Space</kbd> start / pause &nbsp; · &nbsp; <kbd>⌘ Z</kbd> undo &nbsp; · &nbsp; made with movement</p></section>
<aside class="sidebar"><section class="section"><div class="section-title">Input <span>01</span></div><div class="camera-label">${cameraIcon}<span id="input-label">Webcam · two hands</span></div><button id="camera" class="full">Enable camera</button><div class="input-row"><label for="camera-opacity">Camera visibility</label><output id="camera-opacity-value">25%</output></div><input id="camera-opacity" type="range" min="0" max="80" value="25"><button id="record" class="primary full">Start drawing <span style="opacity:.6">/ Space</span></button><p id="input-note" class="note">Keep both thumbs and index fingers in view. Your camera stays on your device.</p></section>
<section class="section"><div class="section-title">Plane brush <span>02</span></div><div class="swatches" aria-label="Color palette">${['#d6f39a','#c2b6ed','#efac83','#95ced3','#e9e7df'].map((c,i)=>`<button data-color="${c}" aria-label="${['Lime','Lavender','Apricot','Ice','Chalk'][i]}" aria-pressed="${i===0}" style="background:${c}"></button>`).join('')}</div><div class="input-row"><div class="color-row"><input type="color" id="fill-color" value="#d6f39a" aria-label="Fill color"><span class="swatch-label">Fill</span></div><div class="color-row"><input type="color" id="edge-color" value="#d6f39a" aria-label="Edge color"><span class="swatch-label">Edge</span></div></div><label class="input-row" for="brush-style">Surface</label><select id="brush-style" class="select"><option value="filled">Translucent + outline</option><option value="wire">Wireframe</option><option value="solid">Solid</option></select><div class="input-row"><label for="opacity">Fill opacity</label><output id="opacity-value">12%</output></div><input id="opacity" type="range" min="1" max="100" value="12"><div class="input-row"><label for="spacing">Plane spacing</label><output id="spacing-value">18 px</output></div><input id="spacing" type="range" min="4" max="600" value="18"><div class="input-row"><label for="thickness">Plane thickness</label><output id="thickness-value">1 px</output></div><input id="thickness" type="range" min="1" max="30" value="1"><div class="input-row"><label for="smoothing">Hand smoothing</label><output id="smoothing-value">65%</output></div><input id="smoothing" type="range" min="0" max="90" value="65"><div id="edit-tools" hidden><p class="note" id="selection">Click a plane to select its stroke. Drag to move.</p><div class="edit-tools"><button id="apply-style">Apply brush</button><button id="delete">Delete stroke</button></div></div></section>
<section class="section"><div class="section-title">Export artwork <span>03</span></div><label class="input-row"><span>Transparent background</span><input id="transparent" type="checkbox" checked></label><label class="input-row" for="resolution">PNG resolution</label><select id="resolution" class="select"><option value="1">1200 × 800</option><option value="2" selected>2400 × 1600</option><option value="3">3600 × 2400</option></select><div class="two-buttons" style="margin-top:12px"><button id="png">↓ PNG</button><button id="svg">↓ SVG</button></div><div class="two-buttons" style="margin-top:8px"><button id="save">Save project</button><button id="open">Open project</button></div><input id="file" type="file" accept=".json,application/json" hidden><p class="note">PNG for images. SVG for editable vectors.<br>Save a project to pick up where you left off.</p></section>
<section class="section"><details><summary>A few things to know ↗</summary><p>Hold your hands like two loose L shapes. Index fingers form the top edge; thumbs form the bottom. Space starts a 3-second countdown. Losing either hand pauses the trail automatically.</p><p>This version follows the webcam’s visible perspective. It does not reconstruct 3D depth. Camera frames are processed locally; the tracking model loads from Google and jsDelivr.</p><button id="try-demo" class="full">Switch to mouse demo</button></details></section></aside></main><video id="video" playsinline muted></video><div id="toast" role="status"></div>`;
const canvas=$<HTMLCanvasElement>('canvas'),ctx=canvas.getContext('2d')!,video=$<HTMLVideoElement>('video');
const input=(id:string)=>$<HTMLInputElement>(id), val=(id:string)=>Number(input(id).value);
let planes:Plane[]=[],undoStack:Plane[][]=[],redoStack:Plane[][]=[];
let mode:'draw'|'edit'='draw',source:'none'|'camera'|'demo'='none',recording=false,arming=false;
let preview:Point[]|null=null,lastStamp:Point[]|null=null,stroke=0,nextStroke=1,selected:number|null=null;
let stream:MediaStream|null=null,tracker:HandLandmarker|null=null,cameraLoading=false,cameraEpoch=0;
let lastVideo=-1,lastInference=0,stableFrames=0,priorHands:Point[]|null=null;
let timer:number|undefined,toastTimer:number|undefined,angle=0,brushSize=1,drag:Point|null=null,dragChanged=false;
let pointerDown=false,lastPointer:Point={x:WIDTH/2,y:HEIGHT/2},trackingStatus='Show both hands';
const clone=()=>structuredClone(planes);
function checkpoint(){undoStack.push(clone());if(undoStack.length>30)undoStack.shift();redoStack=[];}
function toast(message:string){$('toast').textContent=message;clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').textContent='',4500);}
function style():Style{return{color:input('fill-color').value,edge:input('edge-color').value,fill:input('brush-style').value!=='wire',opacity:input('brush-style').value==='solid'?1:val('opacity')/100,width:1.2,thickness:val('thickness')};}
function update(){
  $('stats').textContent=`${planes.length.toLocaleString()} planes · ${new Set(planes.map(p=>p.stroke)).size} strokes`;
  $<HTMLButtonElement>('undo').disabled=!undoStack.length;$<HTMLButtonElement>('redo').disabled=!redoStack.length;
  for(const id of ['clear','png','svg','save'])$<HTMLButtonElement>(id).disabled=!planes.length;
  for(const id of ['delete','apply-style'])$<HTMLButtonElement>(id).disabled=selected===null;
  $<HTMLButtonElement>('record').disabled=source==='none'||mode==='edit'||cameraLoading;
  $('record').dataset.recording=String(recording||arming);
  $('record').textContent=arming?'Cancel countdown':recording?'Pause drawing / Space':'Start drawing / Space';
  $('draw-mode').setAttribute('aria-pressed',String(mode==='draw'));$('edit-mode').setAttribute('aria-pressed',String(mode==='edit'));
  $('edit-tools').hidden=mode!=='edit';
  $('selection').textContent=selected===null?'Click a plane to select its stroke. Drag to move.':`Stroke selected · ${planes.filter(p=>p.stroke===selected).length} planes`;
  $('status').textContent=mode==='edit'?'Edit mode · select and drag a stroke':source==='none'?'Your canvas is ready':source==='demo'?(recording?'Drawing · move your mouse':'Mouse demo · drag to draw'):arming?'Get your hands into position':recording?trackingStatus==='Hands ready'?'Drawing · hands tracked':`Paused · ${trackingStatus}`:trackingStatus;
  $('status-dot').classList.toggle('live',recording&&(source==='demo'||trackingStatus==='Hands ready'));
}
function stop(){recording=false;arming=false;clearInterval(timer);$('countdown').textContent='';lastStamp=null;stroke=0;pointerDown=false;update();}
function begin(){recording=true;arming=false;stroke=0;lastStamp=null;update();}
function toggleRecord(){if(mode==='edit'||source==='none')return;if(recording||arming){stop();return;}if(source==='demo'){begin();return;}arming=true;let n=3;$('countdown').textContent=String(n);update();timer=window.setInterval(()=>{n--;if(n===0){clearInterval(timer);$('countdown').textContent='';begin();}else $('countdown').textContent=String(n);},1000);}
function stamp(points:Point[]){
  if(!recording||mode!=='draw'||!validQuad(points))return;
  if(lastStamp&&movement(points,lastStamp)<val('spacing'))return;
  if(planes.length>=LIMIT){stop();toast('6,000-plane limit reached. Save your project, then start a new canvas.');return;}
  if(!stroke){checkpoint();stroke=nextStroke++;}
  const copy=points.map(p=>({...p}));planes.push({points:copy,style:style(),stroke});lastStamp=copy;update();
}
function path(c:CanvasRenderingContext2D,points:Point[]){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();}
function paintFace(c:CanvasRenderingContext2D,p:Plane){path(c,p.points);if(p.style.fill){c.globalAlpha=p.style.opacity;c.fillStyle=p.style.color;c.fill();}c.globalAlpha=1;c.strokeStyle=p.style.edge;c.lineWidth=p.style.width;c.lineJoin='round';c.stroke();}
function paint(c:CanvasRenderingContext2D,p:Plane){planeFaces(p).forEach(face=>paintFace(c,face));}
function render(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.fillStyle='#20241e';ctx.fillRect(0,0,WIDTH,HEIGHT);
  if(source==='camera'&&video.readyState>=2){ctx.save();ctx.globalAlpha=val('camera-opacity')/100;const s=Math.max(WIDTH/video.videoWidth,HEIGHT/video.videoHeight);ctx.translate(WIDTH,0);ctx.scale(-1,1);ctx.drawImage(video,(WIDTH-video.videoWidth*s)/2,(HEIGHT-video.videoHeight*s)/2,video.videoWidth*s,video.videoHeight*s);ctx.restore();}
  ctx.fillStyle='#a5b58b20';for(let x=24;x<WIDTH;x+=30)for(let y=24;y<HEIGHT;y+=30)ctx.fillRect(x,y,1.3,1.3);
  for(const p of planes)paint(ctx,p);
  if(selected!==null&&mode==='edit'){ctx.save();ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.setLineDash([5,5]);for(const p of planes.filter(p=>p.stroke===selected)){path(ctx,p.points);ctx.stroke();}ctx.restore();}
  if(preview&&mode==='draw'&&source!=='none'){
    const valid=validQuad(preview);if(valid&&val('thickness')>1)paint(ctx,{points:preview,style:style(),stroke:0});ctx.save();ctx.strokeStyle=valid?'#e3fbbd':'#eea48c';ctx.fillStyle=valid?'#d6f39a':'#eea48c';ctx.lineWidth=1.5;ctx.setLineDash([6,7]);path(ctx,preview);ctx.stroke();ctx.setLineDash([]);
    preview.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.font='11px monospace';ctx.fillText(['L INDEX','R INDEX','R THUMB','L THUMB'][i],p.x+10,p.y-10);});ctx.restore();
  }
}
function loseTracking(message:string){stableFrames=0;priorHands=null;preview=null;lastStamp=null;stroke=0;trackingStatus=message;update();}
function processHands(hands:NormalizedLandmark[][]){
  if(hands.length!==2){loseTracking(hands.length?'One hand found · show both hands':'Show both hands');return;}
  let wrists=hands.map(h=>cameraPoint(h[0],video.videoWidth,video.videoHeight));
  // Minimum-travel assignment preserves corner identities when detection order changes.
  if(priorHands){const direct=movement(wrists,priorHands),swapped=movement([wrists[1],wrists[0]],priorHands);if(swapped<direct){hands=[hands[1],hands[0]];wrists=[wrists[1],wrists[0]];}if(Math.min(direct,swapped)>200){loseTracking('Hold still briefly to reconnect');return;}}
  else if(wrists[0].x>wrists[1].x){hands=[hands[1],hands[0]];wrists=[wrists[1],wrists[0]];}
  priorHands=wrists;
  const points=[hands[0][8],hands[1][8],hands[1][4],hands[0][4]].map(p=>cameraPoint(p,video.videoWidth,video.videoHeight));
  if(!validQuad(points)){preview=points;stableFrames=0;lastStamp=null;stroke=0;trackingStatus='Open your fingers into a four-corner shape';update();return;}
  const a=1-val('smoothing')/100;
  preview=preview&&validQuad(preview)?points.map((p,i)=>({x:preview![i].x+(p.x-preview![i].x)*a,y:preview![i].y+(p.y-preview![i].y)*a})):points;
  preview=stabilizePlane(preview) as Point[];
  stableFrames++;trackingStatus=stableFrames<5?'Hold steady…':'Hands ready';if(stableFrames>=5)stamp(preview);update();
}
async function enableCamera(){
  if(cameraLoading)return;stop();cameraLoading=true;const epoch=++cameraEpoch;
  $('camera').textContent='Loading tracker…';$<HTMLButtonElement>('camera').disabled=true;$<HTMLButtonElement>('start').disabled=true;update();
  let pending:MediaStream|null=null;
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs HTTPS or localhost in a supported browser.');
    const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
    if(!tracker){const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');tracker=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.65,minHandPresenceConfidence:.65,minTrackingConfidence:.65});}
    if(epoch!==cameraEpoch)return;
    $('camera').textContent='Allow camera access…';
    pending=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});
    if(epoch!==cameraEpoch){pending.getTracks().forEach(t=>t.stop());return;}
    stream=pending;video.srcObject=stream;await video.play();
    if(epoch!==cameraEpoch)return;
    canvas.focus();
    source='camera';lastVideo=-1;priorHands=null;preview=null;stableFrames=0;$('welcome').hidden=true;$('input-label').textContent='Webcam · two hands';$('camera').textContent='Turn camera off';$('input-note').textContent='Open both hands into L shapes. Press Space, then get into position.';$('hint').innerHTML='<kbd>Space</kbd> start / pause &nbsp; · &nbsp; <kbd>⌘ Z</kbd> undo &nbsp; · &nbsp; camera frames stay local';
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(source==='camera'){disconnectCamera();toast('Camera disconnected. Your artwork is safe.');}});
  }catch(error){pending?.getTracks().forEach(t=>t.stop());if(epoch!==cameraEpoch)return;video.srcObject=null;stream=null;const name=error instanceof Error?error.name:'';toast(name==='NotAllowedError'?'Camera permission was denied. Allow access in your browser, or try mouse demo.':name==='NotFoundError'?'No camera found. Try mouse demo instead.':`Could not start camera: ${error instanceof Error?error.message:'please retry'}`);$('camera').textContent='Retry camera';}
  finally{if(epoch===cameraEpoch){cameraLoading=false;$<HTMLButtonElement>('camera').disabled=false;$<HTMLButtonElement>('start').disabled=false;update();}}
}
function disconnectCamera(){cameraEpoch++;cameraLoading=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;source='none';preview=null;priorHands=null;stop();$('camera').textContent='Enable camera';$<HTMLButtonElement>('camera').disabled=false;$<HTMLButtonElement>('start').disabled=false;$('input-label').textContent='Webcam · off';}
function demo(){disconnectCamera();source='demo';$('welcome').hidden=true;preview=demoQuad(WIDTH/2,HEIGHT/2);$('input-label').textContent='Mouse · demo mode';$('input-note').textContent='Drag to leave a trail. Scroll to rotate the plane; Shift + scroll changes its size.';$('hint').innerHTML='Drag to draw &nbsp; · &nbsp; Scroll to rotate &nbsp; · &nbsp; <kbd>Shift</kbd> + scroll to resize';update();}
function setMode(next:'draw'|'edit'){stop();mode=next;selected=null;drag=null;canvas.style.cursor=mode==='edit'?'default':'crosshair';update();}
$('start').onclick=()=>void enableCamera();$('camera').onclick=()=>source==='camera'?disconnectCamera():void enableCamera();$('demo').onclick=demo;$('try-demo').onclick=demo;$('record').onclick=toggleRecord;
$('draw-mode').onclick=()=>setMode('draw');$('edit-mode').onclick=()=>setMode('edit');
$('undo').onclick=()=>{if(!undoStack.length)return;stop();redoStack.push(clone());planes=undoStack.pop()!;selected=null;update();};
$('redo').onclick=()=>{if(!redoStack.length)return;stop();undoStack.push(clone());planes=redoStack.pop()!;selected=null;update();};
$('clear').onclick=()=>{if(!planes.length)return;stop();checkpoint();planes=[];selected=null;update();toast('Canvas cleared. Undo brings it back.');};
$('delete').onclick=()=>{if(selected===null)return;checkpoint();planes=planes.filter(p=>p.stroke!==selected);selected=null;update();};
$('apply-style').onclick=()=>{if(selected===null)return;checkpoint();planes=planes.map(p=>p.stroke===selected?{...p,style:style()}:p);update();};
for(const id of ['opacity','camera-opacity','smoothing','spacing','thickness'])input(id).oninput=()=>{$(`${id}-value`).textContent=`${val(id)}${['spacing','thickness'].includes(id)?' px':'%'}`;};
document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.onclick=()=>{input('fill-color').value=b.dataset.color!;input('edge-color').value=b.dataset.color!;document.querySelectorAll('[data-color]').forEach(s=>s.setAttribute('aria-pressed',String(s===b)));});
input('fill-color').oninput=()=>document.querySelectorAll('[data-color]').forEach(s=>s.setAttribute('aria-pressed','false'));
function pointer(e:PointerEvent):Point{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
canvas.onpointerdown=e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);const p=pointer(e);if(mode==='edit'){selected=[...planes].reverse().find(q=>planeFaces(q).some(face=>contains(face.points,p)))?.stroke??null;drag=selected!==null?p:null;dragChanged=false;update();}else if(source==='demo'){lastPointer=p;preview=demoQuad(p.x,p.y,angle,brushSize);pointerDown=true;begin();stamp(preview);}};
canvas.onpointermove=e=>{const p=pointer(e);lastPointer=p;if(mode==='edit'&&drag&&selected!==null){if(!dragChanged){checkpoint();dragChanged=true;}const dx=p.x-drag.x,dy=p.y-drag.y;planes=planes.map(q=>q.stroke===selected?{...q,points:q.points.map(pt=>({x:pt.x+dx,y:pt.y+dy}))}:q);drag=p;}else if(mode==='draw'&&source==='demo'){preview=demoQuad(p.x,p.y,angle,brushSize);stamp(preview);}};
function pointerEnd(){drag=null;if(pointerDown){stop();pointerDown=false;}update();}
canvas.onpointerup=pointerEnd;canvas.onpointercancel=pointerEnd;canvas.onlostpointercapture=pointerEnd;
canvas.onpointerleave=()=>{if(source==='demo'&&!pointerDown){preview=null;lastStamp=null;stroke=0;}};
canvas.addEventListener('wheel',e=>{if(source!=='demo'||mode!=='draw')return;e.preventDefault();if(e.shiftKey)brushSize=Math.min(2.5,Math.max(.2,brushSize-e.deltaY*.002));else angle+=e.deltaY*.003;preview=demoQuad(lastPointer.x,lastPointer.y,angle,brushSize);stamp(preview);},{passive:false});
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA','BUTTON','SUMMARY'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)toggleRecord();}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'redo':'undo').click();}if(e.key==='Escape'){stop();selected=null;update();}if((e.key==='Backspace'||e.key==='Delete')&&mode==='edit'){e.preventDefault();$('delete').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('blur',()=>stop());
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
const filename=(ext:string)=>`plane-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.${ext}`;
$('svg').onclick=()=>{stop();download(new Blob([svgDocument(planes,input('transparent').checked?null:'#20241e')],{type:'image/svg+xml'}),filename('svg'));};
$('png').onclick=()=>{stop();const out=document.createElement('canvas'),scale=val('resolution');out.width=WIDTH*scale;out.height=HEIGHT*scale;const c=out.getContext('2d')!;c.scale(scale,scale);if(!input('transparent').checked){c.fillStyle='#20241e';c.fillRect(0,0,WIDTH,HEIGHT);}planes.forEach(p=>paint(c,p));out.toBlob(blob=>{if(blob)download(blob,filename('png'));else toast('PNG export failed. Try a smaller resolution.');},'image/png');};
$('save').onclick=()=>{stop();download(new Blob([JSON.stringify({version:1,width:WIDTH,height:HEIGHT,planes})],{type:'application/json'}),filename('json'));};
$('open').onclick=()=>input('file').click();input('file').onchange=async()=>{const file=input('file').files?.[0];if(!file)return;try{if(file.size>15_000_000)throw new Error('Project is too large (maximum 15 MB).');const loaded=parseProject(await file.text()) as Plane[];stop();checkpoint();planes=loaded;nextStroke=Math.max(0,...planes.map(p=>p.stroke))+1;selected=null;$('welcome').hidden=true;setMode('edit');toast('Project opened. Select a stroke to edit.');}catch(e){toast(e instanceof Error?e.message:'Could not open project.');}finally{input('file').value='';}};
window.addEventListener('pagehide',()=>{stream?.getTracks().forEach(t=>t.stop());tracker?.close();});
function tick(now:number){if(source==='camera'&&tracker&&video.readyState>=2&&video.currentTime!==lastVideo&&now-lastInference>40){lastVideo=video.currentTime;lastInference=now;try{processHands(tracker.detectForVideo(video,now).landmarks);}catch{disconnectCamera();toast('Hand tracking stopped unexpectedly. Re-enable the camera to retry.');}}render();requestAnimationFrame(tick);}
update();requestAnimationFrame(tick);
