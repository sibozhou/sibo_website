import * as THREE from 'three';
import {createWalkLayout} from './walk-layout.js?v=1113-v7-side-windows-1';

const movement = {
  KeyW:'forward', ArrowUp:'forward', KeyS:'back', ArrowDown:'back',
  KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right',
};
const up = new THREE.Vector3(0,1,0);

export function createWalkthrough({model, openings, scene, camera, controls, angle, requestFrame, onEnter, onExit, openDoor}) {
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
  const stairMaterial = new THREE.MeshBasicMaterial({color:0xffd69a,toneMapped:false});
  const guides = [];
  const stairFlights = new Map();
  scene.traverse(object=>{
    const stair = object.userData.v6Stair;
    if(stair&&object.userData.stairFlight)stairFlights.set(`${stair.home}:${stair.level}`,stair);
  });

  function addGuide() {
    const marker = new THREE.Group();
    const hit = new THREE.Mesh(arrow,outline);
    const symbol = new THREE.Mesh(arrow,arrowMaterial);
    symbol.position.y = .002;
    symbol.scale.setScalar(.78);
    marker.add(hit,symbol);
    marker.visible = false;
    scene.add(marker);
    const guide = {marker,hit,symbol};
    guides.push(guide);
    return guide;
  }
  let active = false, level = 1, home = 'A', roomId = '', x, y;
  let yaw = 0, pitch = 0, lastFrame = 0, drag, transition;

  function orient(floorHeight=model.vertical.floorBases[level-1]) {
    const eye = floorHeight+1.60;
    camera.position.set(x-14.8,eye,8.35-y).applyAxisAngle(up,angle());
    const direction = new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    camera.lookAt(direction.applyAxisAngle(up,angle()).add(camera.position));
    requestFrame();
  }

  function go(nextLevel,nextHome,nextRoom='',previousRoom='',travelDirection=0) {
    const roomList = layout.rooms(nextLevel,nextHome);
    const room = roomList.find(room=>room.id===nextRoom);
    roomId = room?.id??'';
    const point = layout.start(nextLevel,nextHome,roomId);
    if(!point)return false;
    level = nextLevel;
    home = nextHome;
    [x,y] = point;
    yaw = level===1?(home==='A'?-.58:.58):0;
    pitch = -.29;
    if(room){
      const [left,bottom,width,depth] = room.bedRect??room.rect;
      const dx = left+width/2-x, dy = bottom+depth/2-y;
      if(Math.hypot(dx,dy)>.15)yaw = Math.atan2(dx,dy);
      pitch = -.28;
    }
    const region = layout.region(level,home,x,y);
    const links = linksFor(region);
    const next = links.find(link=>travelDirection&&link.toLevel===level+travelDirection)
      ?? links.find(link=>link.to!==previousRoom&&link.to.endsWith('-stair-hall'))
      ?? links.find(link=>link.to!==previousRoom)??links[0];
    if(next)lookToward(next.point);
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
    transition = undefined;
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
      const {start,path,duration,toLevel,toRoom} = transition;
      const progress = Math.min(1,Math.max(0,(time-start)/duration));
      if(progress===1){
        transition = undefined;
        go(toLevel,home,toRoom,'',Math.sign(toLevel-level));
        return;
      }
      const point = path.getPoint(progress);
      const ahead = path.getPoint(Math.min(1,progress+.07));
      x = point.x;
      y = point.y;
      const heading = Math.atan2(ahead.x-x,ahead.y-y);
      yaw += Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw))*.28;
      pitch = -.30;
      orient(point.z);
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

  function lookToward([targetX,targetY]) {
    const distance = Math.hypot(targetX-x,targetY-y);
    if(distance<.15)return;
    yaw = Math.atan2(targetX-x,targetY-y);
    pitch = -THREE.MathUtils.clamp(Math.atan2(1.60,distance)-.24,.24,.70);
  }

  function linksFor(region) {
    const links = layout.portals(level,home,region);
    if(region!==`${home}${level}-stair-hall`)return links;
    const side = home==='A'?1:-1;
    const stairLinks = [];
    for(const offset of [1,-1]){
      const stair = stairFlights.get(`${home}:${level+Math.min(offset,0)}`);
      if(!stair)continue;
      const [stairX,stairY] = offset>0?stair.entry:stair.arrival;
      stairLinks.push({
        stair, toLevel:level+offset, to:`${home}${level+offset}-stair-hall`,
        point:[stairX+side*.13,stairY], direction:[-side,0],
      });
    }
    return [...stairLinks,...links];
  }

  function climb(link) {
    const {stair,toLevel,to} = link;
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){go(toLevel,home,to,'',Math.sign(toLevel-level));return;}
    const [left,,width] = stair.footprint;
    const [landing,,landingWidth] = stair.landing;
    const side = home==='A'?1:-1;
    const flightEnd = side>0?left+width:left;
    const landingEdge = side>0?landing+landingWidth:landing;
    const landingCenter = landing+landingWidth/2;
    const [entryX,entryY] = stair.entry, [arrivalX,arrivalY] = stair.arrival;
    const lower = model.vertical.floorBases[stair.level-1], middle = lower+stair.rise/2, upper = lower+stair.rise;
    const points = [
      [entryX+side*.13,entryY,lower],
      [flightEnd,entryY,lower],
      [landingEdge,entryY,middle],
      [landingCenter,entryY,middle],
      [landingCenter,arrivalY,middle],
      [landingEdge,arrivalY,middle],
      [flightEnd,arrivalY,upper],
      [arrivalX+side*.13,arrivalY,upper],
    ];
    if(toLevel<level)points.reverse();
    const [exitX,exitY] = layout.start(toLevel,home,to);
    points.unshift([x,y,model.vertical.floorBases[level-1]]);
    points.push([exitX,exitY,model.vertical.floorBases[toLevel-1]]);
    const path = new THREE.CurvePath();
    for(let i=1;i<points.length;i++){
      const start = new THREE.Vector3(...points[i-1]), end = new THREE.Vector3(...points[i]);
      if(start.distanceToSquared(end)>.0001)path.add(new THREE.LineCurve3(start,end));
    }
    transition = {start:performance.now(),path,duration:Math.max(2700,path.getLength()*270),toLevel,toRoom:to};
    requestFrame();
  }

  function updateArrows() {
    for(const {marker} of guides)marker.visible=false;
    if(!active||transition)return;
    const region = layout.region(level,home,x,y);
    linksFor(region).forEach((link,index)=>{
      const {marker,hit,symbol} = guides[index]??addGuide();
      const [targetX,targetY] = link.point;
      const heading = Math.atan2(...link.direction);
      marker.position.set(targetX-14.8,model.vertical.floorBases[level-1]+.035,8.35-targetY).applyAxisAngle(up,angle());
      marker.rotation.y = angle()-heading;
      marker.scale.setScalar(.85);
      marker.visible = true;
      symbol.material = link.stair?stairMaterial:arrowMaterial;
      hit.userData.link = {...link,from:region};
    });
  }

  function pickArrow(raycaster,obstacleDistance) {
    if(!active||transition)return false;
    const target = raycaster.intersectObjects(guides.filter(({marker})=>marker.visible).map(({hit})=>hit),false)[0];
    if(!target||target.distance>=obstacleDistance)return false;
    const link = target.object.userData.link;
    if(link.from!==layout.region(level,home,x,y))return false;
    clearMovement();
    if(link.stair)climb(link);
    else {
      if(link.entry)openDoor(link.entry);
      go(level,home,link.to,link.from);
    }
    return true;
  }

  homeSelect.addEventListener('change',()=>{transition=undefined;clearMovement();go(level,homeSelect.value);});
  floorSelect.addEventListener('change',()=>{transition=undefined;clearMovement();go(Number(floorSelect.value),home);});
  roomSelect.addEventListener('change',()=>{transition=undefined;clearMovement();go(level,home,roomSelect.value);});
  window.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){exit();return;}
    if(transition)return;
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
      if(event.button!==0||transition)return;
      button.setPointerCapture(event.pointerId);
      heldButtons.set(event.pointerId,button.dataset.walkDirection);
      requestFrame();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture']){
      button.addEventListener(event,e=>heldButtons.delete(e.pointerId));
    }
  }
  surface.addEventListener('pointerdown',event=>{
    if(active&&!transition&&event.button===0&&!drag)drag={id:event.pointerId,x:event.clientX,y:event.clientY,turning:false};
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
  return {enter,exit,frame,resize,updateArrows,pickArrow,get active(){return active;},get roomId(){return roomId;}};
}
