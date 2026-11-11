import * as THREE from 'three';
import {createWalkLayout} from './walk-layout.js?v=1111-v7-floor-arrows-1';

const movement = {
  KeyW:'forward', ArrowUp:'forward', KeyS:'back', ArrowDown:'back',
  KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right',
};
const up = new THREE.Vector3(0,1,0);

export function createWalkthrough({model, openings, scene, camera, controls, angle, requestFrame, onEnter, onExit}) {
  const layout = createWalkLayout(model,openings);
  const panel = document.querySelector('#walk-panel');
  const toggle = document.querySelector('#walk-toggle');
  const surface = document.querySelector('#model-surface');
  const homeSelect = panel.querySelector('#walk-home');
  const floorSelect = panel.querySelector('#walk-floor');
  const roomSelect = panel.querySelector('#walk-room');
  const heldKeys = new Map(), heldButtons = new Map();
  const orbitFov = camera.fov;
  const shape = new THREE.Shape();
  shape.moveTo(-.11,-.32);shape.lineTo(.11,-.32);shape.lineTo(.11,.015);
  shape.lineTo(.27,.015);shape.lineTo(0,.34);shape.lineTo(-.27,.015);
  shape.lineTo(-.11,.015);shape.closePath();
  const arrow = new THREE.ShapeGeometry(shape).rotateX(-Math.PI/2);
  const outline = new THREE.MeshBasicMaterial({color:0x225e50,toneMapped:false});
  const arrowMaterial = new THREE.MeshBasicMaterial({color:0xa9f5cc,toneMapped:false});
  const guides = [-.40,0,.40].map(offset=>{
    const marker = new THREE.Group();
    const hit = new THREE.Mesh(arrow,outline);
    const symbol = new THREE.Mesh(arrow,arrowMaterial);
    symbol.position.y = .002;
    symbol.scale.setScalar(.78);
    marker.add(hit,symbol);
    marker.visible = false;
    scene.add(marker);
    return {offset,marker,hit};
  });
  let active = false, level = 1, home = 'A', roomId = '', x, y;
  let yaw = 0, pitch = 0, lastFrame = 0, drag, transition;

  function orient() {
    const eye = model.vertical.floorBases[level-1]+1.60;
    camera.position.set(x-14.8,eye,8.35-y).applyAxisAngle(up,angle());
    const direction = new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    camera.lookAt(direction.applyAxisAngle(up,angle()).add(camera.position));
    requestFrame();
  }

  function go(nextLevel,nextHome,nextRoom='') {
    const roomList = layout.rooms(nextLevel,nextHome);
    const room = roomList.find(room=>room.id===nextRoom);
    roomId = room?.id??'';
    const point = layout.start(nextLevel,nextHome,roomId);
    if(!point)return false;
    level = nextLevel;
    home = nextHome;
    [x,y] = point;
    yaw = level===1?(home==='A'?-.58:.58):0;
    pitch = -.36;
    if(room){
      const [left,bottom,width,depth] = room.bedRect??room.rect;
      const dx = left+width/2-x, dy = bottom+depth/2-y;
      if(Math.hypot(dx,dy)>.15)yaw = Math.atan2(dx,dy);
      pitch = -.34;
    }
    homeSelect.value = home;
    floorSelect.value = String(level);
    roomSelect.replaceChildren(new Option('入口或楼梯厅',''),...roomList.map(room=>new Option(room.name,room.id)));
    roomSelect.value = roomId;
    onEnter(level,home,roomId);
    orient();
    return true;
  }

  function clearMovement() {
    heldKeys.clear();
    heldButtons.clear();
    lastFrame = 0;
    drag = undefined;
    transition = undefined;
  }

  function resize() {
    camera.fov = THREE.MathUtils.clamp(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(36))/camera.aspect)*180/Math.PI,56,83);
    camera.updateProjectionMatrix();
  }

  function enter(nextLevel=1,nextHome='A',nextRoom='') {
    active = true;
    if(!go(nextLevel,nextHome,nextRoom)){active=false;return;}
    controls.enabled = false;
    camera.near = .06;
    resize();
    panel.hidden = false;
    document.body.classList.add('walking');
    toggle.setAttribute('aria-pressed','true');
    toggle.textContent = '退出漫游';
  }

  function exit() {
    if(!active)return;
    active = false;
    clearMovement();
    updateArrows();
    controls.enabled = true;
    camera.fov = orbitFov;
    panel.hidden = true;
    document.body.classList.remove('walking');
    toggle.setAttribute('aria-pressed','false');
    toggle.textContent = '室内漫游';
    onExit();
  }

  function frame(time) {
    if(transition){
      const {start,fromX,fromY,toX,toY,fromYaw,toYaw} = transition;
      const t = Math.min(1,Math.max(0,(time-start)/580));
      const ease = t*t*(3-2*t);
      const nextX = fromX+(toX-fromX)*ease, nextY = fromY+(toY-fromY)*ease;
      const distance = Math.hypot(nextX-x,nextY-y);
      if(distance>0 && reach(x,y,(nextX-x)/distance,(nextY-y)/distance,distance)<distance){
        transition = undefined;
        return;
      }
      x = nextX;
      y = nextY;
      yaw = fromYaw+(toYaw-fromYaw)*ease;
      if(t===1)transition = undefined;
      orient();
      return;
    }
    const directions = new Set([...heldKeys.values(),...heldButtons.values()]);
    if(!directions.size){lastFrame=0;return;}
    const dt = lastFrame?Math.min(.05,(time-lastFrame)/1000):0;
    lastFrame = time;
    const forward = Number(directions.has('forward'))-Number(directions.has('back'));
    const right = Number(directions.has('right'))-Number(directions.has('left'));
    const distance = 1.65*dt/(Math.hypot(forward,right)||1);
    const dx = (Math.sin(yaw)*forward+Math.cos(yaw)*right)*distance;
    const dy = (Math.cos(yaw)*forward-Math.sin(yaw)*right)*distance;
    if(layout.allows(level,home,x+dx,y))x+=dx;
    if(layout.allows(level,home,x,y+dy))y+=dy;
    orient();
  }

  function reach(fromX,fromY,dx,dy,limit) {
    const samples = Math.ceil(limit/.10);
    for(let index=1;index<=samples;index++){
      const distance = limit*index/samples;
      if(!layout.allowsGuide(level,home,fromX+dx*distance,fromY+dy*distance))return limit*(index-1)/samples;
    }
    return limit;
  }

  function nextHeading(atX,atY,heading) {
    let best = heading, score = -Infinity;
    for(const offset of [0,-.5,.5,-1,1,-Math.PI/2,Math.PI/2,-2.2,2.2,Math.PI]){
      const direction = heading+offset;
      const distance = reach(atX,atY,Math.sin(direction),Math.cos(direction),2.5);
      const rating = distance-.35*Math.abs(offset);
      if(distance>=1.35 && rating>score){best=direction;score=rating;}
    }
    return best;
  }

  function updateArrows() {
    for(const {offset,marker,hit} of guides){
      marker.visible = false;
      if(!active||transition)continue;
      const heading = yaw+offset, dx = Math.sin(heading), dy = Math.cos(heading);
      const distance = Math.min(2.5,reach(x,y,dx,dy,2.75)-.20);
      if(distance<1.2)continue;
      const targetX = x+dx*distance, targetY = y+dy*distance;
      marker.position.set(targetX-14.8,model.vertical.floorBases[level-1]+.035,8.35-targetY).applyAxisAngle(up,angle());
      marker.rotation.y = angle()-heading;
      marker.visible = true;
      hit.userData.step = {x:targetX,y:targetY,heading};
    }
  }

  function pickArrow(raycaster,obstacleDistance) {
    if(!active||transition)return false;
    const target = raycaster.intersectObjects(guides.filter(({marker})=>marker.visible).map(({hit})=>hit),false)[0];
    if(!target||target.distance>=obstacleDistance)return false;
    const {x:toX,y:toY,heading} = target.object.userData.step;
    const dx = toX-x, dy = toY-y, distance = Math.hypot(dx,dy);
    if(reach(x,y,dx/distance,dy/distance,distance)<distance)return false;
    const toYaw = nextHeading(toX,toY,heading);
    clearMovement();
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){
      x = toX;
      y = toY;
      yaw = toYaw;
      orient();
    }else{
      transition = {start:performance.now(),fromX:x,fromY:y,toX,toY,fromYaw:yaw,toYaw};
      requestFrame();
    }
    return true;
  }

  homeSelect.addEventListener('change',()=>{clearMovement();go(level,homeSelect.value);});
  floorSelect.addEventListener('change',()=>{clearMovement();go(Number(floorSelect.value),home);});
  roomSelect.addEventListener('change',()=>{clearMovement();go(level,home,roomSelect.value);});
  window.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){exit();return;}
    const direction = movement[event.code];
    if(!direction||event.altKey||event.ctrlKey||event.metaKey||event.target.closest?.('select,input,textarea'))return;
    event.preventDefault();
    heldKeys.set(event.code,direction);
    requestFrame();
  });
  window.addEventListener('keyup',event=>heldKeys.delete(event.code));
  window.addEventListener('blur',clearMovement);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMovement();});
  for(const button of panel.querySelectorAll('[data-walk-direction]')){
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      button.setPointerCapture(event.pointerId);
      heldButtons.set(event.pointerId,button.dataset.walkDirection);
      requestFrame();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture']){
      button.addEventListener(event,e=>heldButtons.delete(e.pointerId));
    }
  }
  surface.addEventListener('pointerdown',event=>{
    if(active&&event.button===0&&!drag)drag={id:event.pointerId,x:event.clientX,y:event.clientY,turning:false};
  });
  surface.addEventListener('pointermove',event=>{
    if(!active||drag?.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.turning&&Math.hypot(dx,dy)<=8)return;
    transition = undefined;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,turning:true};
    yaw += dx*.004;
    pitch = THREE.MathUtils.clamp(pitch-dy*.004,-1.12,1.12);
    orient();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture']){
    surface.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=undefined;});
  }
  return {enter,exit,frame,resize,updateArrows,pickArrow,get active(){return active;},get roomId(){return roomId;}};
}
