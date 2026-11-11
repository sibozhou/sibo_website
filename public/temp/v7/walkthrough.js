import * as THREE from 'three';
import {createWalkLayout} from './walk-layout.js';

const movement = {
  KeyW:'forward', ArrowUp:'forward', KeyS:'back', ArrowDown:'back',
  KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right',
};
const up = new THREE.Vector3(0,1,0);

export function createWalkthrough({model, openings, camera, controls, angle, requestFrame, onEnter, onExit}) {
  const layout = createWalkLayout(model,openings);
  const panel = document.querySelector('#walk-panel');
  const toggle = document.querySelector('#walk-toggle');
  const surface = document.querySelector('#model-surface');
  const homeSelect = panel.querySelector('#walk-home');
  const floorSelect = panel.querySelector('#walk-floor');
  const roomSelect = panel.querySelector('#walk-room');
  const heldKeys = new Map(), heldButtons = new Map();
  const orbitFov = camera.fov;
  let active = false, level = 1, home = 'A', roomId = '', x, y;
  let yaw = 0, pitch = 0, lastFrame = 0, drag;

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
    yaw = level===1?(home==='A'?-.35:.35):0;
    pitch = -.08;
    if(room){
      const [left,bottom,width,depth] = room.bedRect??room.rect;
      const dx = left+width/2-x, dy = bottom+depth/2-y;
      if(Math.hypot(dx,dy)>.15)yaw = Math.atan2(dx,dy);
      pitch = -.22;
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
    controls.enabled = true;
    camera.fov = orbitFov;
    panel.hidden = true;
    document.body.classList.remove('walking');
    toggle.setAttribute('aria-pressed','false');
    toggle.textContent = '室内漫游';
    onExit();
  }

  function frame(time) {
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

  homeSelect.addEventListener('change',()=>go(level,homeSelect.value));
  floorSelect.addEventListener('change',()=>go(Number(floorSelect.value),home));
  roomSelect.addEventListener('change',()=>go(level,home,roomSelect.value));
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
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,turning:true};
    yaw += dx*.004;
    pitch = THREE.MathUtils.clamp(pitch-dy*.004,-1.12,1.12);
    orient();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture']){
    surface.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=undefined;});
  }
  return {enter,exit,frame,resize,get active(){return active;},get roomId(){return roomId;}};
}
