import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js?v=mobile-2';
import { seasonDay, seasonDate, solarPosition } from './solar-position.js?v=1101-v6-wall-joints-4';
import { createOpening } from './opening-motion.js?v=1101-v6-wall-joints-4';
import { loadBakedLighting } from './baked-lighting.js?v=1101-v6-wall-joints-4';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const host = $('#canvas-host');
const params = new URLSearchParams(location.search);
const roofColors={stone:{name:'暖石板灰',hex:0x676962},charcoal:{name:'深炭灰',hex:0x3f4442},olive:{name:'灰橄榄',hex:0x666c60},clay:{name:'烟陶红',hex:0x8a6256},sand:{name:'砂岩褐',hex:0x80796b}};
const strictOriginal = false;
const facadeStudy = true;
const facadeChanges = true;
const boundedParam=(key,min,max,fallback)=>params.has(key)&&Number.isFinite(Number(params.get(key)))?Math.max(min,Math.min(max,Number(params.get(key)))):fallback;
const state = {
  design: !facadeStudy&&params.get('design')==='proposed'?'proposed':'original',
  floor: ['all','1','2','3','explode'].includes(params.get('floor')) ? params.get('floor') : facadeStudy?'all':'1',
  scene: params.get('scene') === 'festival' ? 'festival' : 'daily',
  home: ['A','B'].includes(params.get('home')) ? params.get('home') : 'both',
  camera: facadeStudy?(['site','north','arrival','garden'].includes(params.get('view'))?params.get('view'):facadeChanges&&params.get('scene')==='festival'?'top':'entry'):'bird', selected: null,
  sunSeason:boundedParam('season',0,4,2+36/89),sunHour:boundedParam('hour',0,24,14),
  roofColor:Object.hasOwn(roofColors,params.get('roof'))?params.get('roof'):'clay',
};
const heights = facadeChanges?[3.9,3.3,3.3]:[3.3,3.1,3.0];
const base = [0,heights[0],heights[0]+heights[1]];
const floorNames = ['一层','二层','三层'];
const colors = { bedroom:0xd9e2ce, elder:0xd5e1c4, living:0xe4d9bf, reunion:0xe6cdb5,
  kitchen:0xe2d6bc, dining:0xe4d9bf, bath:0xc8dedc, laundry:0xdce3d5, service:0xe0e2d9, stairs:0xd9dbd1 };
const materials = {};
const floorMaterials={};
function mat(name, color, options = {}) {
  materials[name] = new THREE.MeshStandardMaterial({ color, roughness:.82, ...options });
  return materials[name];
}
mat('wall',0xf5f1e4); mat('wallCap',0xe3dfcf); mat('slab',0xe7e3d5);
mat('wood',0xb68d61); mat('lightWood',0xd8bd94); mat('white',0xfbf8ec);
mat('linen',0xded7bd); mat('blanket',0x8da28b); mat('pillow',0xf4efdf);
mat('metal',0x64776d); mat('glass',0xffffff,{transparent:true,opacity:.12,roughness:.06,depthWrite:false});
mat('patioWood',0xa99b82,{roughness:.88});mat('patioFabric',0xe2ded2,{roughness:.95,side:THREE.DoubleSide});mat('patioFrame',0x747063,{roughness:.72,metalness:.25});
mat('windowFrame',0x718e80); mat('sofa',0xc4bda4); mat('seat',0xafb9a1);
mat('dark',0x394a40); mat('tile',0xd0ded6); mat('water',0xa0c4c2); mat('roof',0x6e7b6d);
mat('ground',0xd6ddcc); mat('paving',0xe3e3d6); mat('court',0xd2d9c4); mat('red',0xaa6049);
mat('frost',0xffffff,{transparent:true,opacity:.78,roughness:.8});
mat('guardGlass',0xffffff,{transparent:true,opacity:.12,roughness:.06,depthWrite:false,side:THREE.DoubleSide});
mat('plinth',0x96958e);mat('joint',0xc4c0b7);mat('leaf',0x526d36);mat('pot',0x777a6b);
mat('woodLine',0x84623d);
mat('estateTerrace',0xbdb8ac);mat('estateEdge',0x6c6e67);
mat('estateGrass',0x85956f).userData.seasonal=true;mat('estateMeadow',0x929c7d).userData.seasonal=true;mat('estatePath',0xc0b7a3);
mat('arrivalConcrete',0xbdb9ac);mat('arrivalStone',0xc9c4b7);mat('arrivalPaver',0xaaa99e);mat('arrivalJoint',0x97998e);mat('gardenSoil',0x585448);mat('gardenBark',0x927866);
mat('carStone',0xb6b9ae,{roughness:.38,metalness:.25});mat('carClay',0xa4a092,{roughness:.38,metalness:.25});mat('carGlazing',0x424d48,{roughness:.2,metalness:.25});mat('carTyre',0x383b39);mat('carRim',0x94988f,{metalness:.65,roughness:.25});
for(const [i,color] of [0x9da98a,0xb2b193,0x8d9f79,0xa5ac8b,0x959c7d].entries())mat('field'+i,color,{depthWrite:false});
mat('fieldEdge',0x71835d,{depthWrite:false});mat('villageRoad',0xb6b5a8,{depthWrite:false});mat('pond',0x4e6e62,{roughness:.32,depthWrite:false});
mat('neighbourWall',0xd9d3c5);mat('neighbourRoof',0x956e61);
mat('accessPaving',0xe1ddd2,{depthWrite:false});
mat('seamRoof',0x8a6256,{roughness:.62,metalness:.25,side:THREE.DoubleSide});
mat('roofInfill',0xf2e9d9,{side:THREE.DoubleSide});
mat('column',0x777971);
mat('guardBase',0x8f9084);mat('guardJoint',0xa3a497);mat('guardMetal',0x786f61);
mat('lampMetal',0x786f61,{roughness:.65,metalness:.35});mat('lampShade',0xe5d8c1,{roughness:.95,emissive:0xffdeb4,emissiveIntensity:0});
mat('warmGlow',0xffefd0,{emissive:0xffd6a0,emissiveIntensity:0,roughness:.55});mat('taskGlow',0xfff0d9,{emissive:0xffe0bc,emissiveIntensity:0,roughness:.55});
mat('entryDoor',0x806a55);mat('interiorDoor',0xb2a087);mat('bathDoor',0xb9b6aa);mat('serviceDoor',0x666c63);mat('doorGroove',0x65513f);
if(facadeStudy) {
  document.body.classList.add('facade-study');
  document.title=(strictOriginal?'严格原图版':'方案11/01 · v6')+' · 祁东双户住宅';
  if(strictOriginal)$('.brand small').textContent='平面核对 · 高度未核实';
  for(const [name,color] of Object.entries({wall:0xf2e9d9,wallCap:0x777a75,slab:0xe6e0d3,roof:0xb3b0a7,windowFrame:0x414944,metal:0x414944,wood:0xa57a48,glass:0xffffff,ground:0xd2d0c8,paving:0xe1ddd2,court:0xd2cebc}))materials[name].color.setHex(color);
  materials.glass.opacity=.12;
  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=128;
  const textureContext=textureCanvas.getContext('2d');textureContext.fillStyle='#c9bda9';textureContext.fillRect(0,0,128,128);
  for(let i=0;i<900;i++) {const shade=165+i%55;textureContext.fillStyle=`rgb(${shade},${shade},${shade})`;textureContext.fillRect(i*37%128,i*61%128,1,1);}
  const stucco=new THREE.CanvasTexture(textureCanvas);stucco.wrapS=stucco.wrapT=THREE.RepeatWrapping;stucco.repeat.set(3,3);
  materials.wall.bumpMap=stucco;materials.wall.bumpScale=.0006;
  $$('.brand strong').forEach(el=>el.textContent=strictOriginal?'严格原图版':'方案11/01 · v6');if(strictOriginal)$('.brand').href='./v2/';
  $('#original-model')?.style.setProperty('display','flex');
  $$('[data-design="original"]').forEach(el=>el.textContent=strictOriginal?'严格原图版':'方案11/01 · v6');
}
if(facadeChanges)materials.seamRoof.color.setHex(roofColors[state.roofColor].hex);
const unitBox = new THREE.BoxGeometry(1,1,1);
const unitCylinder = new THREE.CylinderGeometry(1,1,1,24);
const unitSphere = new THREE.SphereGeometry(1,12,8);
const toiletSeat = new THREE.TorusGeometry(1,.13,8,24);toiletSeat.rotateX(-Math.PI/2);
const batches = new Map();
const landscapePlants=[],arrivalCarGroups=[];let landscapePalette={},arrivalGardenGroup,courtyardTreeGroup;
const fixtureSources=[];const nightLightSlots=[];let nightStrength=0,nightSignature='';
let bakedLighting,bakeLoading=false,bakeError=false;
function solid(parent, geometry, material, position, scale, rotation = 0) {
  let list = batches.get(parent);
  if (!list) { list = new Map(); batches.set(parent,list); }
  const key = geometry.uuid + material.uuid;
  if (!list.has(key)) list.set(key,{geometry,material,items:[]});
  list.get(key).items.push({position,scale,rotation});
}
function block(parent,x,y,w,d,h,elev,material,rotation=0) {
  solid(parent,unitBox,material,[x+w/2-14.8,elev+h/2,8.35-y-d/2],[w,h,d],rotation);
}
function cylinder(parent,x,y,r,h,elev,material) {
  solid(parent,unitCylinder,material,[x-14.8,elev+h/2,8.35-y],[r,h,r]);
}
function finalizeBatches() {
  const dummy = new THREE.Object3D();
  for (const [parent,list] of batches) for (const {geometry,material,items} of list.values()) {
    const mesh = new THREE.InstancedMesh(geometry,material,items.length);
    items.forEach((v,i) => {
      dummy.position.set(...v.position); dummy.scale.set(...v.scale); dummy.rotation.set(0,v.rotation,0);
      dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.castShadow = material !== materials.glass&&material!==materials.guardGlass; mesh.receiveShadow = true; parent.add(mesh);
  }
  batches.clear();
}
function group(parent) { const g = new THREE.Group(); parent.add(g); return g; }
const worldPoint = (x,y,z=0) => new THREE.Vector3(x-14.8,z,8.35-y);
const mirror = (home,x,w=0) => home === 'B' ? 29.6-x-w : x;

let renderer, scene, camera, controls, data, currentDesign, sunLight, skyLight, solarSite, solarDirty=false;
let siteContextInfo,siteScenery,siteNotes,joinedLayout;
function siteAngle() {return siteContextInfo&&state.design==='original'?(180-siteContextInfo.frontBearing)*Math.PI/180:0;}
const roots={};
const floors = [], homes = [], roofGroups = [], wallSets = [], roomMeshes = [], labels = [];
const openingEntries=new Map(),arrivalStairs=[],secondaryRoofGroups=[];
let dailyFurniture, festivalFurniture, hallDaily, hallFestival, highlighted;
let nextFrame = false;
function requestFrame() { if (!nextFrame) { nextFrame=true; requestAnimationFrame(render); } }
function fail(error) {
  console.error(error); $('#loading').hidden=true; $('#fallback').hidden=false;
}

try {
  const original = await (await fetch('./facade-model.json?v=1101-v6-wall-joints-4')).json();
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  renderer.setClearColor(facadeStudy?0xe8e9e5:0xeaece3); renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.95;
  host.append(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(facadeStudy?0xe8e9e5:0xeaece3);
  camera = new THREE.PerspectiveCamera(39,1,.1,facadeStudy?1200:300);
  controls = new OrbitControls(camera,$('#model-surface'));
  controls.enableDamping=!matchMedia('(prefers-reduced-motion:reduce)').matches;controls.dampingFactor=.12;
  controls.rotateSpeed=.65;controls.zoomSpeed=.8;controls.panSpeed=.8;controls.zoomToCursor=true;
  controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  controls.minDistance=6; controls.maxDistance=matchMedia('(max-width:740px)').matches?180:105;
  controls.maxPolarAngle=Math.PI*.485; controls.target.set(0,0,0);
  controls.addEventListener('change',requestFrame);
  const ambient = new THREE.HemisphereLight(0xffffff,facadeStudy?0xc5bbb0:0xbac4a6,1.5); scene.add(ambient);skyLight=ambient;
  const sun = new THREE.DirectionalLight(0xffefd3,2.5); sun.position.set(-18,35,22);
  sunLight=sun;sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:100});
  sun.shadow.bias=-.0006; sun.shadow.normalBias=.035; scene.add(sun);
  scene.add(sun.target);
  buildModel('original',original);finalizeBatches();
  const focusMaterial=new THREE.MeshBasicMaterial({color:0x72926b,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  highlighted=new THREE.Mesh(new THREE.PlaneGeometry(1,1),focusMaterial);highlighted.rotation.set(-Math.PI/2,0,0,'YXZ');highlighted.visible=false;scene.add(highlighted);
  bindControls();if(facadeChanges)setupSolar(original.solarStudy);
  $('#cutaway').checked=false;updateView(true);
  if(facadeChanges){
    bakeLoading=true;
    loadBakedLighting(roots.original).then(result=>{bakedLighting=result;bakeLoading=false;updateLightingNote();requestFrame();})
      .catch(error=>{console.error(error);bakeLoading=false;bakeError=true;updateLightingNote();});
  }
  new ResizeObserver(resize).observe(host); resize();
  $('#loading').hidden=true;
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('三维显示连接中断');});
} catch (error) { fail(error); }

function footprint(points, home, level, parent, elev, thickness, material, stairHole=false) {
  // Preserve the rear notch only in versions that retain a recessed north facade.
  const notched=[];
  for (let i=0;i<points.length;i++) {
    const p=points[i], next=points[(i+1)%points.length]; notched.push(p);
    if(p[0]===0 && p[1]===16.7 && next[0]===13.8 && data.recess<16.7) notched.push([3.3,16.7],[3.3,data.recess||15.3],[6.9,data.recess||15.3],[6.9,16.7]);
  }
  const shape=new THREE.Shape(notched.map(([x,y])=>new THREE.Vector2(mirror(home,x),y)));
  if(stairHole) {
    const hole=new THREE.Path();
    [[3.5,8.68],[7.25,8.68],[7.25,10.94],[3.5,10.94]].forEach(([x,y],i)=>i?hole.lineTo(mirror(home,x),y):hole.moveTo(mirror(home,x),y));
    hole.closePath(); shape.holes.push(hole);
  }
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});
  if(material.userData.floorFinish) {
    const uv=geometry.attributes.uv,shift=data.joinedLayout.homeShift[home]??0;
    for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)+shift);
  }
  geometry.rotateX(-Math.PI/2); geometry.translate(-14.8,elev-thickness,8.35);
  const mesh=new THREE.Mesh(geometry,material); mesh.receiveShadow=true;mesh.castShadow=true;parent.add(mesh);
}

function makeSurfaceMaterial(material,finish) {
  material.color.set(finish.color);material.roughness=finish.roughness;
  if(!finish.pattern)return;
  const wood=finish.pattern==='oak',offset=finish.offset??0,period=finish.size??[1,1];
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512);
  let seed=1937;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  ctx.globalAlpha=wood?.055:.035;ctx.fillStyle='#65655f';
  for(let i=0;i<4200;i++)ctx.fillRect(random()*512,random()*512,1+random()*2,wood?12+random()*80:1+random()*2);
  ctx.globalAlpha=1;
  if(finish.joint) {
    const channel=h=>parseInt(h,16),relative=[0,1,2].map(i=>Math.min(255,Math.round(channel(finish.grout.slice(1+i*2,3+i*2))/channel(finish.color.slice(1+i*2,3+i*2))*255)));
    ctx.fillStyle=`rgb(${relative.join(',')})`;
    const rows=offset?2:1,jx=finish.joint/period[0]*512,jy=finish.joint/(period[1]*rows)*512;
    for(let row=0;row<rows;row++) {
      ctx.fillRect(0,row*512/rows,512,jy);
      for(let col=-1;col<2;col++)ctx.fillRect((col+(row%2)*offset)*512,row*512/rows,jx,512/rows);
    }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(1/period[0],1/(period[1]*(offset?2:1)));texture.anisotropy=4;
  material.map=texture;if(finish.bump){material.bumpMap=texture;material.bumpScale=finish.bump;}
  material.userData.finishSpec=finish;
}

function makeFloorMaterials(definitions) {
  for(const [key,finish]of Object.entries(definitions)) {
    if(floorMaterials[key])continue;
    const wood=finish.pattern==='oak',canvas=document.createElement('canvas');canvas.width=512;canvas.height=wood?1024:512;
    const ctx=canvas.getContext('2d'),period=wood?[.6,1.2]:finish.size;
    ctx.fillStyle=finish.color;ctx.fillRect(0,0,canvas.width,canvas.height);
    let seed=1937;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<(wood?2800:4200);i++) {
      ctx.globalAlpha=wood?.065:.045;ctx.fillStyle=i%2?'#ffffff':'#38382f';
      ctx.fillRect(random()*canvas.width,random()*canvas.height,wood?1:1+random()*3,wood?12+random()*90:1+random()*3);
    }
    ctx.globalAlpha=1;ctx.fillStyle=finish.grout;
    const jointX=.003/period[0]*canvas.width,jointY=.003/period[1]*canvas.height;
    const count=wood?3:1;
    for(let i=0;i<=count;i++)ctx.fillRect(i*canvas.width/count-jointX/2,0,jointX,canvas.height);
    if(wood)for(let i=0;i<3;i++) {
      const offset=(i%3)*canvas.height/3;
      for(const yy of [offset,offset+canvas.height])ctx.fillRect(i*canvas.width/3,yy-jointY/2,canvas.width/3,jointY);
    } else for(const yy of [0,canvas.height])ctx.fillRect(0,yy-jointY/2,canvas.width,jointY);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1/period[0],1/period[1]);texture.anisotropy=4;
    const material=new THREE.MeshStandardMaterial({map:texture,roughness:finish.roughness});
    material.userData={floorFinish:key,finishColor:finish.color,finishSpec:finish};floorMaterials[key]=material;
  }
  materials.tile.color.set(definitions.wet.color);
  materials.slab.color.set(definitions.outdoor.color);materials.slab.roughness=.98;
}

function buildModel(design,modelData) {
  if(modelData.planRevision===6){buildV6Model(design,modelData);return;}
  data=modelData;currentDesign=design;
  const root=group(scene);roots[design]=root;
  const original=design==='original';
  const joined=facadeChanges&&original&&modelData.joinedLayout;
  if(joined)joinedLayout=joined;
  if(joined&&modelData.designPalette)for(const[key,spec]of Object.entries(modelData.designPalette.materials))makeSurfaceMaterial(materials[key],spec);
  if(joined)makeFloorMaterials(modelData.floorFinishes);
  if(joined)for(const key of ['entry','interior','bath','service'])materials[key+'Door'].color.set(modelData.doorFinishes[key].color);
  const thisFloors=[];
  const site=group(root);
  if(facadeStudy&&original&&modelData.context)makeSiteContext(site,modelData.context);
  else block(site,-3,-3,35.6,22.7,.38,-.62,materials.ground);
  const building=facadeStudy&&original?group(root):root,paving=group(building);
  if(joined)site.position.y=-.215;
  if(facadeStudy&&original)building.rotation.y=siteAngle();
  block(paving,-1.2,-1.9,32,20.2,.12,joined?-.58:-.22,materials.paving);
  if(joined)footprint([[-1.2,-1.9],[30.8,-1.9],[30.8,18.3],[-1.2,18.3]],'A',0,paving,-.45,.01,floorMaterials.outdoor);
  else footprint(data.court,'A',0,paving,-.03,.10,materials.court);
  // Paving joints make the courtyard readable without inventing a surveyed landscape.
  if(!joined) {
    for(let y=-1.2;y<17.6;y+=1.5) block(paving,12.4,y,4.8,.016,.015,-.025,materials.wallCap);
    for(let x=12.4;x<=17.2;x+=1.2) block(paving,x,-1.2,.016,18.8,.015,-.025,materials.wallCap);
  }
  if(facadeStudy&&original) {
    if(!joined) {
      for(let x=-1.2;x<30.8;x+=1.2)block(paving,x,-1.9,.014,3.2,.008,-.215,materials.joint);
      for(let y=-1.9;y<1.3;y+=1.2)block(paving,-1.2,y,32,.014,.008,-.215,materials.joint);
    }
    const tree=group(paving);if(joined)tree.position.y=-.45;if(data.courtyardGarden){tree.position.x=data.courtyardGarden.tree[0]-14.8;tree.position.z=8-data.courtyardGarden.tree[1];}makeCourtyardTree(tree);if(data.courtyardGarden)makeCourtyardGarden(paving);
  }
  if(joined&&modelData.arrivalGarden)makeArrivalLandscape(paving);
  for(let level=1;level<=3;level++) {
    const f=group(building);f.position.y=base[level-1];floors.push({g:f,level,design});thisFloors.push(f);
    for(const home of ['A','B']) {
      const g=group(f);homes.push({g,home,level});
      if(joined)g.position.x=joined.homeShift[home];
      const outline=original&&level===1?(strictOriginal?data.groundOutline:data.outline.map(([x,y])=>[x===10.2&&[6.7,11.1].includes(y)?9.4:x,y])):data.outline;
      footprint(level===3&&!strictOriginal?data.upper:outline,home,level,g,0,.18,joined?floorMaterials.outdoor:materials.slab,level>1);
      if(joined&&level===1)footprint(outline,home,level,g,-.18,.27,materials.plinth);
      if(joined)for(const balcony of data.northBalconies.filter(b=>b.home===home&&b.level===level)){const [x,y,w,d]=balcony.localRect;footprint([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],home,level,g,0,.18,materials.slab);}
      const full=group(g),low=group(g);wallSets.push({full,low});
      for(const wall of data.walls.filter(w=>w.level===level&&w.home===home)) {
        makeWall(wall,full,heights[level-1],false);makeWall(wall,low,1.08,true);
      }
      if(strictOriginal)makeStrictStructure(home,level,full,low);
      if(joined)for(const column of data.columns.filter((v,i)=>v.home===home&&v.level===level&&!data.omittedColumns.includes(i)&&(!v.low||v.rect[1]>=8.15))) {
        makeStudyColumn(column,full,low);
      }
      for(const room of data.rooms.filter(r=>r.level===level&&r.home===home)) {
        makeRoom({...room,design},g);
        if(room.ceilingHeight){
          const ceiling=group(g);ceiling.userData.ceiling=true;roofGroups.push(ceiling);
          const [x,y,w,d]=room.rect,points=room.polygon??[[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
          footprint(points,'A',level,ceiling,room.ceilingHeight+.06,.06,materials.wall);
        }
      }
      if(joined&&level===2) {
        const [x,y,w,d]=data.frontBedroomAccess.annexLocal;
        footprint([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],home,level,g,.008,.01,floorMaterials.wood);
      }
      if(joined&&level===1&&data.openDiningSouth) {
        const [x,y,w,d]=data.openDiningSouth.localRect;
        footprint([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],home,level,g,.008,.01,floorMaterials.indoor);
      }
      if(!strictOriginal)for(const bed of data.beds.filter(b=>b.level===level&&b.home===home)) original?makeOriginalBed(g,bed):makeBed(g,bed);
      if(facadeChanges&&original)for(const desk of data.bedroomDesks.filter(d=>d.level===level&&d.home===home))makeBedroomDesk(g,desk);
      if(joined)makeInteriorLighting(g,home,level);
      const mx=(x,w=0)=>mirror(home,x,w);
      if(original) {
        if(!strictOriginal)makeOriginalFixtures(g,home,level);
        if(joined&&level===1) {
          makeUnderStairStorage(g,home);
          makeGroundServices(g,home);
          makeLabel({id:home+'-back-entry',home,level,rect:[mirror(home,5.5,1),16.35,1,.7],kind:'terrace',name:'北侧后门',description:data.backAccess.description},g);
          const access=data.courtyardAccess,[px,py,pw,pd]=access.landing;
          block(g,mx(px,pw),py,pw,pd,-data.vertical.outdoorLevel,data.vertical.outdoorLevel,materials.slab);
          if(access.stairDirection==='south')for(let i=1;i<access.risers;i++){const [sx,sy,sw,sd]=access.stairLocal;block(g,mx(sx,sw),sy-i*sd,sw,sd,-data.vertical.outdoorLevel-i*access.riserHeight,data.vertical.outdoorLevel,materials.slab);}
          else for(let i=1;i<access.risers;i++)block(g,mx(px+pw+(i-1)*access.tread,access.tread),py,access.tread,pd,-data.vertical.outdoorLevel-i*access.riserHeight,data.vertical.outdoorLevel,materials.slab);
          makeLabel({id:home+'-courtyard-access',home,level,rect:[mx(9.1,.6),9,.6,.7],kind:'service',name:'天井门',description:access.description},g);
        }
        if(joined&&level===2){makeTerraceLaundry(g,home);makeTerraceFurniture(g,home);}
        if(facadeChanges) {
          if(level===1) {
            makePlanter(g,home,8.0,.5,.75);
          }
          if(level===2)makePlanter(g,home,7.95,.65,.7);
          if(level===2&&!joined) {
            makeLabel({id:home+'-balcony-door',name:(home==='A'?'甲':'乙')+'户阳台门（窗改门）',home,level,rect:[mx(8.4,2.1),.7,2.1,.6],kind:'terrace',description:'二层公共起居厅原正面窗改为玻璃推拉门，直接进入本户阳台；保留原窗洞宽度，降低窗台。门净宽、轨道和门槛防水须深化。'},g);
          }
        }
        if(facadeChanges&&level===3&&!joined) {
          block(g,mx(7.6,1.4),7.8,1.4,.8,.08,2.38,materials.windowFrame);
          makePlanter(g,home,3.8,3.0,.9);makePlanter(g,home,9.5,6.5,.85);
          makeLabel({id:home+'-terrace-door',name:(home==='A'?'甲':'乙')+'户露台门（新增）',home,level,rect:[mx(7.75,1.1),8.0,1.1,.6],kind:'terrace',description:'由三层楼梯旁公共门厅直接进入本户露台，不穿卧室。门洞、开启方向、门槛防水与排水须深化；图中约1100毫米宽为方案洞口意向。'},g);
        }
      } else {
      if(level===1) {
        makeBathroom(g,mx(3.3,2.6),12.5,2.6,2.8,home,true);
        makeLaundry(g,mx(6.05,.65),14.5);
        makeKitchen(g,home);roundTable(g,mx(12),14.55,1.25,6);
      } else {
        makeUpperBathroom(g,home,3.3);makeUpperBathroom(g,home,5.1);
      }
      if(level===3) {
        makeLaundry(g,mx(9.27,.65),10.27);
        block(g,mx(9.4,.55),8.7,.55,.4,.76,0,materials.lightWood);
        block(g,mx(9.4,.55),8.7,.55,.4,.07,.76,materials.white);
      }
      if(level<3) makeBathroom(g,mx(3.3,2.8),6.7,2.8,1.8,home,false,level===2);
      if(level===1&&home==='A') {
        block(g,9.1,6.95,1,2.1,2.05,0,materials.lightWood);
        dailyFurniture=group(g);festivalFurniture=group(g);
        makeSofa(dailyFurniture,3.8,2.7,2.5,.85);makeSofa(dailyFurniture,7.8,2.7,2.5,.85);
        for(const [x,y] of [[4.2,5.2],[6.6,5.2],[8.2,5.2],[10.6,5.2]]) chair(dailyFurniture,x,y,0);
        for(const x of [5,9])block(dailyFurniture,x,4,1.5,.65,.35,0,materials.lightWood);
        roundTable(festivalFurniture,5.6,4.2,1.8,10,0);roundTable(festivalFurniture,9.7,4.2,1.8,10,10);
      }
      if(level===1&&home==='B') {makeLounge(g,home,3.3,2.2,4.2,4.5,false);makeLounge(g,home,7.5,1.5,4.8,5.2,true);}
      if(level===2)makeLounge(g,home,7.5,1.5,4.8,5.2,true);
      if(level===3&&home==='B')makeLounge(g,home,6.9,12.5,6.9,4.2,false);
      }
      if(level<3){const flight=group(g);flight.userData.stairFlight={home,level};makeStairs(flight,home,heights[level-1]);}
      if(facadeChanges&&original&&level>1) {
        const arrival=group(g);arrival.userData.stairArrival={home,fromLevel:level-1};arrival.position.y=-heights[level-2];makeStairs(arrival,home,heights[level-2]);
        arrivalStairs.push(arrival);
      }
      if(level<3&&!strictOriginal) {
        // The front entrance canopy/balcony is open, with supports only.
        if(!joined&&(!facadeStudy||level===1))for(const x of [7.5,12.3])block(g,mx(x-.15,.3),-.15,.3,.3,heights[level-1],0,materials.wall);
        if(level===2&&!joined) {
          rail(g,mx(7.5),0,mx(12.3),0,1.15);
          for(const x of [7.5,12.3])rail(g,mx(x),0,mx(x),1.5,1.15);
        }
      }
      if(level===3) {
        if(!joined) {
        footprint(data.terrace,home,level,g,.01,.20,materials.paving);
        const terrace=strictOriginal?[]:data.terrace;
        for(let i=0;i<terrace.length;i++) {
          const a=terrace[i],b=terrace[(i+1)%terrace.length];
          if(a[1]===8.5&&b[1]===8.5)continue;
          rail(g,mx(a[0]),a[1],mx(b[0]),b[1],1.2);
        }
        // Quiet outdoor tea setting; the rooftop remains open to the sky.
        if(!original)roundTable(g,mx(6.3),5.2,.95,3);
        } else {
          const lowRoof=group(g);secondaryRoofGroups.push(lowRoof);makeLowPitchedRoof(lowRoof,home);
        }
        const roof=group(g);roofGroups.push(roof);
        if(facadeChanges&&original&&data.pitchedRoof)makePitchedRoof(roof,home);
        else {
          footprint(data.upper,home,level,roof,3.08,.18,materials.roof);
          if(facadeStudy&&original)makeFacadeRoof(roof,home);
        }
        if(!joined)makeLabel({id:home+'-terrace',name:(home==='A'?'甲':'乙')+(original&&!facadeStudy?' · 拟用露台':'户露台'),home,level,rect:[mx(4.8,3),4.5,3,2],kind:'terrace',description:strictOriginal?'沿原图边线及此前确认的露台用途示意，未增设露台门。竖向标高与构造未核实。':original&&!facadeStudy?'原图三层空白区按拟用露台示意；准确范围、围护及是否连通仍待确认。':'三层前部为露天屋面露台。防水、排水、保温及栏杆需与建筑施工图同步深化。'},g);
      }
      if(joined)for(const guard of data.guards.filter(v=>v.home===home&&v.level===level))rail(g,...guard.points,guard.height);
      if(joined)for(const guard of data.stairGlassGuards.filter(v=>v.home===home&&v.level===level))makeStairGlassGuard(g,guard);
    }
    if(joined)makeInteriorLighting(f,'both',level);
    if(strictOriginal||facadeChanges&&original) {
      const full=group(f),low=group(f);wallSets.push({full,low});
      for(const wall of data.walls.filter(w=>w.level===level&&w.home==='both')) {
        makeWall(wall,full,data.separatedBuildings&&level===1?3.3:heights[level-1],false);makeWall(wall,low,1.08,true);
      }
      if(strictOriginal) {
        makeStrictStructure('both',level,full,low);
        if(level===3)footprint([[12.3,0],[17.3,0],[17.3,2.2],[12.3,2.2]],'A',level,f,0,.18,materials.slab);
      }
    }
  }
  const link=group(thisFloors[0]);
  if(!original) {
  block(link,13.8,11.1,2,1.4,.12,-.12,materials.paving);
  block(link,13.8,11.1,2,1.4,.08,2.65,materials.windowFrame);
  block(link,13.8,11.1,2,1.4,.035,2.73,materials.glass);
  } else {
    // Original front courtyard enclosure and entrance steps shown on sheet 1.
    const frontage={points:[12.3,2.2,17.3,2.2],kind:'window',level:1,width:.2};
    if(!facadeStudy)makeWall(frontage,link,2.45,false);
    for(let i=0;i<3;i++)block(link,7.5+(joined?joined.homeShift.A:0),-.35*(i+1),14.6+(joined?joined.homeShift.B-joined.homeShift.A:0),.35,joined?.15:.12,-(joined?.15:.12)*(i+1),materials.slab);
  }
  if(facadeChanges&&original&&data.rearHall)makeRearHall(link);
  if(joined&&data.rearLink)makeSeparatedLink(link);
  if(joined)makeJoinedDining(link);
  if(joined)makeCourtyardEnclosure(link);
  makeLabel({id:'court',name:'露天天井',level:1,home:'both',rect:[12.4,6.8,4.8,3],kind:'court',description:joined?'两栋上层恢复2米间距，朝中间开窗；南端5米花窗墙围合天井，一层后部保留餐厅连接厅与活动隔断。':facadeChanges&&original?'前部天井保持露天，取消院落围墙；后部一层连接为可分合餐厅。':original?'依据已确认用途保持露天，未增设建议方案的后部雨棚连接。':'中间天井保持露天，不作为雨天年夜饭场地。两户后走廊之间拟设小面积轻雨棚连接，需核对许可与排水。'},thisFloors[0]);
}

function makeStrictStructure(home,level,full,low) {
  for(const column of data.columns.filter(c=>c.level===level&&c.home===home)) {
    const [x,y,w,d]=column.rect,h=column.low?1.2:heights[level-1];
    block(full,x,y,w,d,h,0,materials.wall);block(low,x,y,w,d,Math.min(h,1.08),0,materials.wall);
  }
  for(const guard of data.guards.filter(r=>r.level===level&&r.home===home)) {
    const [x,y,w,d]=guard.rect,a=w>d?[x,y+d/2,x+w,y+d/2]:[x+w/2,y,x+w/2,y+d];
    rail(full,...a,1.2,Math.min(w,d));rail(low,...a,1.08,Math.min(w,d));
  }
}

function makeStudyColumn(column,full,low) {
  const [x,y,w,d]=column.rect,level=column.level,bottom=level===1?data.vertical.outdoorLevel-.05:0;
  const local=column.home==='A'?x:29.6-x-w,wing=level===2&&y<8.15&&local>2.9&&local<7.75;
  const roofY=yy=>{
    const r=data.pitchedRoof,ridge=r.frontEave+(r.ridgeY-r.frontY)*Math.tan(r.pitch*Math.PI/180);
    return yy<=r.ridgeY?r.frontEave+(yy-r.frontY)*Math.tan(r.pitch*Math.PI/180):ridge-(yy-r.ridgeY)*(ridge-r.backEave)/(16.7+r.overhang-r.ridgeY);
  };
  const top=(xx,yy)=>level===3?roofY(yy)-.04:wing?heights[1]+lowRoofHeight(column.home==='A'?xx:29.6-xx,yy)-.04:heights[level-1];
  const corners=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],points=[...corners.map(([a,b])=>worldPoint(a,b,bottom)),...corners.map(([a,b])=>worldPoint(a,b,top(a,b)))];
  const indices=[0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7],vertices=indices.flatMap(i=>points[i].toArray());
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,materials.wall);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.studyColumn=column;full.add(mesh);
  if(level<3&&!wing)block(full,x,y,w,d,.018,heights[level-1],materials.column);
  block(low,x,y,w,d,1.08-bottom,bottom,materials.wall);block(low,x,y,w,d,.018,1.08,materials.column);
  if(level===1)for(const parent of [full,low])block(parent,x-.006,y-.006,w+.012,d+.012,.55-bottom,bottom,materials.plinth);
}

function makeWall(w,parent,height,cut) {
  const [x1,y1,x2,y2]=w.points, horizontal=Math.abs(y2-y1)<.001;
  const length=Math.hypot(x2-x1,y2-y1),width=w.width;
  const x=Math.min(x1,x2)-(horizontal?0:width/2),y=Math.min(y1,y2)-(horizontal?width/2:0);
  const dx=horizontal?length:width,dy=horizontal?width:length;
  function part(bottom,top,material=materials.wall,thickness=1) {
    if(w.wallBase!==undefined)bottom=Math.max(bottom,w.wallBase);top=Math.min(top,height,w.wallTop??Infinity);if(top-bottom<.015)return;
    block(parent,x+(horizontal?0:width*(1-thickness)/2),y+(horizontal?width*(1-thickness)/2:0),
      horizontal?dx:dx*thickness,horizontal?dy*thickness:dy,top-bottom,bottom,material);
  }
  const joinedPlinth=facadeChanges&&currentDesign==='original'&&data.joinedLayout&&w.level===1&&width>.19&&['wall','window'].includes(w.kind);
  if(joinedPlinth)part(data.vertical.outdoorLevel-.05,w.kind==='window'?Math.min(.55,w.sill??.85):.55,materials.plinth,1.04);
  if(w.kind==='wall') {
    part(0,height);
    if(!joinedPlinth&&facadeStudy&&w.level===1&&width>.19)part(0,.55,materials.plinth,1.04);
    if(cut)part(height-.025,height,materials.wallCap);return;
  }
  if(w.kind==='window') {
    const sill=w.sill??((Math.abs(y1-15.3)<.01&&horizontal)?1.75:.85),head=w.head??2.45;
    part(0,sill);part(head,heights[w.level-1]);
    if(facadeChanges&&currentDesign==='original'){addModelOpening(w,parent,height);return;}
    part(sill,head,w.frost?materials.frost:materials.glass,.28);
    part(sill,sill+.045,materials.windowFrame,1.12);part(head-.05,head,materials.windowFrame,1.12);
    if(facadeStudy) {
      if(w.level===1&&width>.19)part(0,.55,materials.plinth,1.04);
      const jambHeight=Math.min(head,height)-sill;
      if(jambHeight>.015)for(const end of [0,length-.05])block(parent,x+(horizontal?end:0),y+(horizontal?0:end),horizontal?.05:dx,horizontal?dy:.05,jambHeight,sill,materials.windowFrame);
    }
    if(w.openingLeaf||w.singleSash) {
      const leaf=w.singleSash?length:w.openingLeaf;
      const split=w.openingSide==='start'?leaf:length-leaf;
      const sashStart=w.openingSide==='start'?0:split;
      const visibleHeight=Math.min(head,height)-sill;
      if(visibleHeight>.015) {
        if(!w.singleSash)block(parent,x+(horizontal?split-.025:0),y+(horizontal?0:split-.025),horizontal?.05:dx,horizontal?dy:.05,visibleHeight,sill,materials.windowFrame);
        const handle=sashStart+(w.openingSide==='start'?leaf-.10:.10);
        block(parent,x+(horizontal?handle-.012:dx+.015),y+(horizontal?-.035:handle-.012),horizontal?.024:.035,horizontal?.035:.024,.18,Math.min(sill+.63,1.5,height-.20),materials.windowFrame);
      }
    } else if(!cut&&length>1.7)block(parent,(x1+x2)/2-.025,(y1+y2)/2-.025,.05,.05,w.head===undefined&&w.sill===undefined?1.55:head-sill,sill,materials.windowFrame);
  } else {
    if(w.overhead) {
      if(!cut) {
        const lintel=group(parent);roofGroups.push(lintel);
        block(lintel,x,y,dx,dy,heights[w.level-1]-w.head,w.head,materials.wall);
      }
      return;
    }
    part(w.head??2.35,heights[w.level-1]);
    // Recessed threshold marks openings while keeping circulation visible.
    if(w.kind!=='opening'&&!w.flushThreshold)block(parent,x,y,dx,dy,.015,w.balconyPortal?0:.01,w.balconyPortal?materials.windowFrame:materials.lightWood);
    if(facadeChanges&&currentDesign==='original'&&w.kind==='door'){addModelOpening(w,parent,height);return;}
    if(facadeStudy&&w.kind==='door'&&(!w.study||['门4','门5','门6'].includes(w.study))&&!(!strictOriginal&&w.level===1&&horizontal&&y1===1.5)) {
      part(.025,Math.min(w.head??2.35,height)-.04,w.glazed?materials.glass:materials.wood,.32);
      const frameHeight=Math.min(w.head??2.35,height);
      for(const end of [0,length-.045])block(parent,x+(horizontal?end:0),y+(horizontal?0:end),horizontal?.045:dx,horizontal?dy:.045,frameHeight,0,materials.windowFrame);
      if(!cut)part(frameHeight-.045,frameHeight,materials.windowFrame);
      if(strictOriginal&&w.leaves===2)block(parent,(x1+x2)/2-.015,(y1+y2)/2-.015,.03,.03,Math.min(w.head,height)-.08,.04,materials.woodLine);
    }
    if(!cut&&w.kind==='slider')part(0,2.35,materials.glass,.12);
  }
}

function addModelOpening(w,parent,height) {
  const key=[w.level,w.home,w.kind,...w.points].join(':');
  let entry=openingEntries.get(key);
  if(!entry&&w.operation!=='fixed'){entry={wall:w,variants:[],value:0,target:0};openingEntries.set(key,entry);}
  const [a,b,c,d]=w.points,horizontal=Math.abs(b-d)<.001,middle=[(a+c)/2,(b+d)/2];
  const adjacent=data.rooms.filter(r=>r.home===w.home&&r.level===w.level).filter(r=>{
    const[x,y,width,depth]=r.rect;
    return horizontal?(Math.abs(b-y)<.025||Math.abs(b-y-depth)<.025)&&middle[0]>=x&&middle[0]<=x+width:(Math.abs(a-x)<.025||Math.abs(a-x-width)<.025)&&middle[1]>=y&&middle[1]<=y+depth;
  });
  const bathroom=adjacent.find(r=>r.kind==='bath');
  const room=w.opensTo==='private'?adjacent.find(r=>r.id===bathroom?.connectedRoom):bathroom||adjacent[0];
  const centre=room?[room.rect[0]+room.rect[2]/2,room.rect[1]+room.rect[3]/2]:[w.home==='B'?22.7:6.9,8.35];
  const normal=w.interiorNormal??(horizontal?[0,Math.sign(centre[1]-middle[1])]:[Math.sign(centre[0]-middle[0]),0]);
  const variant=createOpening(parent,w,height,normal,materials,solid);
  if(variant&&entry){variant.root.userData.opening=entry;entry.variants.push(variant);}
}

function toggleOpening(entry) {
  entry.target=entry.target?0:1;entry.from=entry.value;entry.started=performance.now();
  const type=entry.wall.kind==='window'?(entry.wall.operation==='casement'?'双扇外开窗':entry.wall.operation==='casement-single'?'单扇外开窗':entry.wall.operation==='awning'?'卫浴上悬外开窗':'内倒窗'):entry.wall.operation==='slide'?'推拉门':entry.wall.opensTo==='outside'?'外开门':'平开门';
  toast(type+(entry.target?' · 打开':' · 关闭'));requestFrame();
}

function pickOpening(raycaster) {
  const visible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
  const hit=raycaster.intersectObject(roots[state.design],true).find(h=>visible(h.object));
  for(let object=hit?.object;object;object=object.parent)if(object.userData.opening){toggleOpening(object.userData.opening);return true;}
  return false;
}

function facadeBand(parent,home,a,b,width,h,elev,material) {
  const x1=mirror(home,a[0]),x2=mirror(home,b[0]),horizontal=a[1]===b[1];
  block(parent,Math.min(x1,x2)-(horizontal?0:width/2),Math.min(a[1],b[1])-(horizontal?width/2:0),horizontal?Math.abs(x2-x1):width,horizontal?width:Math.abs(a[1]-b[1]),h,elev,material);
}

function makeFacadeRoof(parent,home) {
  const edge=[];
  for(let i=0;i<data.upper.length;i++) {
    const a=data.upper[i],b=data.upper[(i+1)%data.upper.length];edge.push(a);
    if(a[0]===0&&a[1]===16.7&&b[0]===13.8&&data.recess<16.7)edge.push([3.3,16.7],[3.3,data.recess],[6.9,data.recess],[6.9,16.7]);
  }
  for(let i=0;i<edge.length;i++) {
    const a=edge[i],b=edge[(i+1)%edge.length];
    facadeBand(parent,home,a,b,.36,.16,2.98,materials.wallCap);
    facadeBand(parent,home,a,b,.14,.23,3.14,materials.wallCap);
    facadeBand(parent,home,a,b,.20,.045,3.37,materials.windowFrame);
  }
}

function roofSurface(parent,points,material) {
  const vertices=[];
  for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]])vertices.push(...worldPoint(...p).toArray());
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
}

function makePitchedRoof(parent,home) {
  const r=data.pitchedRoof,mx=x=>mirror(home,x),o=r.overhang,front=r.frontY,back=16.7+o,end=13.8+o,wallTop=heights[2];
  const rearStop=data.recess>=16.7?back:data.recess;
  const ridge=r.frontEave+(r.ridgeY-front)*Math.tan(r.pitch*Math.PI/180);
  const top=y=>y<=r.ridgeY?r.frontEave+(y-front)*Math.tan(r.pitch*Math.PI/180):ridge-(y-r.ridgeY)*(ridge-r.backEave)/(back-r.ridgeY);
  const panel=(a,b,c,d)=>{
    const points=[[mx(a),c,top(c)],[mx(b),c,top(c)],[mx(b),d,top(d)],[mx(a),d,top(d)]];
    roofSurface(parent,points,materials.seamRoof);roofSurface(parent,points.map(([x,y,z])=>[x,y,z-.04]),materials.windowFrame);
  };
  // All front surfaces share one plane; the stair roofs no longer overlap the main roof.
  for(const [a,b,start]of [[-o,3.3-o,11.1-o],[3.3-o,10.2+o,front],[10.2+o,end,11.1-o]])panel(a,b,start,r.ridgeY);
  for(const [a,b,stop]of [[-o,3.3,back],[3.3,6.9,rearStop],[6.9,end,back]])panel(a,b,r.ridgeY,stop);
  for(const [a,b,y]of [[0,3.3,11.1],[3.3,10.2,8.5],[10.2,13.8,11.1],[0,3.3,16.7],[3.3,6.9,data.recess],[6.9,13.8,16.7]]) {
    roofSurface(parent,[[mx(a),y,wallTop],[mx(b),y,wallTop],[mx(b),y,top(y)],[mx(a),y,top(y)]],materials.roofInfill);
  }
  for(const [x,a,b]of [[0,11.1,16.7],[3.3,8.5,11.1],[10.2,8.5,11.1],[3.3,data.recess,16.7],[6.9,data.recess,16.7],[13.8,11.1,16.7]]) {
    if(b-a<.001)continue;
    const points=[[mx(x),a,wallTop],[mx(x),b,wallTop],[mx(x),b,top(b)]];
    if(a<r.ridgeY&&b>r.ridgeY)points.push([mx(x),r.ridgeY,ridge]);
    points.push([mx(x),a,top(a)]);roofSurface(parent,points,materials.roofInfill);
  }
  for(let x=-o+.28;x<end;x+=r.seamSpacing) {
    const start=x>=3.3-o&&x<=10.2+o?front:11.1-o,stop=x>3.3&&x<6.9?rearStop:back;
    for(const [a,b]of [[start,r.ridgeY],[r.ridgeY,stop]])roofSurface(parent,[[mx(x-.008),a,top(a)+.012],[mx(x+.008),a,top(a)+.012],[mx(x+.008),b,top(b)+.012],[mx(x-.008),b,top(b)+.012]],materials.windowFrame);
  }
  for(const [a,b,y]of [[-o,3.3-o,11.1-o],[3.3-o,10.2+o,front],[10.2+o,end,11.1-o],[-o,3.3,back],[3.3,6.9,rearStop],[6.9,end,back]])facadeBand(parent,home,[a,y],[b,y],.13,.10,top(y)-.07,materials.windowFrame);
  facadeBand(parent,home,[-o,r.ridgeY],[end,r.ridgeY],.10,.025,ridge+.012,materials.seamRoof);
}

function lowRoofHeight(x,y) {
  const r=data.secondaryRoof;
  return r.eave+(2.1-Math.abs(x-r.ridgeX))*Math.tan(r.pitch*Math.PI/180)+(y-2.2)*Math.tan(r.southPitch*Math.PI/180);
}
function makeLowPitchedRoof(parent,home) {
  const r=data.secondaryRoof,p=data.passageRoof,mx=x=>mirror(home,x),left=3.3-r.overhang,outer=7.5+r.overhang,inner=p.polygon[1][0],front=2.2-r.overhang,joint=p.polygon[0][1],back=p.polygon[2][1];
  const face=(points,material)=>roofSurface(parent,points.map(([x,y,z])=>[mx(x),y,lowRoofHeight(x,y)+z]),material);
  // The two right-hand panels share one plane and edge; no internal gutter or overlapping patch.
  for(const [a,b,c,d]of [[left,r.ridgeX,front,back],[r.ridgeX,outer,front,back],[outer,inner,joint,back]]) {
    for(const [z,material]of [[0,materials.seamRoof],[-.04,materials.windowFrame]])face([[a,c,z],[b,c,z],[b,d,z],[a,d,z]],material);
  }
  for(let y=front+.28;y<back;y+=data.pitchedRoof.seamSpacing)for(const [a,b]of [[left,r.ridgeX],[r.ridgeX,y<joint?outer:inner]])face([[a,y-.008,.012],[b,y-.008,.012],[b,y+.008,.012],[a,y+.008,.012]],materials.windowFrame);
  face([[r.ridgeX-.035,front,.014],[r.ridgeX+.035,front,.014],[r.ridgeX+.035,back,.014],[r.ridgeX-.035,back,.014]],materials.seamRoof);
  const perimeter=[[left,front],[r.ridgeX,front],[outer,front],[outer,joint],[inner,joint],[inner,back],[r.ridgeX,back],[left,back]];
  for(let i=0;i<perimeter.length;i++) {
    const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];
    face([[...a,-.08],[...b,-.08],[...b,-.02],[...a,-.02]],materials.windowFrame);
  }
  for(const [x,a,b]of [[left,front,back],[outer,front,joint],[inner,joint,back]]) {
    face([[x-.06,a,-.05],[x+.06,a,-.05],[x+.06,b,-.05],[x-.06,b,-.05]],materials.windowFrame);
  }
  face([[outer,joint-.06,-.05],[inner,joint-.06,-.05],[inner,joint+.06,-.05],[outer,joint+.06,-.05]],materials.windowFrame);
  const fill=(a,b)=>roofSurface(parent,[[mx(a[0]),a[1],0],[mx(b[0]),b[1],0],[mx(b[0]),b[1],lowRoofHeight(...b)-.04],[mx(a[0]),a[1],lowRoofHeight(...a)-.04]],materials.roofInfill);
  for(const y of [2.2,8.5])for(const [a,b]of [[3.3,r.ridgeX],[r.ridgeX,7.5]])fill([a,y],[b,y]);
  for(const x of [3.3,7.5])fill([x,2.2],[x,8.5]);
  fill([7.5,6.7],[10.2,6.7]);fill([10.2,6.7],[10.2,8.5]);
  fill([7.5,5.0],[10.2,5.0]);fill([10.2,5.0],[10.2,6.7]);
}

function makeSeparatedLink(parent) {
  const [x,y,w,d]=data.rearLink.rect,points=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
  footprint(points,'A',1,parent,0,.18,materials.slab);
  footprint(points,'A',1,parent,-.18,.27,materials.plinth);
  makeRoom({...data.rooms.find(r=>r.id==='rear-link'),design:currentDesign},parent);
  const roof=group(parent);roofGroups.push(roof);
  roofSurface(roof,[[13.65,10.9,3.65],[15.95,10.9,3.65],[15.95,16.9,3.35],[13.65,16.9,3.35]],materials.seamRoof);
  for(const [yy,zz]of [[11.1,3.64],[16.7,3.36]]) {
    block(roof,13.8,yy-.1,2,.20,zz-3.3,3.3,materials.wall);
    block(roof,13.65,yy-.18,2.3,.16,.07,zz-.07,materials.windowFrame);
  }
}

function makeJoinedDining(parent) {
  const h=data.joinedDining,length=(h.partitionEnd-h.partitionStart)/5;
  hallDaily=group(parent);hallFestival=group(parent);
  hallDaily.userData.diningVariant='daily';hallFestival.userData.diningVariant='festival';
  const partition=group(hallDaily);partition.userData.diningPartition=true;
  for(let i=0;i<5;i++) {
    block(partition,h.partitionX-.04,h.partitionStart+i*length,.08,length-.012,2.59,.04,materials.white);
  }
  for(const [i,home]of ['A','B'].entries()) {
    const daily=group(hallDaily),festival=group(hallFestival),[x,y]=h.tableCentres[i];
    homes.push({g:daily,home,level:1},{g:festival,home,level:1});
    roundTable(daily,x,y,h.dailyDiameter,6);roundTable(festival,x,y,h.festivalDiameter,10,i*10);
  }
}

function makeCourtyardEnclosure(parent) {
  const e=data.courtyardEnclosure,[a,y,b]=e.points,w=e.window,left=14.8-w.width/2,right=14.8+w.width/2;
  const wall=group(parent);wall.position.y=data.vertical.outdoorLevel;parent=wall;
  block(parent,a,y-e.width/2,b-a,e.width,w.sill,0,materials.wall);
  block(parent,a,y-e.width/2,left-a,e.width,e.height-w.sill,w.sill,materials.wall);
  block(parent,right,y-e.width/2,b-right,e.width,e.height-w.sill,w.sill,materials.wall);
  block(parent,left,y-e.width/2,w.width,e.width,e.height-w.head,w.head,materials.wall);
  const plinthTop=.55-data.vertical.outdoorLevel,bottom=-.05;
  block(parent,a,y-e.width*.52,b-a,e.width*1.04,Math.min(plinthTop,w.sill)-bottom,bottom,materials.plinth);
  if(plinthTop>w.sill)for(const [x,width]of [[a,left-a],[right,b-right]])block(parent,x,y-e.width*.52,width,e.width*1.04,plinthTop-w.sill,w.sill,materials.plinth);
  block(parent,a-.04,y-.14,b-a+.08,.28,.07,e.height,materials.wallCap);
  for(const x of [left,right-.04])block(parent,x,y-.04,.04,.08,w.head-w.sill,w.sill,materials.windowFrame);
  for(const z of [w.sill,w.head-.04])block(parent,left,y-.04,w.width,.08,.04,z,materials.windowFrame);
  for(const x of [left+.18,left+.99]) {
    for(const xx of [x,x+.59])block(parent,xx,y-.025,.025,.05,.56,w.sill+.18,materials.windowFrame);
    for(const z of [w.sill+.18,w.sill+.715])block(parent,x,y-.025,.615,.05,.025,z,materials.windowFrame);
  }
  block(parent,14.7875,y-.025,.025,.05,w.head-w.sill,w.sill,materials.windowFrame);
}

function makeRearHall(parent) {
  const h=data.rearHall,[x,y,w,d]=h.rect;
  block(parent,x,y,w,d,.18,-.18,materials.slab);
  makeRoom(data.rooms.find(r=>r.id==='rear-link'),parent);
  const roof=group(parent);roofGroups.push(roof);
  roofSurface(roof,[[13.65,10.9,3.65],[15.95,10.9,3.65],[15.95,16.9,3.35],[13.65,16.9,3.35]],materials.seamRoof);
  for(const [yy,zz] of [[11.1,3.64],[16.7,3.36]])block(roof,13.8,yy-.1,2,.20,zz-3.3,3.3,materials.wall);
  block(roof,13.65,16.83,2.3,.14,.12,3.25,materials.windowFrame);
  cylinder(roof,14.0,16.82,.04,3.23,0,materials.windowFrame);
  block(roof,h.partitionX-.06,h.partitionStart,.12,h.partitionEnd-h.partitionStart,.61,2.69,materials.wall);
  block(roof,h.partitionX-.055,h.partitionStart,.11,h.partitionEnd-h.partitionStart,.045,2.64,materials.windowFrame);
  hallDaily=group(parent);hallFestival=group(parent);
  for(let i=0;i<5;i++) {
    const length=(h.partitionEnd-h.partitionStart)/5;
    block(hallDaily,h.partitionX-.04,h.partitionStart+i*length,.08,length-.012,2.59,.04,materials.white);
    block(hallDaily,h.partitionX-.045,h.partitionStart+i*length,.09,.025,2.59,.04,materials.windowFrame);
    block(hallFestival,h.partitionX-length/2,16.23+i*.065,length,.05,2.59,.04,materials.white);
    block(hallFestival,h.partitionX-length/2,16.23+i*.065,.025,.05,2.59,.04,materials.windowFrame);
  }
  for(const home of ['A','B']) {
    const daily=group(hallDaily),festival=group(hallFestival);
    homes.push({g:daily,home,level:1},{g:festival,home,level:1});
    roundTable(daily,mirror(home,12.0),14.6,h.dailyDiameter,6);
    roundTable(festival,mirror(home,12.2),14.6,h.festivalDiameter,10,home==='A'?0:10);
    makeLabel({id:home+'-rear-exit',name:home==='A'?'西侧通道门':'东侧通道门',level:1,home,rect:[mirror(home,-.1,.2),11.25,.2,1.1],kind:'terrace',description:'一层后排公共走廊外端玻璃门向侧院外开；与卧室入口分开。参考洞口1.10米，门净宽、五金及门外高差须深化。'},parent);
  }
}

function makePlanter(parent,home,x,y,size) {
  x=mirror(home,x);cylinder(parent,x,y,.25*size,.42*size,.02,materials.pot);
  cylinder(parent,x,y,.025*size,.55*size,.4*size,materials.wood);
  for(let i=0;i<9;i++)solid(parent,unitSphere,materials.leaf,[x-14.8+Math.cos(i*2.4)*.22*size,(.65+i%3*.16)*size,8.35-y+Math.sin(i*2.4)*.22*size],[.23*size,.16*size,.13*size],i);
}

function makeCourtyardTree(parent) {
  if(data.arrivalGarden)courtyardTreeGroup=parent;
  block(parent,14.15,7.35,1.3,1.3,.03,-.03,materials.woodLine);
  cylinder(parent,14.8,8,.10,2.8,0,materials.wood);
  for(let i=0;i<17;i++)solid(parent,unitSphere,materials.leaf,[Math.cos(i*2.4)*.7,2.6+i%3*.32,.35+Math.sin(i*2.4)*.7],[.65,.55,.62],i);
}

function makeCourtyardGarden(parent) {
  const d=data.courtyardGarden,g=group(parent);g.position.y=data.vertical.outdoorLevel;
  for(const [index,rect] of [d.treeBed,...d.edgeBeds].entries()) {
    const[x,y,w,h]=rect,base=index===0?.025:.09;
    block(g,x,y,w,h,base,.005,materials.plinth);
    block(g,x+.045,y+.045,w-.09,h-.09,.015,base-.005,materials.woodLine);
  }
  for(const[x,y,w,h]of d.edgeBeds)for(let i=0;i<7;i++) {
    const cy=y+.18+i*(h-.36)/6;
    for(let k=0;k<3;k++)solid(g,unitSphere,materials.leaf,[x+w/2-14.8+Math.cos(k*2.1)*.10,.22+k*.04,8.35-cy],[.14,.18,.13],k);
  }
  const[cx,cy]=d.table;
  cylinder(g,cx,cy,.34,.025,.005,materials.patioFrame);cylinder(g,cx,cy,.06,.70,.03,materials.patioFrame);
  cylinder(g,cx,cy,d.tableDiameter/2,.04,.72,materials.patioWood);
  cylinder(g,cx,cy,.25,.12,.035,materials.plinth);
  cylinder(g,cx,cy,.022,d.umbrellaHeight-.22,.155,materials.patioFrame);
  for(let i=0;i<4;i++) {
    const angle=i*Math.PI/2,x=cx+Math.cos(angle)*d.chairRadius,y=cy+Math.sin(angle)*d.chairRadius,seat=group(g);
    seat.position.copy(worldPoint(x,y));seat.rotation.y=Math.PI/2+angle;
    for(const xx of [-.23,.20])for(const yy of [-.23,.20])solid(seat,unitBox,materials.patioFrame,[xx,.23,yy],[.028,.46,.028]);
    solid(seat,unitBox,materials.patioWood,[0,.45,0],[.50,.035,.50]);
    solid(seat,unitBox,materials.linen,[0,.49,0],[.47,.05,.46]);
    for(const xx of [-.235,.235])solid(seat,unitBox,materials.patioFrame,[xx,.63,.22],[.025,.38,.025]);
    solid(seat,unitBox,materials.patioFrame,[0,.80,.22],[.49,.065,.035]);
    solid(seat,unitBox,materials.patioFabric,[0,.68,.215],[.44,.22,.035]);
  }
  const radius=d.umbrellaDiameter/2,top=d.umbrellaHeight,edge=top-.28,vertices=[];
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
    const p=[[cx,cy,top],[cx+radius*Math.cos(a),cy+radius*Math.sin(a),edge],[cx+radius*Math.cos(b),cy+radius*Math.sin(b),edge]];
    vertices.push(...p.flatMap(([x,y,z])=>worldPoint(x,y,z).toArray()));
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();const umbrella=new THREE.Mesh(geo,materials.patioFabric);umbrella.castShadow=true;umbrella.receiveShadow=true;g.add(umbrella);
  for(const[x,y,w,h]of d.drains){block(g,x,y,w,h,.012,.008,materials.patioFrame);for(let t=.06;t<w;t+=.08)block(g,x+t,y+.01,.012,h-.02,.004,.021,materials.dark);}
  makeLabel({id:'courtyard-garden',home:'both',level:1,rect:[cx-.5,cy-.5,1,1],kind:'terrace',name:'四人庭院',description:d.description},parent);
}

function gardenSeason(day) {
  const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  const pulse=(start,end,fade=18)=>smooth(start,start+fade,day)*(1-smooth(end-fade,end,day));
  return {leaf:pulse(65,340,35),autumn:pulse(265,338,22),winter:1-pulse(65,330,30),
    crape:pulse(155,266,22),gardenia:pulse(135,207,18),azalea:pulse(65,145,20),
    camellia:Math.max(pulse(-30,105,20),pulse(315,470,20)),osmanthus:pulse(252,303,14)};
}
function updateLandscapeSeason(day) {
  if(!landscapePlants.length)return;
  const p=gardenSeason(day),leaf=new THREE.Color();
  for(const [key,spec]of Object.entries(landscapePalette)) {
    leaf.set(spec.leaf);
    if(key==='crape')leaf.lerp(new THREE.Color(0xb88a4b),p.autumn*.85);
    if(key==='nandina')leaf.lerp(new THREE.Color(0x9a6552),p.winter*.8+p.autumn*.4);
    if(spec.autumn)leaf.lerp(new THREE.Color(spec.autumn),p.autumn*.95);
    if(key==='azalea')leaf.lerp(new THREE.Color(0x645f46),p.winter*.25);
    materials['gardenLeaf_'+key].color.copy(leaf);
    if(spec.bloom)materials['gardenBloom_'+key].color.copy(leaf).lerp(new THREE.Color(spec.bloom),p[key]??0);
  }
  if(materials.estateGrass)materials.estateGrass.color.set(0x85956f).lerp(new THREE.Color(0xb3a77e),Math.min(1,p.winter*.85+p.autumn*.3));
  if(materials.estateMeadow)materials.estateMeadow.color.set(0x929c7d).lerp(new THREE.Color(0xaaa48a),p.winter*.55);
  for(const plant of landscapePlants)if(plant.species==='crape'||plant.deciduous) {
    plant.leaves.visible=p.leaf>.015;plant.leaves.scale.setScalar(.05+.95*p.leaf);
    plant.flowers.visible=p.leaf>.015;plant.flowers.scale.setScalar(.05+.95*p.leaf);
  }
}
function makeGardenPlant(parent,species,x,y,size=1,id='') {
  const spec=landscapePalette[species],g=group(parent);g.position.copy(worldPoint(x,y));
  g.userData.gardenPlant={species,id};
  const leaves=group(g),flowers=group(g),leaf=materials['gardenLeaf_'+species];
  landscapePlants.push({species,leaves,flowers});
  if(species==='crape') {
    leaves.position.y=2.75;flowers.position.y=2.75;
    const branch=(a,b,r)=>{
      const direction=new THREE.Vector3().subVectors(b,a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r,direction.length(),8),materials.gardenBark);
      mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.castShadow=true;g.add(mesh);
    };
    for(let i=0;i<3;i++) {
      const angle=i*2.1,base=new THREE.Vector3(Math.cos(angle)*.08,0,Math.sin(angle)*.08),fork=new THREE.Vector3(Math.cos(angle)*.3,1.8,Math.sin(angle)*.3);
      branch(base,fork,.045);
      for(let k=0;k<3;k++) {
        const t=angle+k*.9-.9,tip=new THREE.Vector3(Math.cos(t)*.86,2.75+(i+k)%3*.17,Math.sin(t)*.86);branch(fork,tip,.023);
      }
    }
    for(let i=0;i<25;i++) {
      const angle=i*2.4,r=.28+(i%5)*.16,point=[Math.cos(angle)*r,2.45+(i%4)*.21,Math.sin(angle)*r];
      solid(leaves,unitSphere,leaf,[point[0],point[1]-2.75,point[2]],[.38,.31,.35],i);
      if(i%2===0)solid(flowers,unitSphere,materials.gardenBloom_crape,[point[0],point[1]+.22-2.75,point[2]],[.15,.11,.13],i);
    }
  } else if(species==='mondo') {
    for(let i=0;i<7;i++)solid(leaves,unitSphere,leaf,[Math.cos(i*2.4)*.05,.10,Math.sin(i*2.4)*.05],[.035,.12,.025],i);
  } else {
    const h=spec.height*size,r=h*.48;
    for(let i=0;i<7;i++) {
      const angle=i*2.4,px=Math.cos(angle)*r*.5,pz=Math.sin(angle)*r*.5,py=h*(.45+i%3*.12);
      solid(leaves,unitSphere,leaf,[px,py,pz],[r*.7,h*.30,r*.7],i);
      if(spec.bloom&&species!=='nandina')solid(flowers,unitSphere,materials['gardenBloom_'+species],[px,py+h*.24,pz],[.06,.035,.06],i);
    }
  }
}
function makeArrivalCar(parent,p) {
  const [x,y,w,d]=p.rect,g=group(parent);g.position.copy(worldPoint(x+w/2,y+d/2));g.rotation.y=p.heading*Math.PI/180;
  g.userData.parking=p.id;arrivalCarGroups.push(g);
  const paint=p.home==='A'?materials.carStone:materials.carClay;
  solid(g,unitBox,paint,[0,.58,0],[4.65,.62,1.90]);
  solid(g,unitBox,paint,[-.22,1.08,0],[2.75,.55,1.75]);
  solid(g,unitBox,materials.carGlazing,[.10,1.18,0],[2.25,.38,1.78]);
  solid(g,unitBox,paint,[-.22,1.43,0],[2.55,.06,1.73]);
  for(const xx of [-1.45,1.40])for(const zz of [-.92,.92]) {
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.16,20),materials.carTyre);tire.rotation.x=Math.PI/2;tire.position.set(xx,.33,zz);g.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.17,16),materials.carRim);rim.rotation.x=Math.PI/2;rim.position.copy(tire.position);g.add(rim);
  }
  for(const zz of [-.63,.63])solid(g,unitBox,materials.white,[2.33,.70,zz],[.025,.10,.42]);
  solid(g,unitBox,materials.carTyre,[2.335,.43,0],[.025,.19,.8]);
}
function makeEstateTree(parent,t) {
  const spec=landscapePalette[t.species],g=group(parent),h=t.height,r=t.spread/2;
  g.position.copy(worldPoint(...t.point));g.userData.gardenPlant={species:t.species,id:t.id};g.userData.unbakedPlant=true;
  const leaves=group(g),flowers=group(g);leaves.position.y=flowers.position.y=h*.72;
  landscapePlants.push({species:t.species,leaves,flowers,deciduous:!!spec.deciduous});
  const branch=(a,b,radius)=>{
    const direction=new THREE.Vector3().subVectors(b,a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.5,radius,direction.length(),8),materials.gardenBark);
    mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.castShadow=true;g.add(mesh);
  };
  const fork=new THREE.Vector3(0,h*.54,0);branch(new THREE.Vector3(),fork,.105);
  for(let i=0;i<6;i++){const a=i*2.4;branch(fork,new THREE.Vector3(Math.cos(a)*r*.6,h*(.79+i%3*.025),Math.sin(a)*r*.6),.047);}
  for(let i=0;i<23;i++) {
    const a=i*2.4,rr=r*(.15+i%5*.11),px=Math.cos(a)*rr,pz=Math.sin(a)*rr,py=(i%4-1.5)*h*.065;
    solid(leaves,unitSphere,materials['gardenLeaf_'+t.species],[px,py,pz],[r*.37,h*.13,r*.34],i);
    if(spec.bloom&&i%2===0)solid(flowers,unitSphere,materials['gardenBloom_'+t.species],[px,py+h*.1,pz],[.06,.04,.06],i);
  }
}
function makeEstateBench(parent,rect,facing='south') {
  const[x,y,w,d]=rect,horizontal=w>d;
  block(parent,x,y,w,d,.06,.40,materials.patioWood);
  if(horizontal)for(const xx of [x+.15,x+w-.27])block(parent,xx,y+.05,.12,d-.1,.38,.02,materials.arrivalStone);
  else for(const yy of [y+.15,y+d-.27])block(parent,x+.05,yy,w-.1,.12,.38,.02,materials.arrivalStone);
  if(horizontal) {
    for(const xx of [x+.12,x+w-.15])block(parent,xx,y+d-.06,.03,.03,.42,.38,materials.patioFrame);
    block(parent,x+.06,y+d-.055,w-.12,.035,.21,.60,materials.patioWood);
  } else {
    const back=facing==='west'?x+w-.055:x+.025;
    for(const yy of [y+.12,y+d-.15])block(parent,back,yy,.03,.03,.42,.38,materials.patioFrame);
    block(parent,back,y+.06,.035,d-.12,.21,.60,materials.patioWood);
  }
}
function makeEstateChair(parent,x,y) {
  const g=group(parent);g.position.copy(worldPoint(x,y));
  for(const xx of [-.25,.25])for(const zz of [-.25,.25])solid(g,unitBox,materials.patioFrame,[xx,.24,zz],[.03,.48,.03]);
  solid(g,unitBox,materials.patioWood,[0,.45,0],[.56,.045,.56]);
  solid(g,unitBox,materials.patioFabric,[0,.49,0],[.51,.05,.51]);
  for(const xx of [-.25,.25])solid(g,unitBox,materials.patioFrame,[xx,.65,.25],[.03,.40,.03]);
  solid(g,unitBox,materials.patioFabric,[0,.72,.25],[.50,.25,.04]);
}
function makeEstateRamp(parent,r) {
  const g=group(parent);g.userData.estateFeature='ramp';
  const[x,y,w,d]=r.rect,[hx,hy,hw,hd]=r.headLanding;
  block(g,hx,hy,hw,hd,r.rise-.001,.0,materials.arrivalStone);
  siteRect(g,r.headLanding,materials.estateTerrace,r.rise);
  const points=[[x,y,r.rise],[x+w,y,r.toe],[x+w,y+d,r.toe],[x,y+d,r.rise],[x,y,-.06],[x+w,y,-.06],[x+w,y+d,-.06],[x,y+d,-.06]];
  const indices=[0,1,2,0,2,3,4,7,6,4,6,5,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(i=>worldPoint(...points[i]).toArray()),3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(indices.flatMap(i=>[points[i][0],points[i][1]]),2));geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,materials.estateTerrace);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
  const beam=(a,b)=>{const direction=new THREE.Vector3().subVectors(b,a),rail=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,direction.length(),10),materials.guardMetal);rail.position.copy(a).add(b).multiplyScalar(.5);rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());g.add(rail);};
  for(const yy of [y+.04,y+d-.04]) {
    beam(worldPoint(x,yy,r.rise+r.handrail),worldPoint(x+w,yy,r.toe+r.handrail));
    for(let i=0;i<=6;i++){const xx=x+w*i/6,z=r.rise+(r.toe-r.rise)*i/6;cylinder(g,xx,yy,.017,r.handrail,z,materials.guardMetal);}
  }
  for(const[a,b]of [[[hx+.04,r.entryY[1]+.05],[hx+.04,hy+hd-.04]],[[hx+.04,hy+hd-.04],[hx+hw-.04,hy+hd-.04]],[[hx+hw-.04,hy+.05],[hx+hw-.04,y+.04]]]) {
    beam(worldPoint(...a,r.rise+r.handrail),worldPoint(...b,r.rise+r.handrail));
    for(const p of[a,b])cylinder(g,...p,.017,r.handrail,r.rise,materials.guardMetal);
  }
}
function makeEstatePavilion(parent,p) {
  const[cx,cy]=p.center,g=group(parent);g.userData.gardenBakeGroup='pavilion';g.userData.estateFeature='pavilion';
  const half=p.size/2,post=half-.15,beam=p.eaveHeight-.22;
  block(g,cx-half,cy-half,p.size,p.size,.119,-.10,materials.arrivalStone);
  siteRect(g,[cx-half,cy-half,p.size,p.size],materials.estateTerrace,.020);
  for(const xx of [-post,post])for(const yy of [-post,post])block(g,cx+xx-.075,cy+yy-.075,.15,.15,p.eaveHeight-.02,.02,materials.guardMetal);
  for(const yy of [-post,post])block(g,cx-post-.075,cy+yy-.08,post*2+.15,.16,.22,beam,materials.patioWood);
  for(const xx of [-post,post])block(g,cx+xx-.08,cy-post-.075,.16,post*2+.15,.22,beam,materials.patioWood);
  const roof=group(g);roofGroups.push(roof);const r=p.eaveSize/2,corners=[[-r,-r],[r,-r],[r,r],[-r,r]];
  block(roof,cx-r+.035,cy-r+.035,p.eaveSize-.07,p.eaveSize-.07,.06,p.eaveHeight-.11,materials.patioWood);
  for(let xx=cx-r+.08;xx<cx+r-.08;xx+=.085)block(roof,xx,cy-r+.08,.06,p.eaveSize-.16,.025,p.eaveHeight-.135,materials.patioWood);
  for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];roofSurface(roof,[[cx+a[0],cy+a[1],p.eaveHeight],[cx+b[0],cy+b[1],p.eaveHeight],[cx,cy,p.peakHeight]],materials.seamRoof);}
  for(const yy of [-r,r])block(roof,cx-r,cy+yy-.035,p.eaveSize,.07,.08,p.eaveHeight-.08,materials.guardMetal);
  for(const xx of [-r,r])block(roof,cx+xx-.035,cy-r,.07,p.eaveSize,.08,p.eaveHeight-.08,materials.guardMetal);
  makeEstateBench(g,[cx-1.75,cy+1.55,2.6,.50]);makeEstateBench(g,[cx+1.55,cy-1.0,.50,2.6],'west');
  for(const xx of [cx-1.1,cx+1.1])makeEstateChair(g,xx,cy-1.35);
  for(const xx of [cx-.60,cx+.55])for(const yy of [cy-.15,cy+.35])block(g,xx,yy,.045,.045,.35,.02,materials.patioFrame);
  block(g,cx-.75,cy-.25,1.5,.75,.045,.37,materials.patioWood);
  cylinder(roof,cx,cy,.065,.10,p.eaveHeight-.23,materials.guardMetal);cylinder(roof,cx,cy,.012,.10,p.eaveHeight-.17,materials.guardMetal);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;solid(roof,unitBox,materials.patioWood,[cx-14.8+Math.cos(a)*.40,p.eaveHeight-.21,8.35-cy+Math.sin(a)*.40],[.80,.025,.11],a);}
  makeLabel({id:'east-pavilion',home:'both',level:1,rect:[cx-1,cy-1,2,2],kind:'terrace',name:p.name,description:p.description},g);
}
function makeEstateGarden(parent,e) {
  const g=group(parent);g.userData.gardenBakeGroup='garden';g.userData.estateFeature='garden';parent.userData.estate=true;
  const shape=new THREE.Shape(e.outline.map(([x,y])=>new THREE.Vector2(x,y))),hole=new THREE.Path([[-1.2,-1.9],[-1.2,18.3],[30.8,18.3],[30.8,-1.9]].map(([x,y])=>new THREE.Vector2(x,y)));shape.holes.push(hole);
  const ground=new THREE.ShapeGeometry(shape);ground.rotateX(-Math.PI/2);ground.translate(-14.8,.005,8.35);const meadow=new THREE.Mesh(ground,materials.estateMeadow);meadow.receiveShadow=true;g.add(meadow);
  block(g,...e.lawn.rect,.008,.007,materials.estateGrass);
  siteRect(g,e.terrace,materials.estateTerrace,.020);
  for(const pad of e.restPads??[])siteRect(g,pad,materials.estateTerrace,.020);
  for(const p of e.paths) {
    siteRibbon(g,p.points,p.width+.12,materials.estateEdge,.019,5);
    siteRibbon(g,p.points,p.width,materials.estatePath,.020,6);
  }
  for(const patch of e.shrubPatches) {
    const[x,y,w,d]=patch.rect,cx=x+w/2,cy=y+d/2,outline=[];
    for(let i=0;i<32;i++){const a=i*Math.PI/16,r=1+.04*Math.sin(a*3);outline.push([cx+Math.cos(a)*w*.5*r,cy+Math.sin(a)*d*.5*r]);}
    sitePatch(g,outline,materials.gardenSoil,.008,3);
    const cols=Math.max(2,Math.ceil(w/.85)),rows=Math.max(2,Math.ceil(d/.85));
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
      const nx=(col+.5)/cols,ny=(row+.5)/rows;if((nx*2-1)**2+(ny*2-1)**2>.93)continue;
      const species=patch.species[(Math.floor(col/2)+Math.floor(row/2))%2],spec=landscapePalette[species],px=x+nx*w,py=y+ny*d,h=spec.height*1.1;
      if(e.trees.some(t=>Math.hypot(px-t.point[0],py-t.point[1])<.60))continue;
      for(let k=0;k<3;k++)solid(g,unitSphere,materials['gardenLeaf_'+species],[px-14.8+Math.cos(k*2.4)*h*.16,h*(.48+k*.10),8.35-py+Math.sin(k*2.4)*h*.16],[h*.32,h*.30,h*.31],k);
      if(spec.bloom&&species!=='nandina')solid(g,unitSphere,materials['gardenBloom_'+species],[px-14.8,h*.83,8.35-py],[.065,.04,.065]);
    }
    for(let i=0;i<Math.ceil(w/.65);i++) {
      const px=x+.2+i*(w-.4)/Math.max(1,Math.ceil(w/.65)-1);
      for(let k=0;k<3;k++)solid(g,unitSphere,materials.gardenLeaf_mondo,[px-14.8+k*.025,.10,8.35-y-.12],[.035,.12,.03],k);
    }
  }
  for(const t of e.trees)makeEstateTree(g,t);
  for(const b of e.benches)makeEstateBench(g,b.rect,b.facing);
  makeEstateRamp(g,e.ramp);makeEstatePavilion(g,e.pavilion);
}

function makeArrivalLandscape(parent) {
  const d=data.arrivalGarden;if(!d)return;
  landscapePalette=d.species;
  for(const[key,spec]of Object.entries(d.surfacePalette))makeSurfaceMaterial(materials[key],spec);
  for(const [key,spec]of Object.entries(d.species)) {
    mat('gardenLeaf_'+key,new THREE.Color(spec.leaf),{roughness:.95}).userData.seasonal=true;
    if(spec.bloom)mat('gardenBloom_'+key,new THREE.Color(spec.bloom),{roughness:.95}).userData.seasonal=true;
  }
  const g=group(parent);arrivalGardenGroup=g;g.position.y=data.vertical.outdoorLevel;
  siteRibbon(g,d.drive.points,d.drive.width,materials.arrivalConcrete,.020,6);
  for(const rect of [d.forecourt,...d.sideCourts])siteRect(g,rect,materials.arrivalConcrete,.020);
  for(const p of d.parking) {
    const[x,y,w,h]=p.rect;siteRect(g,p.rect,materials.arrivalPaver,.021);
    for(const r of [[x,y,w,.045],[x,y+h-.045,w,.045],[x,y,.045,h],[x+w-.045,y,.045,h]])siteRect(g,r,materials.estateTerrace,.022);
    makeArrivalCar(g,p);
  }
  for(const rect of d.clearRoutes)siteRect(g,rect,materials.estateTerrace,.023);
  for(const bed of d.beds) {
    const[x,y,w,h]=bed.rect;block(g,x,y,w,h,.065,.018,materials.arrivalStone);
    block(g,x+.045,y+.045,w-.09,h-.09,.015,.074,materials.gardenSoil);
    for(let i=0;i<Math.max(4,Math.floor(w/.38));i++)makeGardenPlant(g,'mondo',x+.16+i*(w-.32)/(Math.max(4,Math.floor(w/.38))-1),y+.16,1,bed.id+'-edge-'+i);
    if(bed.species.length>1)for(let i=0;i<5;i++) {
      const species=bed.species[i%2],px=x+.38+(i%3)*(w-.76)/2,py=y+.42+Math.floor(i/3)*(h-.78);
      makeGardenPlant(g,species,px,py,.85,bed.id+'-'+i);
    }
  }
  for(const t of d.trees)makeGardenPlant(g,t.species,...t.point,1,t.id);
  const[x,y,w,h]=d.bench;
  block(g,x,y,w,h,.38,.02,materials.arrivalStone);block(g,x-.015,y-.015,w+.03,h+.03,.05,.40,materials.patioWood);
  for(let xx=x+.08;xx<x+w;xx+=.11)block(g,xx,y,.008,h,.003,.45,materials.woodLine);
  const drain=d.drain;siteRibbon(g,drain.points,drain.width,materials.patioFrame,.024,7);
  if(courtyardTreeGroup) {
    const flowers=group(courtyardTreeGroup);
    for(let i=0;i<25;i++)solid(flowers,unitSphere,materials.gardenBloom_osmanthus,[Math.cos(i*2.4)*.88,2.9+i%3*.27,.35+Math.sin(i*2.4)*.88],[.055,.035,.05],i);
    landscapePlants.push({species:'osmanthus',flowers});
  }
  if(d.estate)makeEstateGarden(g,d.estate);
  updateLandscapeSeason(d.displayDay);
}

function siteRect(parent,[x,y,w,d],material,elev) {
  sitePatch(parent,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],material,elev,6);
}
function sitePatch(parent,points,material,elev=-.25,order=2) {
  const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
  const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.translate(-14.8,elev,8.35);
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.renderOrder=order;parent.add(mesh);
}
function siteRibbon(parent,points,width,material,elev,order=3) {
  const left=[],right=[];
  points.forEach((p,i)=>{
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const dx=-(b[1]-a[1])*width/(2*len),dy=(b[0]-a[0])*width/(2*len);
    left.push([p[0]+dx,p[1]+dy]);right.push([p[0]-dx,p[1]-dy]);
  });
  sitePatch(parent,[...left,...right.reverse()],material,elev,order);
}
function siteText(parent,text,x,y,elev,height=4.2) {
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  ctx.font='600 48px "PingFang SC","Microsoft YaHei",sans-serif';
  canvas.width=Math.ceil(ctx.measureText(text).width)+32;canvas.height=80;
  ctx.fillStyle='rgba(250,249,244,.88)';ctx.fillRect(0,0,canvas.width,80);
  ctx.font='600 48px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillStyle='#344b3b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,42);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.position.copy(worldPoint(x,y,elev));sprite.scale.set(height*canvas.width/80,height,1);parent.add(sprite);
}
function makeSiteContext(parent,context) {
  siteContextInfo=context;
  $('#site-view')?.style.setProperty('display','inline-block');
  sitePatch(parent,context.bounds,materials.field0,-.27,1);
  for(const field of context.fields) {
    sitePatch(parent,field.points,materials['field'+field.tone]);
    siteRibbon(parent,[...field.points,field.points[0]],.25,materials.fieldEdge,-.242);
  }
  siteRibbon(parent,context.road.points,context.road.width,materials.villageRoad,-.235,4);
  if(!data.arrivalGarden)for(const path of context.accessPaths)siteRibbon(parent,path.points,path.width,materials.accessPaving,-.232,3.5);
  siteRibbon(parent,context.frontRoad.points,context.frontRoad.width,materials.villageRoad,-.235,4);
  sitePatch(parent,context.pond,materials.pond,-.23,5);
  sitePatch(parent,context.northPond,materials.pond,-.23,5);
  siteScenery=group(parent);siteNotes=group(parent);
  for(const n of context.neighbours) {
    const [x,y]=n.point,[w,d]=n.size;
    block(siteScenery,x-w/2,y-d/2,w,d,n.height,-.25,materials.neighbourWall,n.angle);
    const a=w/2+.3,b=d/2+.3,h=1.7;
    const vertices=[-a,0,b,a,0,b,0,h,b, -a,0,-b,0,h,-b,a,0,-b,
      -a,0,-b,-a,0,b,0,h,b, -a,0,-b,0,h,b,0,h,-b,
      a,0,b,a,0,-b,0,h,-b, a,0,b,0,h,-b,0,h,b];
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
    const roof=new THREE.Mesh(geometry,materials.neighbourRoof);roof.position.copy(worldPoint(x,y,n.height-.25));roof.rotation.y=n.angle;roof.castShadow=true;siteScenery.add(roof);
  }
  for(const t of context.trees) {
    const [x,y]=t.point;
    cylinder(siteScenery,x,y,.10,t.height-.8,-.25,materials.woodLine);
    for(let i=0;i<5;i++)solid(siteScenery,unitSphere,materials.leaf,[x-14.8+Math.cos(i*2.4)*t.radius*.4,t.height-1+i%2*.35,8.35-y+Math.sin(i*2.4)*t.radius*.4],[t.radius*.75,t.radius*.65,t.radius*.75],i);
  }
  sitePatch(siteScenery,[[39.94,20.5],[40.06,20.5],[40.06,25],[39.94,25]],materials.windowFrame,-.18,6);
  sitePatch(siteScenery,[[40,26.5],[39.2,24.8],[40.8,24.8]],materials.windowFrame,-.18,6);
  siteText(siteScenery,'北',40,28,.3,2.8);
  for(const label of context.labels)siteText(siteNotes,label.text,...label.point,label.height);
}

function roomGeometry(room,inset=.23) {
  const [x,y,w,d]=room.rect;
  if(!room.polygon)return new THREE.PlaneGeometry(w-inset,d-inset);
  const shape=new THREE.Shape(room.polygon.map(([a,b])=>new THREE.Vector2(a-x-w/2,b-y-d/2)));
  return new THREE.ShapeGeometry(shape);
}
function makeRoom(room,parent) {
  if(room.kind==='stairs') {makeLabel(room,parent);return;}
  if(facadeChanges&&room.design==='original'&&room.kind==='bath')room={...room,description:(room.access==='switchable'?room.description:room.access==='public'?'从公共走廊进入。':'从相邻卧室进入。')+'设淋浴区、坐便器和洗手盆。洁具尺寸、门扇开启、排水与防水仍须深化。'+(room.ventilationNote||'')};
  const [x,y,w,d]=room.rect;
  const material=facadeChanges&&room.design==='original'?floorMaterials[room.floorFinish]:new THREE.MeshStandardMaterial({color:colors[room.kind]||0xdedccc,roughness:1});
  const continuousDining=facadeChanges&&room.design==='original'&&room.level===1&&(room.kind==='dining'||room.id==='rear-link'||room.corridorAnnex);
  const geometry=roomGeometry(room,continuousDining?0:.23);
  if(material.userData.floorFinish) {
    const uv=geometry.attributes.uv,position=geometry.attributes.position,shift=data.joinedLayout.homeShift[room.home]??0;
    for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)+x+w/2+shift,position.getY(i)+y+d/2);
  }
  const mesh=new THREE.Mesh(geometry,material);
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(worldPoint(x+w/2,y+d/2,.008));
  mesh.receiveShadow=true;mesh.userData.room=room;parent.add(mesh);roomMeshes.push(mesh);
  makeLabel(room,parent);
}
function makeLabel(room,parent) {
  room={...room,design:currentDesign};
  const el=document.createElement('button');el.className='room-label '+(room.kind==='elder'?'elder ':'')+(['service','stairs'].includes(room.kind)?'small':'');
  el.dataset.kind=room.kind;
  el.textContent=room.name;
  if(room.bedLabel){const spec=document.createElement('span');spec.className='bed-size';spec.textContent=room.bedLabel;el.append(spec);}
  el.setAttribute('aria-label',room.name+(room.bedLabel?'，'+room.bedLabel:'')+'，查看说明');
  el.addEventListener('click',e=>{if(e.detail===0||room.id==='east-pavilion')selectRoom(room);});$('#labels').append(el);
  const [x,y,w,d]=room.rect;
  labels.push({el,room,parent,point:worldPoint(x+w/2,y+d/2,.82)});
}

function makeBed(parent,bed) {
  const {x,y,w,d}=bed;
  block(parent,x,y,w,d,.22,.08,materials.wood);
  block(parent,x+.025,y+.025,w-.05,d-.05,.22,.30,materials.white);
  block(parent,x+.025,y+.025,w-.05,d- .55,.035,.52,materials.blanket);
  block(parent,x-.025,y+d-.07,w+.05,.09,.90,0,materials.lightWood);
  for(const xx of [x+.10,x+w/2+.04])block(parent,xx,y+d-.46,w/2-.16,.31,.09,.52,materials.pillow);
  const room=data.rooms.find(r=>r.level===bed.level&&r.home===bed.home&&r.rect[0]<=x&&r.rect[0]+r.rect[2]>=x+w&&r.rect[1]<=y&&r.rect[1]+r.rect[3]>=y+d);
  if(room) {
    const [rx,ry,rw]=room.rect;
    block(parent,rx+rw-1.55,ry+.18,1.4,.60,2.05,0,materials.lightWood);
    block(parent,x+w+.10,y+d-.5,.42,.43,.43,0,materials.lightWood);
  }
}

function makeOriginalBed(parent,bed) {
  const {x,y,w,d,head}=bed,vertical=head==='south'||head==='north',start=head==='west'||head==='south';
  block(parent,x,y,w,d,.22,.08,materials.wood);
  block(parent,x+.025,y+.025,w-.05,d-.05,.22,.30,materials.white);
  if(vertical) {
    block(parent,x+.025,y+(start?.55:.025),w-.05,d-.58,.035,.52,materials.blanket);
    block(parent,x,start?y:y+d-.08,w,.08,.88,0,materials.lightWood);
  } else {
    block(parent,x+(start?.55:.025),y+.025,w-.58,d-.05,.035,.52,materials.blanket);
    block(parent,start?x:x+w-.08,y,.08,d,.88,0,materials.lightWood);
  }
  const count=bed.mattress?.[0]<=1.2?1:2,side=vertical?w:d,pillow=Math.min(.65,(side-.3)/count);
  for(let i=0;i<count;i++) {
    const offset=(i+.5)*side/count-pillow/2;
    if(vertical)block(parent,x+offset,start?y+.12:y+d-.47,pillow,.31,.09,.52,materials.pillow);
    else block(parent,start?x+.12:x+w-.47,y+offset,.31,pillow,.09,.52,materials.pillow);
  }
}
function makeBedroomDesk(parent,desk) {
  const [x,y,w,d]=desk.rect;
  block(parent,x,y,w,d,.04,.70,materials.lightWood);
  for(const xx of [x+.05,x+w-.095])for(const yy of [y+.05,y+d-.095])block(parent,xx,yy,.045,.045,.70,0,materials.metal);
  const rear=desk.chair[2]===0?y+d-.07:y+.03;
  block(parent,x+.08,rear,.28,.04,.025,.74,materials.wood);
  block(parent,x+.10,y+d/2-.08,.22,.16,.018,.74,materials.white);
  const seat=chair(parent,...desk.chair);seat.scale.y=.88;
}

function makeOriginalFixtures(parent,home,level) {
  const mx=(x,w=0)=>mirror(home,x,w);
  if(facadeStudy) {
    for(const room of data.rooms.filter(r=>r.home===home&&r.level===level&&r.kind==='bath'))makeFacadeBathroom(parent,room);
  } else {
  makeBathroom(parent,mx(3.3,1.8),12.5,1.8,2.4,home,false,false);
  if(level>1)makeBathroom(parent,mx(5.1,1.8),12.5,1.8,2.4,home,false,false);
  if(level<3)makeBathroom(parent,mx(3.3,2.8),6.7,2.8,1.8,home,false,false);
  }
  if(level===1) {
    block(parent,mx(7.05,.6),12.7,.6,3.7,.83,0,materials.lightWood);
    block(parent,mx(7.05,.6),12.7,.6,3.7,.06,.83,materials.white);
    for(const y of [14.2,14.6])cylinder(parent,mx(7.35),y,.13,.02,.91,materials.dark);
    block(parent,mx(7.14,.42),15.6,.42,.6,.02,.9,materials.water);
    if(!facadeChanges||!(data.rearHall||data.joinedDining))roundTable(parent,mx(12),14.55,1.8,12);
    if(!facadeStudy) {
    block(parent,mx(6.3,.85),3.3,.85,2.5,.35,.1,materials.sofa);
    block(parent,mx(7,.15),3.3,.15,2.5,.4,.45,materials.sofa);
    makeSofa(parent,mx(4.6,1.8),2.45,1.8,.85);
    block(parent,mx(4.75,1.1),3.8,1.1,.65,.35,0,materials.lightWood);
    block(parent,mx(3.5,.08),3.4,.08,1.5,.8,.9,materials.dark);
    }
  }
  if(level===3&&home==='B'&&!facadeStudy) {
    makeSofa(parent,mx(8,4.2),15.5,4.2,.85);
    block(parent,mx(9,2.2),14.2,2.2,.7,.35,0,materials.lightWood);
  }
  if(facadeStudy)makeFacadeLiving(parent,home,level);
}

function makeFacadeLiving(parent,home,level) {
  const mx=(x,w=0)=>mirror(home,x,w);
  function sideSofa(x,y,length,faceRight) {
    block(parent,mx(x,.85),y,.85,length,.23,.1,materials.wood);
    block(parent,mx(x,.85),y,.85,length,.20,.33,materials.sofa);
    block(parent,mx(faceRight?x:x+.69,.16),y,.16,length,.38,.44,materials.sofa);
    for(const yy of [y,y+length-.13])block(parent,mx(x,.85),yy,.85,.13,.26,.42,materials.sofa);
  }
  if(level===1) {
    if(facadeChanges&&data.joinedLayout&&home==='A') {
      makeSofa(parent,mx(3.65,3),2.65,3,.85);
      block(parent,mx(4.6,1.1),4.0,1.1,.60,.35,0,materials.lightWood);
      block(parent,mx(4.1,1.4),5.08,1.4,.06,.8,1.0,materials.dark);
      block(parent,mx(3.85,1.8),4.84,1.8,.30,.38,0,materials.lightWood);
    } else if(facadeChanges&&data.joinedLayout) {
      makeSofa(parent,mx(3.65,3),2.65,3,.85);
      block(parent,mx(4.6,1.1),4.2,1.1,.65,.35,0,materials.lightWood);
      block(parent,mx(3.55,2),6.58,2,.06,.9,1.05,materials.dark);
      block(parent,mx(3.5,2.1),6.26,2.1,.38,.38,0,materials.lightWood);
    } else {
      sideSofa(3.65,3.0,3.0,true);
      block(parent,mx(5.2,1.1),4.0,1.1,.7,.35,0,materials.lightWood);
      block(parent,mx(7.365,.06),3.4,.06,1.6,.9,1.05,materials.dark);
      block(parent,mx(6.98,.38),3.35,.38,1.7,.38,0,materials.lightWood);
    }
    block(parent,mx(10.9,1.2),1.65,1.2,.35,.9,0,materials.lightWood);
    block(parent,mx(10.25,1.3),5.0,1.3,.65,.72,0,materials.lightWood);
    for(const x of [10.55,11.25]) {
      chair(parent,mx(x),4.6,0,0);chair(parent,mx(x),6.05,Math.PI,0);
    }
  }
  if(level===2&&!data.joinedLayout) {
    sideSofa(10.9,3.25,2.5,false);
    block(parent,mx(9.2,.8),4.0,.8,1.2,.35,0,materials.lightWood);
    block(parent,mx(7.575,.06),3.2,.06,1.6,.9,1.05,materials.dark);
    block(parent,mx(7.63,.36),3.15,.36,1.7,.38,0,materials.lightWood);
  }
  if(level===3&&home==='B'&&facadeChanges&&data.entertainmentExpansion) {
    const f=data.entertainmentExpansion.furniture;
    makeSofa(parent,...f.sofa,true);
    block(parent,...f.table,.35,0,materials.lightWood);
    block(parent,...f.tv,.9,1.05,materials.dark);
    block(parent,...f.console,.38,0,materials.lightWood);
  } else if(level===3&&home==='B') {
    makeSofa(parent,mx(8.4,3.2),15.35,3.2,.85,true);
    block(parent,mx(9.3,1.2),14.1,1.2,.6,.35,0,materials.lightWood);
    block(parent,mx(8.8,1.8),12.575,1.8,.06,.9,1.05,materials.dark);
    block(parent,mx(8.75,1.9),12.64,1.9,.36,.38,0,materials.lightWood);
  }
}

function chair(parent,x,y,angle,number) {
  // angle is measured in the plan; the back faces away from the table.
  const g=group(parent);g.position.copy(worldPoint(x,y));g.rotation.y=angle;
  function local(cx,cz,w,d,h,elev,material) {
    solid(g,unitBox,material,[cx,elev+h/2,cz],[w,h,d]);
  }
  local(0,0,.44,.44,.08,.43,materials.seat);
  local(0,.20,.44,.065,.39,.48,materials.wood);
  for(const xx of [-.16,.16])for(const zz of [-.16,.16])local(xx,zz,.045,.045,.43,0,materials.wood);
  if(number) {
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f5edda';ctx.fillRect(0,0,64,64);
    ctx.fillStyle='#465740';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(number,32,33);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.25,.25),new THREE.MeshBasicMaterial({map:texture}));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=.479;g.add(mesh);
  }
  return g;
}
function roundTable(parent,x,y,diameter,seats,offset=null) {
  cylinder(parent,x,y,.14,.67,.03,materials.wood);cylinder(parent,x,y,diameter/2,.08,.72,materials.lightWood);
  for(let i=0;i<seats;i++) {
    const a=i*Math.PI*2/seats,r=diameter/2+.29;
    chair(parent,x+r*Math.cos(a),y+r*Math.sin(a),a+Math.PI/2,offset===null?null:offset+i+1);
    if(offset!==null) {
      cylinder(parent,x+(diameter/2-.22)*Math.cos(a),y+(diameter/2-.22)*Math.sin(a),.13,.015,.805,materials.white);
    }
  }
  if(offset!==null)cylinder(parent,x,y,.4,.015,.81,materials.glass);
}
function makeSofa(parent,x,y,w,d,backAtRear=false) {
  block(parent,x,y,w,d,.23,.10,materials.wood);
  block(parent,x,y,w,d,.20,.33,materials.sofa);
  block(parent,x,backAtRear?y+d-.16:y,w,.16,.42,.44,materials.sofa);
  for(const xx of [x,x+w-.12])block(parent,xx,y,.12,d,.26,.42,materials.sofa);
  for(let i=0;i<3;i++)block(parent,x+.14+i*(w-.28)/3,y+(backAtRear?.07:.18),(w-.32)/3,d-.25,.035,.53,materials.linen);
}
function makeLounge(parent,home,x,y,w,d,vertical) {
  const mx=(x,w=0)=>mirror(home,x,w);
  if(vertical) {
    block(parent,mx(x+.35,.8),y+1,.8,2.5,.30,.12,materials.sofa);
    block(parent,mx(x+.35,.16),y+1,.16,2.5,.43,.42,materials.sofa);
    block(parent,mx(x+.35,.8),y+1,.8,.13,.35,.4,materials.sofa);
    block(parent,mx(x+.35,.8),y+3.37,.8,.13,.35,.4,materials.sofa);
    block(parent,mx(x+w-.20,.08),y+2.8,.08,1.6,.85,.9,materials.dark);
  } else {
    makeSofa(parent,mx(x+.35,Math.min(2.6,w-.7)),y+.35,Math.min(2.6,w-.7),.8);
    block(parent,mx(x+w/2-.8,1.6),y+d-.22,1.6,.08,.85,.90,materials.dark);
  }
  block(parent,mx(x+w/2-.55,1.1),y+1.65,1.1,.6,.35,0,materials.lightWood);
  chair(parent,mx(x+.6),y+2.3,Math.PI);chair(parent,mx(x+w-.6),y+2.3,Math.PI);
}
function makeKitchen(parent,home) {
  const mx=(x,w=0)=>mirror(home,x,w);
  block(parent,mx(7.05,.65),12.68,.65,3.75,.83,0,materials.lightWood);
  block(parent,mx(7.05,.65),12.68,.65,3.75,.06,.83,materials.white);
  block(parent,mx(7.05,2.9),15.95,2.9,.6,.83,0,materials.lightWood);
  block(parent,mx(7.05,2.9),15.95,2.9,.6,.06,.83,materials.white);
  block(parent,mx(7.15,.42),15,.42,.65,.02,.9,materials.water);
  for(const y of [13.55,13.93])cylinder(parent,mx(7.37),y,.13,.02,.91,materials.dark);
  block(parent,mx(9.15,.8),12.75,.8,.72,1.85,0,materials.white);
  block(parent,mx(9.2,.70),13.9,.70,.65,1.90,0,materials.lightWood);
}
function makeUpperBathroom(parent,home,x) {
  const mx=(x,w=0)=>mirror(home,x,w),y=12.5;
  block(parent,mx(x+.15,1.5),y+1.85,1.5,.8,.035,.01,materials.tile);
  block(parent,mx(x+.15,.77),y+1.85,.77,.035,1.85,.05,materials.glass);
  block(parent,mx(x+.22,.42),y+1.43,.42,.20,.65,0,materials.white);
  cylinder(parent,mx(x+.43),y+1.08,.21,.40,.02,materials.white);
  block(parent,mx(x+1.1,.5),y+.25,.5,.4,.72,0,materials.lightWood);
  block(parent,mx(x+1.1,.5),y+.25,.5,.4,.08,.72,materials.white);
}
function makeTerraceLaundry(parent,home) {
  const item=data.laundryRooms.find(v=>v.home===home),[x,y,w,d]=item.machineLocal;
  const machine=group(parent);machine.userData.laundryRoom=home;
  machine.position.copy(worldPoint(mirror(home,x,w)+w/2,y+d/2));machine.rotation.y=home==='A'?Math.PI/2:-Math.PI/2;
  makeLaundry(machine,14.475,8.025);
  const [sx,sy,sw,sd]=item.sinkLocal;
  makeBasin(parent,mirror(home,sx,sw),sy,sw,sd,home==='A'?'left':'right');
}
function makeTerraceFurniture(parent,home) {
  const g=group(parent),mx=(x,w=0)=>mirror(home,x,w),f=data.terraceFurniture;
  g.userData.terraceFurniture=home;
  const angle=f.backAngleDegrees*Math.PI/180,length=.72;
  for(const [x,y,w,d]of f.loungers) {
    const chair=group(g);chair.userData.lounger={home,rect:[mx(x,w),y,w,d],facing:'south'};
    for(const xx of [x+.05,x+w-.09]) {
      block(chair,mx(xx,.04),y+.12,.04,.04,.29,0,materials.guardMetal);
      block(chair,mx(xx,.04),y+1.90,.04,.04,.60,0,materials.guardMetal);
      block(chair,mx(xx,.04),y,.04,1.45,.06,.25,materials.lightWood);
    }
    for(const yy of [y,y+1.39])block(chair,mx(x,w),yy,w,.06,.06,.25,materials.lightWood);
    block(chair,mx(x+.04,w-.08),y+.025,w-.08,1.425,.08,.31,materials.linen);
    const backY=y+1.45+length*Math.cos(angle)/2,backZ=.35+length*Math.sin(angle)/2,cx=mx(x+w/2);
    solid(chair,new THREE.BoxGeometry(w,.05,length+.06).rotateX(angle),materials.lightWood,[cx-14.8,backZ-.065*Math.cos(angle),8.35-backY-.065*Math.sin(angle)],[1,1,1]);
    solid(chair,new THREE.BoxGeometry(w-.08,.08,length).rotateX(angle),materials.linen,[cx-14.8,backZ,8.35-backY],[1,1,1]);
  }
  makePlanter(g,home,...f.planter);
}
function makeGroundServices(parent,home) {
  const item=data.groundServices.find(v=>v.home===home),mx=(x,w=0)=>mirror(home,x,w);
  if(item.toolLocal) {
  const [px,py,pw,pd]=item.toolLandingLocal;block(parent,mx(px,pw),py,pw,pd,.45,-.45,materials.slab);
  const [x,y,w,d]=item.rampLocal,z0=-.45,z1=0,bottom=-.55;
  const points=[[x,y,z0],[x+w,y,z0],[x+w,y+d,z1],[x,y+d,z1],[x,y,bottom],[x+w,y,bottom],[x+w,y+d,bottom],[x,y+d,bottom]];
  const indices=[0,1,2,0,2,3,4,7,6,4,6,5,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0 ];if(home==='B')for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];const vertices=indices.flatMap(i=>worldPoint(mx(points[i][0]),points[i][1],points[i][2]).toArray());
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(indices.flatMap(i=>[mx(points[i][0]),points[i][1]]),2));geometry.computeVertexNormals();
  const ramp=new THREE.Mesh(geometry,floorMaterials.outdoor);ramp.userData.toolRamp=home;ramp.castShadow=true;ramp.receiveShadow=true;parent.add(ramp);
  for(const xx of [x,x+w-.06]) {
    const cp=[[xx,y,z0+.05],[xx+.06,y,z0+.05],[xx+.06,y+d,z1+.05],[xx,y+d,z1+.05],[xx,y,z0],[xx+.06,y,z0],[xx+.06,y+d,z1],[xx,y+d,z1]];
    const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(i=>worldPoint(mx(cp[i][0]),cp[i][1],cp[i][2]).toArray()),3));cg.computeVertexNormals();
    const curb=new THREE.Mesh(cg,materials.plinth);curb.castShadow=true;curb.receiveShadow=true;parent.add(curb);
  }
  // Tool rack, a parked handcart and a wall-mounted ladder stay inside the dedicated room.
  for(const z of [.3,1.05])block(parent,mx(3.6,2.2),6.35,2.2,.28,.04,z,materials.metal);
  for(const xx of [3.7,4.1,4.5])cylinder(parent,mx(xx),6.55,.014,1.6,.1,materials.woodLine);
  for(const z of [2.05,2.4])block(parent,mx(3.55,2.4),6.56,2.4,.04,.04,z,materials.metal);
  for(let i=0;i<9;i++)block(parent,mx(3.68+i*.26,.035),6.56,.035,.04,.35,2.05,materials.metal);
  block(parent,mx(4.45,1.25),5.45,1.25,.60,.12,.28,materials.metal);
  block(parent,mx(5.75,.32),6.1,.32,.28,.6,0,materials.white);
  }
  const [bx,by,bw,bd]=item.backLandingLocal;block(parent,mx(bx,bw),by,bw,bd,.45,-.45,materials.slab);
  for(let i=1;i<3;i++)block(parent,mx(bx,bw),item.backStepStart+(i-1)*item.backTread,bw,item.backTread,.45-.15*i,-.45,materials.slab);
  // Shallow dry shelves leave a central route between the two back doors.
  for(const [xx,ww]of [[5.1,.30],[6.6,.30]])for(const z of [.15,.65,1.15,1.65])block(parent,mx(xx,ww),12.75,ww,1.85,.035,z,materials.interiorDoor);
}
function makeStairGlassGuard(parent,item) {
  const [a,b,c,d]=item.points,len=Math.hypot(c-a,d-b),angle=Math.atan2(d-b,c-a),g=group(parent);g.userData.stairGlassGuard=item.home;
  solid(g,unitBox,materials.windowFrame,[(a+c)/2-14.8,.035,8.35-(b+d)/2],[len,.07,.06],angle);
  solid(g,unitBox,materials.guardMetal,[(a+c)/2-14.8,item.height-.018,8.35-(b+d)/2],[len,.036,.045],angle);
  const n=Math.ceil(len/1.25);
  for(let i=0;i<n;i++){
    const start=i===0?.04:.01,end=i===n-1?.04:.01,t=(i*len/n+(len/n+start-end)/2)/len;
    solid(g,unitBox,materials.guardGlass,[a+(c-a)*t-14.8,(item.height+.08)/2,8.35-b-(d-b)*t],[len/n-start-end,item.height-.12,.016],angle);
  }
  for(const [x,y]of [[a,b],[c,d]])block(g,x-.02,y-.02,.04,.04,item.height,0,materials.guardMetal);
}

function makeInteriorLighting(parent,home,level) {
  const joinery=group(parent),lighting=group(parent);joinery.userData.bedsideTableIds=[];lighting.userData.lightFixtureIds=[];const indirectRooms=new Set();
  for(const table of data.bedsideTables.filter(t=>t.home===home&&t.level===level)) {
    const [x,y,w,d]=table.rect,h=table.height,g=joinery;joinery.userData.bedsideTableIds.push(table.id);
    block(g,x,y,w,d,h-.06,.06,materials.interiorDoor);
    block(g,x+.025,y+.025,w-.05,d-.05,.06,0,materials.lampMetal);
    const head=data.beds.find(b=>b.room===table.room).head,front=head==='east'?x-.008:x+w-.012;
    for(let i=0;i<2;i++) {
      const z=.085+i*(h-.1)/2;
      block(g,front,y+.012,.02,d-.024,(h-.13)/2,z,materials.interiorDoor);
      block(g,front-.003,y+d*.32,.026,d*.36,.008,z+(h-.13)/2-.035,materials.lampMetal);
    }
    block(g,x-.005,y-.005,w+.01,d+.01,.025,h-.025,materials.lightWood);
  }
  for(const f of data.lightingFixtures.filter(f=>f.home===home&&f.level===level)) {
    const g=lighting;lighting.userData.lightFixtureIds.push(f.id);const [x,y,z]=f.position,glow=f.temperature===3000?materials.taskGlow:materials.warmGlow;
    if(f.kind==='cove') {
      const side=f.normal[0],dx=side?.18:f.length,dy=side?f.length:.18;
      block(g,x-dx/2,y-dy/2,dx,dy,.055,z-.06,materials.wall);
      block(g,x-(side?.022:dx*.46),y-(side?dy*.46:.022),side?.044:dx*.92,side?dy*.92:.044,.008,z-.004,glow);
    } else if(f.kind==='bollard') {
      block(g,x-.04,y-.03,.08,.06,.45,z-.45,materials.lampMetal);
      block(g,x-.07,y-.06,.14,.12,.035,z,materials.lampMetal);
      block(g,x-.055,y-.045,.11,.09,.008,z-.006,glow);
    } else if(f.kind==='drive-marker') {
      block(g,x-.09,y+.004,.18,.09,.27,z-.19,materials.lampMetal);
      block(g,x-.105,y-.015,.21,.12,.025,z+.08,materials.lampMetal);
      block(g,x-.065,y-.004,.13,.008,.035,z-.0175,glow);
    } else if(f.kind==='downlight') {
      const radius=.05;
      cylinder(g,x,y,radius,.035,z,materials.lampMetal);cylinder(g,x,y,radius*.87,.012,z-.008,glow);
    } else if(f.kind==='pendant') {
      const ceiling=heights[level-1]-.2;
      cylinder(g,x,y,.006,ceiling-z-.16,z+.16,materials.lampMetal);
      solid(g,new THREE.CylinderGeometry(.22,.32,.20,24),materials.lampShade,[x-14.8,z+.10,8.35-y],[1,1,1]);
      cylinder(g,x,y,.27,.012,z-.005,glow);
    } else if(f.kind==='floor') {
      cylinder(g,x,y,.15,.025,0,materials.lampMetal);cylinder(g,x,y,.012,z-.12,.025,materials.lampMetal);
      solid(g,new THREE.CylinderGeometry(.12,.20,.28,24),materials.lampShade,[x-14.8,z,8.35-y],[1,1,1]);
      cylinder(g,x,y,.16,.012,z-.145,glow);
    } else if(f.kind==='table') {
      const h=f.baseHeight;
      cylinder(g,x,y,.065,.018,h,materials.lampMetal);
      cylinder(g,x,y,.007,.22,h+.018,materials.lampMetal);
      solid(g,new THREE.CylinderGeometry(.08,.12,.16,24),materials.lampShade,[x-14.8,z+.08,8.35-y],[1,1,1]);
      cylinder(g,x,y,.105,.008,z-.006,glow);
    } else if(f.kind==='desk') {
      cylinder(g,x,y,.055,.012,.74,materials.lampMetal);cylinder(g,x,y,.006,z-.77,.752,materials.lampMetal);
      cylinder(g,x,y,.055,.055,z-.025,materials.lampMetal);cylinder(g,x,y,.045,.008,z-.03,glow);
    } else if(f.kind==='reading') {
      const [nx,ny]=f.normal;
      block(g,x-.045,y-.045,.09,.09,.10,z-.05,materials.lampMetal);
      cylinder(g,x+nx*.08,y+ny*.08,.035,.10,z-.05,materials.lampMetal);
      cylinder(g,x+nx*.08,y+ny*.08,.028,.008,z-.055,glow);
    } else if(f.kind==='linear'||f.kind==='mirror') {
      const side=f.normal?.[0],length=f.length,dx=side?.035:length,dy=side?length:.035;
      block(g,x-dx/2,y-dy/2,dx,dy,.035,z,materials.lampMetal);
      block(g,x-dx*.46,y-dy*.46,dx*.92,dy*.92,.012,z-.005,glow);
      if(f.kind==='mirror') {
        const [nx,ny]=f.normal;
        block(g,x-dx/2-nx*.015,y-dy/2-ny*.015,dx,dy,.55,z-.56,materials.frost);
      }
    } else if(f.kind==='sconce') {
      const [nx,ny]=f.normal,dx=nx?.08:.26,dy=nx?.26:.08;
      block(g,x-dx/2,y-dy/2,dx,dy,.14,z-.07,materials.lampMetal);
      block(g,x-dx*.42,y-dy*.42,dx*.84,dy*.84,.008,z-.075,glow);
      if(!f.downOnly)block(g,x-dx*.42,y-dy*.42,dx*.84,dy*.84,.008,z+.067,glow);
    } else if(f.kind==='step') {
      const nx=f.normal?.[0],dx=nx?.02:.12,dy=nx?.12:.02;
      block(g,x-dx/2,y-dy/2,dx,dy,.06,z-.03,materials.lampMetal);
      block(g,x-dx*.4,y-dy*.4,dx*.8,dy*.8,.02,z-.01,glow);
    } else if(f.kind==='ground') {
      cylinder(g,x,y,.075,.025,z,materials.lampMetal);cylinder(g,x,y,.055,.008,z+.025,glow);
    }
    if(f.intensity>0)fixtureSources.push({spec:f,parent,point:worldPoint(...f.position),target:worldPoint(...f.target)});
    if(f.kind==='cove'&&!indirectRooms.has(f.room)) {
      indirectRooms.add(f.room);
      const room=data.rooms.find(r=>r.id===f.room),[rx,ry,rw,rd]=room.rect,cx=rx+rw/2,cy=ry+rd/2;
      fixtureSources.push({spec:{...f,id:f.id+'b',kind:'indirect-fill',intensity:130,angle:Math.atan((Math.min(rw,rd)-.3)/2/(z-.15)),distance:z+2},parent,point:worldPoint(cx,cy,z),target:worldPoint(cx,cy,.15)});
    }
    if(f.kind==='sconce'&&!f.downOnly){const [nx,ny]=f.normal;fixtureSources.push({spec:{...f,id:f.id+'u',intensity:15,angle:.26,distance:1.4},parent,point:worldPoint(x,y,z+.08),target:worldPoint(x-nx*.08,y-ny*.08,z+.55)});}
  }
}

function makeUnderStairStorage(parent,home) {
  const item=data.underStairStorage.find(v=>v.home===home),mx=(x,w=0)=>mirror(home,x,w),g=group(parent);
  g.userData.underStairStorage=home;
  for(const cabinet of item.cabinetsLocal) {
    const [x,y,w,d]=cabinet.rect,h=cabinet.height,front=cabinet.front==='south'?y-.012:y+d-.012;
    block(g,mx(x,w),y,w,d,h,0,materials.woodLine);
    block(g,mx(x+.015,w-.03),front,w-.03,.025,h-.04,.02,materials.interiorDoor);
    block(g,mx(x+w-.18,.12),front+(cabinet.front==='south'?-.014:.025),.12,.014,.012,h-.13,materials.windowFrame);
  }
  for(const [x,y,w,d]of item.shelfBaysLocal) {
    for(const xx of [x,x+w-.025])block(g,mx(xx,.025),y,.025,d,1.02,.78,materials.interiorDoor);
    block(g,mx(x,w),y,w,.025,1.02,.78,materials.interiorDoor);
    for(const z of [1.12,1.62])block(g,mx(x,w),y,w,d,.04,z-.04,materials.interiorDoor);
  }
  for(const x of item.screenSidesLocal) {
    for(let i=0;i<7;i++)block(g,mx(x-.011,.022),10.05+i*.14,.022,.035,1.8,0,materials.interiorDoor);
    for(const z of [0,1.765])block(g,mx(x-.016,.032),10.05,.032,.875,.035,z,materials.interiorDoor);
  }
}

function makeLaundry(parent,x,y) {
  block(parent,x,y,.65,.65,.87,0,materials.white);
  block(parent,x+.05,y-.006,.55,.018,.10,.72,materials.metal);
  const drum=new THREE.Mesh(new THREE.CircleGeometry(.21,24),materials.dark);
  drum.position.copy(worldPoint(x+.325,y-.012,.43));parent.add(drum);
  const glass=new THREE.Mesh(new THREE.CircleGeometry(.17,24),materials.water);
  glass.position.copy(worldPoint(x+.325,y-.016,.43));parent.add(glass);
}
function makeBathroom(parent,x,y,w,d,home,elder=false,full=true) {
  const flip=(local,width=0)=>home==='B'?x+w-local-width:x+local;
  if(full) {
    block(parent,flip(w-1.2,1.05),y+d-1.2,1.05,1.05,.035,.01,materials.tile);
    block(parent,flip(w-1.2,.035),y+d-1.2,.035,1.05,1.85,.05,materials.glass);
    block(parent,flip(w-.72,.06),y+d-.10,.06,.04,1.65,.15,materials.metal);
  }
  const tx=flip(.25,.45);
  block(parent,tx,y+d-.7,.45,.20,.65,0,materials.white);
  cylinder(parent,tx+.225,y+d-.84,.22,.40,.02,materials.white);
  block(parent,flip(w-.70,.52),y+.25,.52,.42,.72,0,materials.lightWood);
  block(parent,flip(w-.72,.56),y+.23,.56,.46,.08,.72,materials.white);
  if(elder)block(parent,flip(.13,.06),y+.65,.06,.8,.06,.75,materials.metal);
}
function makeFacadeBathroom(parent,room) {
  const [x,y,w,d]=room.rect;
  const showerY=room.northExtended?d-1.02:1.38;
  const mx=(u,width)=>room.home==='B'?x+w-u-width:x+u;
  if(room.id.endsWith('front-bath')) {
    makeShower(parent,mx(.12,.90),y+.12,.90,.90,'side',room.home==='B');
    makeToilet(parent,mx(1.15,.46),y+.10,'rear');
    if(room.entryRelocated)makeBasin(parent,mx(1.80,.55),y+.08,.55,.40,'rear');
    else if(room.access==='suite')makeBasin(parent,mx(2.30,.40),y+1.05,.40,.60,room.home==='B'?'right':'left');
    else makeBasin(parent,mx(1.80,.60),y+.10,.60,.40,'rear');
  } else if(['public','switchable'].includes(room.access)) {
    makeShower(parent,mx(.12,w-.24),y+showerY,w-.24,.90,'front',room.home==='A');
    makeToilet(parent,mx(.10,.46),y+.10,'rear');
    makeBasin(parent,mx(.10,.40),y+(room.northExtended?1.85:.82),.40,.50,room.home==='A'?'right':'left');
  } else {
    const reverse=(room.home==='B')!==room.id.endsWith('bath-right');
    const sx=(u,width)=>reverse?x+w-u-width:x+u;
    makeShower(parent,sx(.12,w-.24),y+showerY,w-.24,.90,'front',reverse);
    makeToilet(parent,sx(1.02,.68),y+.10,reverse?'right':'left');
    makeBasin(parent,sx(1.30,.40),y+(room.northExtended?1.70:.68),.40,.60,reverse?'right':'left');
  }
}
function makeToilet(parent,x,y,direction) {
  const side=direction!=='rear';
  const point=(u,v)=>side?[x+(direction==='left'?.68-v:v),y+u]:[x+u,y+v];
  function piece(u,v,w,d,h,elev,material) {
    if(side)block(parent,x+(direction==='left'?.68-v-d:v),y+u,d,w,h,elev,material);
    else block(parent,x+u,y+v,w,d,h,elev,material);
  }
  piece(.02,.02,.42,.18,.72,0,materials.white);
  piece(.10,.22,.26,.35,.30,0,materials.white);
  const [cx,cy]=point(.23,.42);
  solid(parent,unitSphere,materials.white,[cx-14.8,.31,8.35-cy],side?[.26,.14,.22]:[.22,.14,.26]);
  solid(parent,toiletSeat,materials.white,[cx-14.8,.46,8.35-cy],side?[.23,.12,.18]:[.18,.12,.23]);
  solid(parent,unitSphere,materials.dark,[cx-14.8,.457,8.35-cy],side?[.17,.006,.115]:[.115,.006,.17]);
  const [bx,by]=point(.23,.10);cylinder(parent,bx,by,.022,.008,.72,materials.metal);
}
function makeBasin(parent,x,y,w,d,direction) {
  block(parent,x,y,w,d,.72,.02,materials.lightWood);
  block(parent,x-.015,y-.015,w+.03,d+.03,.06,.74,materials.white);
  solid(parent,unitSphere,materials.water,[x+w/2-14.8,.801,8.35-y-d/2],[(w-.15)/2,.012,(d-.15)/2]);
  cylinder(parent,x+w/2,y+d/2,.016,.004,.813,materials.metal);
  const side=direction!=='rear';
  const fx=side?direction==='left'?x+w-.045:x+.045:x+w/2;
  const fy=side?y+d/2:y+.045;
  cylinder(parent,fx,fy,.014,.18,.79,materials.metal);
  if(side)block(parent,fx-(direction==='left'?.13:0),fy-.012,.14,.024,.025,.95,materials.metal);
  else block(parent,fx-.012,fy,.024,.14,.025,.95,materials.metal);
}
function makeShower(parent,x,y,w,d,screen,flip) {
  block(parent,x,y,w,d,.018,.012,materials.tile);
  for(const xx of [x,x+w-.012])block(parent,xx,y,.012,d,.006,.031,materials.windowFrame);
  for(const yy of [y,y+d-.012])block(parent,x,yy,w,.012,.006,.031,materials.windowFrame);
  if(screen==='front')block(parent,x+(flip?0:.80),y-.012,w-.80,.024,1.90,.03,materials.glass);
  else block(parent,flip?x-.012:x+w-.012,y,.024,d,1.90,.03,materials.glass);
  const px=screen==='front'?(flip?x-.025:x+w+.025):x+w/2;
  const py=screen==='front'?y+d*.65:y-.025;
  cylinder(parent,px,py,.012,1.22,.88,materials.metal);
  if(screen==='front')block(parent,flip?px:px-.20,py-.012,.20,.024,.025,2.075,materials.metal);
  else block(parent,px-.012,py,.024,.20,.025,2.075,materials.metal);
  cylinder(parent,screen==='front'?px+(flip?.18:-.18):px,screen==='front'?py:py+.18,.095,.025,2.05,materials.metal);
  block(parent,px-.045,py-.045,.09,.09,.06,.90,materials.metal);
  block(parent,x+w/2-.045,y+d-.16,.09,.09,.006,.033,materials.metal);
}
function makeStairs(parent,home,rise) {
  const mx=(x,w=0)=>mirror(home,x,w);
  const flight=facadeChanges&&data.joinedLayout?Math.ceil(rise/.18/2):10,run=2.9/flight;
  for(let i=0;i<flight;i++) {
    const a=(i+1)*rise/(2*flight),b=rise/2+(i+1)*rise/(2*flight);
    block(parent,mx(7.3-(i+1)*run,run),8.65,run,1.02,.15,a-.15,materials.slab);
    block(parent,mx(4.4+i*run,run),9.98,run,1.02,.15,b-.15,materials.slab);
  }
  block(parent,mx(3.45,.95),8.65,.95,2.35,.15,rise/2-.15,materials.slab);
  if(facadeChanges&&data.joinedLayout)makeStairHandrails(parent,home,rise,flight,run);
}
function makeStairHandrails(parent,home,rise,flight,run) {
  const step=rise/(2*flight),mid=rise/2,h=1.10,mx=x=>mirror(home,x);
  const paths=[
    [[7.46,9.64,step+h],[7.3,9.64,step+h],[4.4+run,9.64,mid+h],[4.2,9.64,mid+h],[4.2,10.01,mid+h],[4.4,10.01,mid+step+h],[7.3-run,10.01,rise+h],[7.46,10.01,rise+h]],
    [[7.46,8.69,step+h],[7.3,8.69,step+h],[4.4+run,8.69,mid+h],[3.51,8.69,mid+h],[3.51,10.96,mid+h],[4.4,10.96,mid+step+h],[7.3-run,10.96,rise+h],[7.46,10.96,rise+h]],
  ];
  const spec={home,rise,paths,panels:[],anchors:[],height:h};parent.userData.stairHandrails=spec;
  const positions=[],normals=[],uvs=[],up=new THREE.Vector3(0,1,0),along=new THREE.Vector3(1,0,0);
  const append=geometry=>{positions.push(...geometry.attributes.position.array);normals.push(...geometry.attributes.normal.array);uvs.push(...geometry.attributes.uv.array);geometry.dispose();};
  const anchor=(x,y,bottom,top)=>{
    if(top<=bottom)return;
    block(parent,mx(x)-.014,y-.014,.028,.028,top-bottom,bottom,materials.guardMetal);spec.anchors.push({x,y,bottom,top});
  };
  const floorAt=(x,y)=>x<4.4?mid:x>7.3?(y<9.8?0:rise):y<9.8?Math.min(mid,(Math.floor((7.3-x)/run)+1)*step):Math.min(rise,mid+(Math.floor((x-4.4)/run)+1)*step);
  for(const path of paths)for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],pa=worldPoint(mx(a[0]),a[1],a[2]),pb=worldPoint(mx(b[0]),b[1],b[2]),delta=pb.clone().sub(pa),length=delta.length(),direction=delta.clone().normalize(),centre=pa.clone().add(pb).multiplyScalar(.5);
    const cap=new THREE.CylinderGeometry(.022,.022,length,12).toNonIndexed();cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,direction));cap.translate(...centre.toArray());append(cap);
    if(i===1)continue;
    const shoe=new THREE.BoxGeometry(length,.07,.06).toNonIndexed();shoe.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(along,direction));shoe.translate(centre.x,centre.y-h+.08,centre.z);append(shoe);
    const span=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(span/.95),nx=-(b[1]-a[1])/span*.008,ny=(b[0]-a[0])/span*.008;
    for(let j=0;j<count;j++) {
      const mix=t=>a.map((v,k)=>v+(b[k]-v)*t),aa=mix(j/count+.006/span),bb=mix((j+1)/count-.006/span);
      const corners=[[aa[0],aa[1],aa[2]-h+.10],[bb[0],bb[1],bb[2]-h+.10],[bb[0],bb[1],bb[2]-.03],[aa[0],aa[1],aa[2]-.03]];
      const points=[-1,1].flatMap(side=>corners.map(([x,y,z])=>worldPoint(mx(x+side*nx),y+side*ny,z)));
      const indices=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
      let volume=0;for(let k=0;k<indices.length;k+=3)volume+=points[indices[k]].dot(points[indices[k+1]].clone().cross(points[indices[k+2]]));
      if(volume<0)for(let k=0;k<indices.length;k+=3)[indices[k+1],indices[k+2]]=[indices[k+2],indices[k+1]];
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(k=>points[k].toArray()),3));geometry.computeVertexNormals();
      const panel=new THREE.Mesh(geometry,materials.guardGlass);panel.userData.stairGlassPanel={home};parent.add(panel);spec.panels.push({a:aa,b:bb});
      const cc=mix((j+.5)/count);anchor(cc[0],cc[1],floorAt(cc[0],cc[1]),cc[2]-h+.08);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  const handrail=new THREE.Mesh(geometry,materials.guardMetal);handrail.castShadow=handrail.receiveShadow=true;parent.add(handrail);
  for(const path of paths)for(const [x,y,z]of path)solid(parent,unitSphere,materials.guardMetal,[mx(x)-14.8,z,8.35-y],[.022,.022,.022]);
  for(const y of [8.69,9.64])anchor(7.40,y,0,step+h);
  for(const y of [10.01,10.96])anchor(7.40,y,rise,rise+h);
  const from=parent.userData.stairFlight?.level??parent.userData.stairArrival?.fromLevel;
  if(from===1){const landing=group(parent);landing.position.y=rise;makeStairGlassGuard(landing,{home,points:[mx(7.40),9.64,mx(7.40),10.01],height:1.2});}
}
function rail(parent,x1,y1,x2,y2,h,footWidth=.22) {
  if(facadeStudy&&!strictOriginal)h=1.2;
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<.02)return;
  const angle=Math.atan2(dy,dx),cx=(x1+x2)/2,cy=(y1+y2)/2;
  if(facadeChanges&&data.joinedLayout) {
    const r=data.guardFinish;
    solid(parent,unitBox,materials.guardBase,[cx-14.8,r.baseHeight/2,8.35-cy],[len,r.baseHeight,r.baseWidth],angle);
    for(let z=.10;z<r.baseHeight;z+=.10)solid(parent,unitBox,materials.guardJoint,[cx-14.8,z,8.35-cy],[len,.005,r.baseWidth+.002],angle);
    for(let row=0;row<3;row++)for(let t=.30+(row%2)*.15;t<len;t+=.30)solid(parent,unitBox,materials.guardJoint,[x1+dx*t/len-14.8,row*.10+.05,8.35-y1-dy*t/len],[.005,.095,r.baseWidth+.002],angle);
    solid(parent,unitBox,materials.guardMetal,[cx-14.8,r.baseHeight,8.35-cy],[len,.035,r.baseWidth+.02],angle);
    solid(parent,unitBox,materials.guardMetal,[cx-14.8,h-.02,8.35-cy],[len,.04,.045],angle);
    const rods=Math.ceil(len/r.rodSpacing);
    for(let i=0;i<=rods;i++)block(parent,x1+dx*i/rods-r.rodWidth/2,y1+dy*i/rods-r.rodWidth/2,r.rodWidth,r.rodWidth,h-r.baseHeight-.02,r.baseHeight,materials.guardMetal);
    return;
  }
  solid(parent,unitBox,materials.metal,[cx-14.8,h,8.35-cy],[len,.05,.045],angle);
  solid(parent,unitBox,materials.metal,[cx-14.8,.16,8.35-cy],[len,.04,.035],angle);
  if(facadeStudy) {
    const posts=Math.ceil(len/1.3);
    for(let i=0;i<=posts;i++)block(parent,x1+dx*i/posts-.035,y1+dy*i/posts-.035,.07,.07,h,.02,materials.metal);
    for(let i=0;i<posts;i++) {
      const t=(i+.5)/posts;
      solid(parent,unitBox,materials.guardGlass,[x1+dx*t-14.8,(h+.16)/2,8.35-y1-dy*t],[len/posts-.07,h-.22,.02],angle);
    }
    const horizontal=Math.abs(dy)<.001;
    const beam=strictOriginal?footWidth:.22,fascia=strictOriginal?footWidth:.24;
    block(parent,Math.min(x1,x2)-(horizontal?0:beam/2),Math.min(y1,y2)-(horizontal?beam/2:0),horizontal?len:beam,horizontal?beam:len,.10,0,materials.slab);
    block(parent,Math.min(x1,x2)-(horizontal?0:fascia/2),Math.min(y1,y2)-(horizontal?fascia/2:0),horizontal?len:fascia,horizontal?fascia:len,.18,-.18,materials.wall);
  } else {
    const count=Math.ceil(len/.12);
    for(let i=0;i<=count;i++)block(parent,x1+dx*i/count-.015,y1+dy*i/count-.015,.03,.03,h-.15,.15,materials.metal);
  }
}

// v6 uses the new-plan geometry; no inherited v5 room walls or openings are drawn.
function v6Slab(parent,points,elevation,thickness,material,hole) {
  const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
  if(hole){const p=new THREE.Path();hole.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();shape.holes.push(p);}
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});
  geometry.rotateX(-Math.PI/2);geometry.translate(-14.8,elevation-thickness,8.35);
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function v6Rect(parent,[x,y,w,d],elevation,thickness,material){return v6Slab(parent,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],elevation,thickness,material);}
function v6Mx(home,x,w=0){return home==='A'?x:29-x-w;}
function makeV6WallJoint(parent,joint,height,cut){
  const[x,y,w,d]=joint.rect,top=Math.min(height,joint.top),g=group(parent);g.userData.wallJoint=joint.id;
  block(g,x,y,w,d,top,0,materials.wall);
  if(joint.plinth){const bottom=data.vertical.outdoorLevel-.05;block(g,x,y,w,d,Math.min(.55,top)-bottom,bottom,materials.plinth);}
  if(cut)block(g,x,y,w,d,.025,top-.025,materials.wallCap);
}
function buildV6Model(design,modelData) {
  data=modelData;currentDesign=design;joinedLayout=data.joinedLayout;
  const root=group(scene);roots[design]=root;
  for(const[key,spec]of Object.entries(data.designPalette.materials))makeSurfaceMaterial(materials[key],spec);
  makeFloorMaterials(data.floorFinishes);
  for(const key of ['entry','interior','bath','service'])materials[key+'Door'].color.set(data.doorFinishes[key].color);
  const site=group(root);makeSiteContext(site,data.context);site.position.y=-.215;
  const building=group(root);building.rotation.y=siteAngle();
  const paving=group(building);
  v6Rect(paving,[-1.2,-1.9,31.4,20.2],-.45,.12,floorMaterials.outdoor);
  const tree=group(paving);tree.position.set(data.courtyardGarden.tree[0]-14.8,-.45,8-data.courtyardGarden.tree[1]);makeCourtyardTree(tree);
  makeCourtyardGarden(paving);makeArrivalLandscape(paving);
  for(let level=1;level<=3;level++){
    const f=group(building);f.position.y=base[level-1];floors.push({g:f,level,design});
    for(const home of ['A','B']){
      const g=group(f);homes.push({g,home,level});
      const hole=level>1?[[2.65,8.80],[6.80,8.80],[6.80,11.20],[2.65,11.20]].map(([x,y])=>[v6Mx(home,x),y]):null;
      const slab=v6Slab(g,data.floorPolygons[level][home],0,.18,floorMaterials.outdoor,hole);slab.userData.planSlab={home,level};
      if(level===1)v6Slab(g,data.floorPolygons[level][home],-.18,.27,materials.plinth);
      const full=group(g),low=group(g);wallSets.push({full,low});
      for(const w of data.walls.filter(w=>w.home===home&&w.level===level&&!w.projectionOnly&&!w.terraceGuard)){
        makeWall(w,full,heights[level-1],false);makeWall(w,low,1.08,true);
      }
      for(const c of data.columns.filter(c=>c.home===home&&c.level===level&&!c.projectionOnly)){
        const[x,y,w,d]=c.rect,bottom=level===1?-.45:-.18;
        const column=group(full);column.userData.studyColumn=c;
        block(column,x,y,w,d,heights[level-1]-bottom,bottom,materials.wall);
        block(column,x,y,w,d,.012,heights[level-1],materials.column);
        block(low,x,y,w,d,1.08-bottom,bottom,materials.wall);block(low,x,y,w,d,.012,1.08,materials.column);
        if(level===1)block(column,x-.004,y-.004,w+.008,d+.008,1.0,-.45,materials.plinth);
      }
      for(const joint of data.wallJoints.filter(j=>j.home===home&&j.level===level)){
        makeV6WallJoint(full,joint,heights[level-1],false);makeV6WallJoint(low,joint,1.08,true);
      }
      for(const room of data.rooms.filter(r=>r.home===home&&r.level===level))makeRoom({...room,design},g);
      for(const b of data.beds.filter(b=>b.home===home&&b.level===level))makeOriginalBed(g,b);
      for(const desk of data.bedroomDesks.filter(b=>b.home===home&&b.level===level))makeBedroomDesk(g,desk);
      makeV6Fixtures(g,home,level);makeInteriorLighting(g,home,level);
      for(const guard of data.guards.filter(v=>v.home===home&&v.level===level))rail(g,...guard.points,guard.height);
      if(level<3){const flight=group(g);makeV6Stairs(flight,home,level,heights[level-1]);}
      if(level>1){
        const arrival=group(g);arrival.position.y=-heights[level-2];
        makeV6Stairs(arrival,home,level-1,heights[level-2]);
        delete arrival.userData.stairFlight;arrival.userData.stairArrival={home,fromLevel:level-1};arrivalStairs.push(arrival);
        makeStairGlassGuard(g,{home,points:[v6Mx(home,6.80),level===3?8.80:9.94,v6Mx(home,6.80),10.06],height:1.1});
      }
      if(level===1){
        const mx=(x,w=0)=>v6Mx(home,x,w);
        v6Rect(g,[mx(6.9,4.4),0,4.4,2.4],0,.18,floorMaterials.outdoor);
        v6Rect(g,[mx(2.3,4.6),0,4.6,2.4],-.45,.02,floorMaterials.outdoor);
        // North service door: a full landing followed by two lower treads (three risers).
        v6Rect(g,[mx(5.5,1.35),16.8,1.35,1.2],0,.45,materials.slab);
        for(let i=1;i<3;i++)v6Rect(g,[mx(5.5,1.35),18+(i-1)*.3,1.35,.3],-.15*i,.45-.15*i,materials.slab);
        // Compact courtyard steps beside the actual east/west courtyard door.
        v6Rect(g,[mx(8.5,.9),7.05,.9,1.2],0,.45,materials.slab);
        for(let i=1;i<3;i++)v6Rect(g,[mx(9.4+(i-1)*.3,.3),7.05,.3,1.2],-.15*i,.45-.15*i,materials.slab);
      }
      if(level===2){const roof=group(g);roof.userData.v6Roof=true;roofGroups.push(roof);makeV6LowRoof(roof,home);}
      if(level===3){
        const ceiling=group(g);ceiling.userData.ceiling=true;roofGroups.push(ceiling);
        v6Slab(ceiling,data.floorPolygons[3][home],3.18,.08,materials.wall);
        const roof=group(g);roof.userData.v6Roof=true;roofGroups.push(roof);makeV6MainRoof(roof,home);
      }
    }
    const shared=group(f);homes.push({g:shared,home:'both',level});
    if(level===1){
      for(const w of data.walls.filter(w=>w.home==='both'&&w.level===1)){const full=group(shared),low=group(shared);wallSets.push({full,low});makeWall(w,full,heights[0],false);makeWall(w,low,1.08,true);}
      v6Rect(shared,[11.3,0,6.4,2.3],0,.45,materials.slab);
      for(let i=1;i<3;i++)v6Rect(shared,[6.9,-.3*i,15.2,.3],-.15*i,.45-.15*i,materials.slab);
      hallDaily=group(shared);hallFestival=group(shared);makeInteriorLighting(shared,'both',1);
      makeLabel({id:'court',home:'both',level:1,name:'露天天井',kind:'terrace',rect:[11.3,2.4,6.4,8.9],description:'天井室外地面低于室内450毫米，门外三级台阶；南端围合墙按新图位置连接建筑。'},shared);
    }
  }
}

function makeV6Fixtures(parent,home,level){
  const mx=(x,w=0)=>v6Mx(home,x,w);
  for(const r of data.rooms.filter(r=>r.home===home&&r.level===level&&r.kind==='bath')){
    const front=r.id.endsWith('front-bath'),right=r.id.endsWith('bath-right');
    if(front){
      makeShower(parent,mx(2.43,.9),7.67,.9,.9,'side',home==='B');
      makeToilet(parent,mx(3.58,.46),7.03,'rear');
      makeBasin(parent,mx(4.45,.55),7.0,.55,.40,'rear');
    }else{
      const x=right?5.1:3.3;
      makeShower(parent,mx(x+(right?.63:.12),1.05),15.3,1.05,.86,'front',home==='B');
      const faceLeft=(home==='A')!==right;
      makeToilet(parent,mx(x+(right?.12:1.0),.68),14.25,faceLeft?'left':'right');
      makeBasin(parent,mx(x+(right?.12:1.18),.44),13.03,.44,.6,faceLeft?'left':'right');
    }
  }
  if(level===1){
    block(parent,mx(2.5,.86),3.35,.86,2.5,.23,.10,materials.wood);
    block(parent,mx(2.5,.86),3.35,.86,2.5,.20,.33,materials.sofa);
    block(parent,mx(2.5,.16),3.35,.16,2.5,.42,.44,materials.sofa);
    for(const yy of [3.35,5.72])block(parent,mx(2.5,.86),yy,.86,.13,.26,.42,materials.sofa);
    block(parent,mx(4.0,1.3),3.85,1.3,.65,.36,0,materials.lightWood);
    block(parent,mx(6.64,.06),3.4,.06,1.5,.88,1.02,materials.dark);
    // Open display shelving is furniture, following the new plan's 博古架 symbol.
    for(const z of [.15,.65,1.15,1.65,2.15])block(parent,mx(6.68,.18),2.85,.18,3.55,.035,z,materials.lightWood);
    for(const yy of [2.85,4.0,5.2,6.35])block(parent,mx(6.68,.18),yy,.18,.035,2.15,.15,materials.lightWood);
    block(parent,mx(7.05,.60),13.05,.60,3.25,.84,0,materials.interiorDoor);
    block(parent,mx(7.05,.60),13.05,.60,3.25,.05,.84,materials.white);
    for(const yy of [14.4,14.8])cylinder(parent,mx(7.35),yy,.13,.018,.91,materials.dark);
    block(parent,mx(7.15,.40),15.55,.40,.55,.012,.9,materials.water);
    for(const xx of [5.23,6.55])for(const z of [.2,.7,1.2,1.7])block(parent,mx(xx,.25),13.1,.25,2.65,.035,z,materials.lightWood);
    roundTable(parent,mx(12.15),14.25,1.8,10);
  }
  if(level===3&&home==='B'){
    makeSofa(parent,16.1,15.55,4.7,.85,true);
    block(parent,17.4,14.35,2.0,.65,.36,0,materials.lightWood);
    block(parent,16.55,12.91,5.3,.25,.42,0,materials.interiorDoor);
    block(parent,17.65,12.96,2.4,.06,1.05,.85,materials.dark);
  }
}

function v6RoofPatch(parent,home,points,height){roofSurface(parent,points.map(([x,y])=>[v6Mx(home,x),y,height(x,y)]),materials.seamRoof);}
function v6RoofEdge(parent,home,a,b,height){
  const p=worldPoint(v6Mx(home,a[0]),a[1],height(...a)-.045),q=worldPoint(v6Mx(home,b[0]),b[1],height(...b)-.045),delta=q.clone().sub(p);
  if(delta.length()<.01)return;
  const geometry=new THREE.BoxGeometry(delta.length(),.075,.055);geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),delta.normalize()));geometry.translate(...p.add(q).multiplyScalar(.5).toArray());
  const mesh=new THREE.Mesh(geometry,materials.windowFrame);mesh.castShadow=true;parent.add(mesh);
}
function makeV6MainRoof(parent,home){
  const r=data.roofPlan,back=r.mainBackY,ridge=r.mainRidgeY,front=r.mainFrontY;
  const peak=r.mainEave+(ridge-front)*Math.tan(r.mainPitch*Math.PI/180);
  const top=(x,y)=>y<=ridge?r.mainEave+(y-front)*Math.tan(r.mainPitch*Math.PI/180):peak-(y-ridge)*(peak-r.mainEave)/(back-ridge);
  for(const[a,b,start]of [[-.6,1.7,10.7],[1.7,10.8,front],[10.8,14.35,10.7]]){
    v6RoofPatch(parent,home,[[a,start],[b,start],[b,ridge],[a,ridge]],top);
    v6RoofEdge(parent,home,[a,start],[b,start],top);
  }
  v6RoofPatch(parent,home,[[-.6,ridge],[14.35,ridge],[14.35,back],[-.6,back]],top);
  for(const[a,b]of [[[ -.6,back],[14.35,back]],[[-.6,10.7],[-.6,back]],[[14.35,10.7],[14.35,back]],[[-.6,ridge],[14.35,ridge]]])v6RoofEdge(parent,home,a,b,top);
  const boundary=[[0,12.8],[1.65,12.8],[1.65,11.3],[2.3,11.3],[2.3,8.7],[10.2,8.7],[10.2,11.3],[14.1,11.3],[14.1,16.7],[0,16.7]];
  for(let i=0;i<boundary.length;i++){
    const a=boundary[i],b=boundary[(i+1)%boundary.length];
    const points=[[v6Mx(home,a[0]),a[1],3.3],[v6Mx(home,b[0]),b[1],3.3],[v6Mx(home,b[0]),b[1],top(...b)]];
    if((a[1]-ridge)*(b[1]-ridge)<0){const x=a[0]+(b[0]-a[0])*(ridge-a[1])/(b[1]-a[1]);points.push([v6Mx(home,x),ridge,top(x,ridge)]);}
    points.push([v6Mx(home,a[0]),a[1],top(...a)]);roofSurface(parent,points,materials.roofInfill);
  }
  for(let x=-.32;x<14.35;x+=.55){
    const start=x<1.7||x>10.8?10.7:front;
    for(const[a,b]of [[start,ridge],[ridge,back]])roofSurface(parent,[[v6Mx(home,x-.008),a,top(x,a)+.012],[v6Mx(home,x+.008),a,top(x,a)+.012],[v6Mx(home,x+.008),b,top(x,b)+.012],[v6Mx(home,x-.008),b,top(x,b)+.012]],materials.windowFrame);
  }
}
function makeV6LowRoof(parent,home){
  parent.position.y=3.3;
  const top=(x,y)=>.20+(2.3-Math.abs(x-4.6))*Math.tan(8*Math.PI/180)+(y-2.4)*Math.tan(3*Math.PI/180);
  const outline=[[1.7,1.8],[7.5,1.8],[7.5,6.3],[9,6.3],[9,8.6],[1.7,8.6]];
  const clip=(left)=>{
    const result=[];
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length],ina=left?a[0]<=4.6:a[0]>=4.6,inb=left?b[0]<=4.6:b[0]>=4.6;
      if(ina)result.push(a);if(ina!==inb)result.push([4.6,a[1]+(b[1]-a[1])*(4.6-a[0])/(b[0]-a[0])]);
    }return result;
  };
  for(const left of [true,false]){
    const polygon=clip(left),triangles=THREE.ShapeUtils.triangulateShape(polygon.map(p=>new THREE.Vector2(...p)),[]);
    for(const t of triangles)v6RoofPatch(parent,home,t.map(i=>polygon[i]),top);
  }
  for(let i=0;i<outline.length;i++)v6RoofEdge(parent,home,outline[i],outline[(i+1)%outline.length],top);
  const walls=data.roofPlan.lowOutline;
  for(let i=0;i<walls.length;i++){
    const a=walls[i],b=walls[(i+1)%walls.length];
    const points=[[v6Mx(home,a[0]),a[1],0],[v6Mx(home,b[0]),b[1],0],[v6Mx(home,b[0]),b[1],top(...b)]];
    if((a[0]-4.6)*(b[0]-4.6)<0){const y=a[1]+(b[1]-a[1])*(4.6-a[0])/(b[0]-a[0]);points.push([v6Mx(home,4.6),y,top(4.6,y)]);}
    points.push([v6Mx(home,a[0]),a[1],top(...a)]);roofSurface(parent,points,materials.roofInfill);
  }
}

// New-plan stair symbol: two runs of twelve treads, with the landing at the west/east end.
function makeV6Stairs(parent,home,level,rise) {
  const x0=2.6542224898,x1=3.6059009484,x2=6.7272316724;
  const south=8.8018823529,southInner=9.9414117647,northInner=10.0592941176,north=11.1988235294;
  const flight=12,run=(x2-x1)/flight,step=rise/(flight*2),mid=rise/2;
  const mx=(x,w=0)=>home==='B'?29-x-w:x;
  parent.userData.stairFlight={home,level};
  parent.userData.v6Stair={home,level,rise,risers:24,flightRisers:12,tread:run,riser:step,
    footprint:[mx(x0,x2-x0),south,x2-x0,north-south],
    landing:[mx(x0,x1-x0),south,x1-x0,north-south],
    floorOpening:[mx(2.65,4.15),8.80,4.15,2.40],
    entry:[mx(x2+.12),south+(southInner-south)/2,0],
    arrival:[mx(x2+.12),northInner+(north-northInner)/2,rise],
    status:'平面踏面位置按新图；层高沿用v5，竖向尺寸及结构未核实'};
  for(let i=0;i<flight;i++) {
    const a=(i+1)*step,b=mid+(i+1)*step;
    block(parent,mx(x2-(i+1)*run,run),south,run,southInner-south,.15,a-.15,materials.slab);
    block(parent,mx(x1+i*run,run),northInner,run,north-northInner,.15,b-.15,materials.slab);
  }
  block(parent,mx(x0,x1-x0),south,x1-x0,north-south,.18,mid-.18,materials.slab);
  // Continuous undersides support the visible treads instead of leaving floating boxes.
  const stringer=(xa,xb,ya,yb,za,zb)=>{
    const p=[[xa,ya,za],[xb,ya,zb],[xb,yb,zb],[xa,yb,za],
      [xa,ya,za-.13],[xb,ya,zb-.13],[xb,yb,zb-.13],[xa,yb,za-.13]];
    const indices=[0,1,2,0,2,3,4,7,6,4,6,5,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
    const points=p.map(([x,y,z])=>worldPoint(mx(x),y,z));
    let volume=0;for(let i=0;i<indices.length;i+=3)volume+=points[indices[i]].dot(points[indices[i+1]].clone().cross(points[indices[i+2]]));
    if(volume<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(i=>points[i].toArray()),3));
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,materials.slab);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  };
  stringer(x1,x2,south+.04,southInner-.04,mid-.15,step-.15);
  stringer(x1,x2,northInner+.04,north-.04,mid+step-.15,rise-.15);

  const height=1.10,first=x2,last=x1+run,outerSouth=south+.04,outerNorth=north-.04;
  const innerSouth=southInner-.032,innerNorth=northInner+.032,west=x0+.05;
  const paths=[
    [[x2+.10,innerSouth,step+height],[first,innerSouth,step+height],[last,innerSouth,mid+height],
     [x1-.025,innerSouth,mid+height],[x1-.025,innerNorth,mid+height],
     [x1,innerNorth,mid+step+height],[x2-run,innerNorth,rise+height],[x2+.10,innerNorth,rise+height]],
    [[x2+.10,outerSouth,step+height],[first,outerSouth,step+height],[last,outerSouth,mid+height],
     [west,outerSouth,mid+height],[west,outerNorth,mid+height],[x1,outerNorth,mid+step+height],
     [x2-run,outerNorth,rise+height],[x2+.10,outerNorth,rise+height]],
  ];
  const spec={home,level,rise,height,paths:paths.map(path=>path.map(([x,y,z])=>[mx(x),y,z])),panels:[],anchors:[],
    note:'两跑及半层平台连续玻璃栏杆；东/西公共平台一端保持进出敞开'};
  parent.userData.stairHandrails=spec;
  const floorAt=(x,y)=>x<x1?mid:x>x2?(y<10?0:rise):y<10?
    Math.min(mid,(Math.floor((x2-x)/run)+1)*step):Math.min(rise,mid+(Math.floor((x-x1)/run)+1)*step);
  const beam=(a,b,r,material)=>{
    const pa=worldPoint(mx(a[0]),a[1],a[2]),pb=worldPoint(mx(b[0]),b[1],b[2]);
    const delta=pb.clone().sub(pa),geometry=new THREE.CylinderGeometry(r,r,delta.length(),12);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()));
    geometry.translate(...pa.add(pb).multiplyScalar(.5).toArray());
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  };
  const anchor=(x,y,bottom,top)=>{
    if(top-bottom<.001)return;
    block(parent,mx(x)-.012,y-.012,.024,.024,top-bottom,bottom,materials.guardMetal);
    spec.anchors.push({x:mx(x),y,bottom,top});
  };
  for(const path of paths)for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],span=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(span<.01)continue;
    beam(a,b,.018,materials.guardMetal);
    // The short entry/arrival extensions are round grab rails, without a glass obstruction.
    if(i===1)continue;
    const count=Math.ceil(span/.9),nx=-(b[1]-a[1])/span*.008,ny=(b[0]-a[0])/span*.008;
    const mix=t=>a.map((v,k)=>v+(b[k]-v)*t);
    for(let j=0;j<count;j++) {
      const aa=mix(j/count+.006/span),bb=mix((j+1)/count-.006/span);
      const bottomA=aa[2]-height+.085,bottomB=bb[2]-height+.085;
      const corners=[[aa[0],aa[1],bottomA],[bb[0],bb[1],bottomB],
        [bb[0],bb[1],bb[2]-.025],[aa[0],aa[1],aa[2]-.025]];
      const points=[-1,1].flatMap(side=>corners.map(([x,y,z])=>worldPoint(mx(x+side*nx),y+side*ny,z)));
      const indices=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
      let volume=0;for(let k=0;k<indices.length;k+=3)volume+=points[indices[k]].dot(points[indices[k+1]].clone().cross(points[indices[k+2]]));
      if(volume<0)for(let k=0;k<indices.length;k+=3)[indices[k+1],indices[k+2]]=[indices[k+2],indices[k+1]];
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(k=>points[k].toArray()),3));
      geometry.computeVertexNormals();
      const panel=new THREE.Mesh(geometry,materials.guardGlass);panel.userData.stairGlassPanel={home,level};
      panel.receiveShadow=true;parent.add(panel);
      spec.panels.push({a:[mx(aa[0]),aa[1],aa[2]],b:[mx(bb[0]),bb[1],bb[2]],bottom:[bottomA,bottomB]});
      beam([aa[0],aa[1],bottomA+.015],[bb[0],bb[1],bottomB+.015],.015,materials.guardMetal);
      const cc=mix((j+.5)/count);anchor(cc[0],cc[1],floorAt(cc[0],cc[1]),cc[2]-height+.10);
    }
  }
  for(const y of [outerSouth,innerSouth])anchor(x2+.08,y,0,step+height);
  for(const y of [innerNorth,outerNorth])anchor(x2+.08,y,rise,rise+height);
}


function selectRoom(room) {
  state.selected=room.id;
  const detail=$('#room-detail');detail.hidden=false;detail.replaceChildren();
  const eyebrow=document.createElement('span');eyebrow.className='eyebrow';
  eyebrow.textContent=(room.home==='both'?'两户共享':(room.home==='A'?'甲户':'乙户'))+' / '+floorNames[room.level-1];
  const title=document.createElement('h2');title.textContent=room.name;
  const desc=document.createElement('p');desc.textContent=room.description.split('。')[0]+'。';
  detail.append(eyebrow,title,desc);
  if(facadeChanges&&state.design==='original'&&room.floorFinish) {
    const finish=floorMaterials[room.floorFinish].userData.finishSpec,meta=document.createElement('span');meta.className='room-meta';
    meta.textContent='地面 · '+finish.name+' · '+finish.size.map(v=>Math.round(v*1000)).join('×')+'毫米';detail.append(meta);
  }
  if(!['stairs','court','terrace'].includes(room.kind)) {
    const meta=document.createElement('span');meta.className='room-meta';
    meta.textContent=room.polygon?'L形 · 约'+room.area.toFixed(1)+'平方米（轴线示意）':room.rect[2].toFixed(1)+' × '+room.rect[3].toFixed(1)+'米（轴线示意）';detail.append(meta);
    if(room.bedSpec){const bed=document.createElement('span');bed.className='room-meta';bed.textContent=room.bedSpec;detail.append(bed);}
  }
  labels.forEach(l=>l.el.classList.toggle('selected',l.room.id===room.id));
  if(!['stairs','court','terrace'].includes(room.kind)) {
    const [x,y,w,d]=room.rect,shift=facadeChanges&&state.design==='original'?(joinedLayout?.homeShift[room.home]??0):0;highlighted.position.copy(worldPoint(x+w/2+shift,y+d/2,base[room.level-1]+offsetFor(room.level)+.025));
    highlighted.position.applyAxisAngle(new THREE.Vector3(0,1,0),siteAngle());highlighted.rotation.y=siteAngle();
    highlighted.geometry.dispose();highlighted.geometry=roomGeometry(room,.19);highlighted.scale.set(1,1,1);highlighted.visible=true;
  }else highlighted.visible=false;
  requestFrame();
}

function offsetFor(level) {return state.floor==='explode'?(level-1)*4.6:0;}
function updateView(moveCamera=false) {
  renderer.shadowMap.needsUpdate=true;
  const only=Number(state.floor);
  Object.entries(roots).forEach(([design,g])=>g.visible=design===state.design);
  if(siteScenery)siteScenery.visible=state.design==='original'&&state.floor==='all'&&state.home==='both';
  if(arrivalGardenGroup)arrivalGardenGroup.visible=state.floor==='all'&&state.home==='both';
  arrivalCarGroups.forEach(g=>g.visible=$('#show-cars').checked);
  $('#car-option').hidden=!arrivalGardenGroup||state.floor!=='all'||state.home!=='both';
  if(siteNotes)siteNotes.visible=siteScenery.visible&&state.camera==='site';
  floors.forEach(({g,level})=>{g.visible=!only||only===level;g.position.y=base[level-1]+offsetFor(level);});
  homes.forEach(({g,home})=>{g.visible=state.home==='both'||home==='both'||state.home===home;});
  wallSets.forEach(({full,low})=>{full.visible=!$('#cutaway').checked;low.visible=$('#cutaway').checked;});
  arrivalStairs.forEach(g=>{g.visible=state.floor===String(g.userData.stairArrival.fromLevel+1)||state.floor==='explode';});
  roofGroups.forEach(g=>{g.visible=state.floor==='all'&&$('#show-roof').checked;});
  secondaryRoofGroups.forEach(g=>{g.visible=state.floor!=='all'||$('#show-roof').checked;});
  if(dailyFurniture)dailyFurniture.visible=state.scene==='daily';
  if(festivalFurniture)festivalFurniture.visible=state.scene==='festival';
  if(hallDaily)hallDaily.visible=state.scene==='daily';
  if(hallFestival)hallFestival.visible=state.scene==='festival';
  $('#roof-option').style.display=state.floor==='all'?'flex':'none';
  $$('[data-floor]').forEach(b=>{b.classList.toggle('active',b.dataset.floor===state.floor);b.setAttribute('aria-pressed',b.dataset.floor===state.floor);});
  $$('[data-home]').forEach(b=>{b.classList.toggle('active',b.dataset.home===state.home);b.setAttribute('aria-pressed',b.dataset.home===state.home);});
  $$('[data-scene]').forEach(b=>{b.classList.toggle('active',b.dataset.scene===state.scene);b.setAttribute('aria-pressed',b.dataset.scene===state.scene);});
  $('#view-title').textContent=(strictOriginal?'严格原图 · ':facadeStudy?'':state.design==='original'?'原设计 · ':'建议 · ')+(state.floor==='all'?'整体':state.floor==='explode'?'分层':floorNames[Number(state.floor)-1])+(state.home==='both'?'':state.home==='A'?' / 甲户':' / 乙户');
  if(facadeChanges)updateLightingNote();
  $$('[data-design]').forEach(b=>{b.classList.toggle('active',b.dataset.design===state.design);b.setAttribute('aria-pressed',b.dataset.design===state.design);});
  $('#scene-controls').hidden=state.design==='original'&&!(facadeChanges&&hallDaily);
  const counted=roomMeshes.map(m=>m.userData.room).filter(r=>r.design===state.design&&(state.home==='both'||r.home===state.home));
  $('#bedroom-stat').textContent=counted.filter(r=>['elder','bedroom'].includes(r.kind)).length;
  $('#bath-stat').textContent=counted.filter(r=>r.kind==='bath').length;
  $('#kitchen-stat').textContent=counted.filter(r=>r.kind==='kitchen').length;
  $('#dining-stat').textContent=counted.filter(r=>r.kind==='dining').length;
  $('#stats-label').textContent=state.home==='both'?'全屋统计':state.home==='A'?'甲户统计':'乙户统计';
  $('#model-note').textContent=strictOriginal?'墙柱及门窗平面按原始PDF矢量核对，未增窗、未补门。层高、门窗高和窗台高未核实，暂作外观示意。':facadeStudy?'平面依新图21/22/23；高度、屋面及家具为沿用或展示值，未核实。':state.design==='original'?'按原平面重建；层高、立面及露台边界为示意。':'概念方案，非施工图。每户一层、三层各1间洗衣房。';
  $('#original-drawing').href='./downloads/original-floor-'+(only||1)+'.pdf';
  $('#original-drawing b').textContent=(only?floorNames[only-1]:'一层')+'原始图纸';
  $('#room-detail').hidden=!state.selected;
  labels.forEach(l=>l.el.classList.toggle('selected',l.room.id===state.selected));
  highlighted.visible=false;
  if(moveCamera) setCamera(state.camera);
  requestFrame();
}
function setCamera(preset) {
  if(['site','arrival','garden'].includes(preset)&&(!siteContextInfo||state.floor!=='all'||state.home!=='both'))preset='bird';
  state.camera=preset;
  const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;
  const width=host.clientWidth/host.clientHeight;
  if(siteNotes)siteNotes.visible=siteScenery.visible&&preset==='site';
  if(['site','arrival','garden'].includes(preset)) {
    camera.near=1;
    const angle=siteAngle(),c=Math.cos(angle),s=Math.sin(angle);
    const bounds=preset!=='site'?(preset==='garden'?[[-10,-6],[57,-6],[57,34],[-10,34]]:[[-34,-8],[33,-8],[33,19],[-34,19]]).map(([x,y])=>[14.8+c*(x-14.8)-s*(y-8.35),8.35+s*(x-14.8)+c*(y-8.35)]):siteContextInfo.bounds;
    const xs=bounds.map(p=>p[0]),ys=bounds.map(p=>p[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2-14.8,z=8.35-(Math.min(...ys)+Math.max(...ys))/2;
    const direction=new THREE.Vector3(preset==='garden'?.52:preset==='arrival'?-.2:0,preset==='site'?.84:.63,preset==='site'?.53:.75).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right),tan=Math.tan(camera.fov*Math.PI/360);
    let distance=0;
    for(const p of bounds)for(const h of [-.45,preset!=='site'?14:20]) {
      const delta=new THREE.Vector3(p[0]-14.8-x,h-.8,8.35-p[1]-z),depth=delta.dot(direction);
      distance=Math.max(distance,depth+Math.abs(delta.dot(right))/(tan*width),depth+Math.abs(delta.dot(up))/tan);
    }
    controls.maxDistance=Math.max(650,distance*1.3);
    controls.target.set(x,.8,z);camera.position.copy(controls.target).addScaledVector(direction,distance*1.08);
  } else {
  camera.near=.1;
  controls.maxDistance=matchMedia('(max-width:740px)').matches?180:105;
  const y=state.floor==='explode'?8.3:state.floor==='all'?3.7:base[Number(state.floor)-1]+.4;
  const cx=(state.home==='both'?0:state.home==='A'?-7.5:7.5)+(facadeChanges&&state.design==='original'?(joinedLayout?.homeShift[state.home]??0):0);
  const zoom=state.home==='both'?1:.78;
  const distance=40*Math.max(1,(matchMedia('(max-width:740px)').matches?1.35:1.2)/width)*zoom;
  controls.target.set(cx,y,-.2);
  if(preset==='top')camera.position.set(cx,y+distance,0.2);
  else if(preset==='entry')camera.position.set(cx+distance*.30,y+distance*.31,distance*.86);
  else if(preset==='north'){const d=distance*1.3;camera.position.set(cx-d*.25,y+d*.30,-d*.88);}
  else camera.position.set(cx+distance*.40,y+distance*.72,distance*.69);
  if(state.floor==='explode') {camera.position.y+=12;camera.position.z+=7;}
  const axis=new THREE.Vector3(0,1,0),angle=siteAngle(),target=controls.target.clone();
  controls.target.applyAxisAngle(axis,angle);
  if(preset==='top')camera.position.add(controls.target.clone().sub(target));
  else camera.position.applyAxisAngle(axis,angle);
  }
  camera.updateProjectionMatrix();
  $$('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===preset));
  controls.update();requestFrame();
}

function setupSolar(config) {
  solarSite=config;$('#solar-controls').hidden=false;setupNightLighting();
  const range=arrivalGardenGroup?.userData.estate?65:42;
  Object.assign(sunLight.shadow.camera,{left:-range,right:range,top:range,bottom:-range,near:1,far:220});sunLight.shadow.camera.updateProjectionMatrix();sunLight.shadow.bias=-.00015;sunLight.shadow.normalBias=.025;
  for(const [id,key]of [['sun-season','sunSeason'],['sun-hour','sunHour']]) {
    const input=$('#'+id);input.value=state[key];input.addEventListener('input',()=>{state[key]=Number(input.value);solarDirty=true;requestFrame();});
  }
  $('#night-preview').addEventListener('click',()=>{state.sunHour=20;$('#sun-hour').value=20;solarDirty=true;requestFrame();});
  solarDirty=true;requestFrame();
}
function updateSolarLight() {
  const sun=solarPosition({...solarSite,dayOfYear:seasonDay(state.sunSeason),hour:state.sunHour});
  updateLandscapeSeason(seasonDay(state.sunSeason));
  const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);},day=smooth(-6,9,sun.altitude),direct=smooth(-.5,12,sun.altitude);
  sunLight.target.position.set(0,4,0);sunLight.position.set(90*sun.east,4+90*sun.up,-90*sun.north);sunLight.intensity=2.5*direct;sunLight.castShadow=direct>.01;
  sunLight.color.set(0xffc998).lerp(new THREE.Color(0xfff3df),smooth(0,30,sun.altitude));skyLight.intensity=.06+1.44*day;
  skyLight.color.set(0x8fa6c1).lerp(new THREE.Color(0xffffff),day);
  scene.background.set(0x1d2936).lerp(new THREE.Color(0xe8e9e5),day);
  $('#sun-date').textContent=seasonDate(state.sunSeason);const minutes=Math.round(state.sunHour*60);$('#sun-time').textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  nightStrength=1-smooth(-4,8,sun.altitude);materials.warmGlow.emissiveIntensity=1.8*nightStrength;materials.taskGlow.emissiveIntensity=1.6*nightStrength;materials.lampShade.emissiveIntensity=.35*nightStrength;
  updateLightingNote();renderer.shadowMap.needsUpdate=true;solarDirty=false;
}

function updateLightingNote() {
  const cut=state.floor!=='all'||$('#cutaway').checked||!$('#show-roof').checked;
  $('#loading').hidden=!(nightStrength>.5&&bakeLoading);
  $('#solar-note').textContent='北京时间 · '+(nightStrength>.5?(bakeLoading?'夜景光照载入中…':bakeError?'夜景光照未载入，请刷新':cut?'剖切夜景示意':'夜景灯光预览'):cut?'剖切光影示意':'晴天日照示意');
}
function setupNightLighting() {
  const count=24;
  for(let i=0;i<count;i++) {
    const light=new THREE.SpotLight(0xffdfb4,0,5,.5,.8,2);light.visible=false;
    light.castShadow=i<2;light.shadow.mapSize.set(512,512);light.shadow.bias=-.0002;light.shadow.normalBias=.02;
    scene.add(light,light.target);nightLightSlots.push(light);
  }
}
function updateNightLighting() {
  if(!nightLightSlots.length)return;
  if(bakedLighting){bakedLighting.setStrength(state.design==='original'?nightStrength:0);for(const light of nightLightSlots)light.visible=false;return;}
  if(nightStrength<.002||state.design!=='original') {
    for(const light of nightLightSlots)light.visible=false;
    nightSignature='';return;
  }
  const visible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
  const ranked=fixtureSources.filter(f=>visible(f.parent)).map(f=>{
    const point=f.parent.localToWorld(f.point.clone()),target=f.parent.localToWorld(f.target.clone()),spec=f.spec;
    const primary=['downlight','pendant','linear','indirect-fill'].includes(spec.kind),priority=spec.kind==='floor'?25:state.floor==='all'?spec.exterior?8:primary?7:2:primary?20:2;
    return {f,point,target,score:priority+(spec.room===state.selected?50:0)-point.distanceTo(camera.position)*.12};
  }).sort((a,b)=>b.score-a.score);
  const represented=new Set(),primary=[],extra=[];
  for(const item of ranked){const f=item.f.spec,key=f.home+f.level+f.room;if(represented.has(key))extra.push(item);else{represented.add(key);primary.push(item);}}
  const chosen=[...primary,...extra].slice(0,nightLightSlots.length).sort((a,b)=>a.f.spec.id.localeCompare(b.f.spec.id));
  const signature=chosen.map(v=>v.f.spec.id).join('|')+state.floor+state.home;
  for(let i=0;i<nightLightSlots.length;i++) {
    const light=nightLightSlots[i],item=chosen[i];light.visible=!!item;if(!item)continue;
    const spec=item.f.spec;light.position.copy(item.point);light.target.position.copy(item.target);
    light.color.set(spec.temperature===3000?0xffe5c6:0xffd7a5);light.intensity=spec.intensity*nightStrength;light.distance=spec.distance;light.angle=spec.angle;light.penumbra=.8;
    light.target.updateMatrixWorld();
  }
  if(signature!==nightSignature){renderer.shadowMap.needsUpdate=true;nightSignature=signature;}
}

function bindControls() {
  if(facadeChanges) {
    $('#roof-color-section').hidden=false;$('#roof-color').value=state.roofColor;
    $('#roof-color').addEventListener('change',changeRoofColor);
  }
  function revealModel() {if(matchMedia('(max-width:740px)').matches)$('.viewer').scrollIntoView({behavior:'smooth',block:'start'});}
  $$('[data-design]').forEach(b=>b.addEventListener('click',()=>{state.design=b.dataset.design;state.selected=null;updateView();revealModel();}));
  $$('[data-floor]').forEach(b=>b.addEventListener('click',()=>{
    state.floor=b.dataset.floor;state.selected=null;
    labels.forEach(l=>l.el.classList.remove('selected'));
    updateView(true);revealModel();
  }));
  $$('[data-home]').forEach(b=>b.addEventListener('click',()=>{state.home=b.dataset.home;state.selected=null;updateView(true);revealModel();}));
  $$('[data-scene]').forEach(b=>b.addEventListener('click',()=>{
    state.scene=b.dataset.scene;state.selected=null;
    if(state.scene==='festival') {state.floor='1';state.home='both';if(facadeChanges)state.camera='top';}
    updateView(true);revealModel();
  }));
  $$('[data-camera]').forEach(b=>b.addEventListener('click',()=>{
    if(['site','arrival','garden'].includes(b.dataset.camera)) {state.floor='all';state.home='both';state.selected=null;state.camera=b.dataset.camera;updateView(true);}
    else setCamera(b.dataset.camera);
  }));
  ['cutaway','show-roof','show-labels'].forEach(id=>$('#'+id).addEventListener('change',()=>updateView()));
  $('#reset').addEventListener('click',()=>setCamera('bird'));
  $('#show-cars').addEventListener('change',()=>updateView());
  $$('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{
    const offset=camera.position.clone().sub(controls.target);
    const distance=THREE.MathUtils.clamp(offset.length()*(b.dataset.zoom==='in'?.8:1.25),controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setLength(distance));controls.update();requestFrame();
  }));
  $('#share').addEventListener('click',share);
  bindModelGestures();
  if(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0||matchMedia('(max-width:740px)').matches)$('#gesture-hint').textContent='单指旋转 · 双指捏合缩放 / 拖动平移';
  if(facadeChanges)$('#gesture-hint').textContent+=' · 点门窗开合';
}

function bindModelGestures() {
  const surface=$('#model-surface'),active=new Set();let tap;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  surface.addEventListener('pointerdown',e=>{
    if(e.button!==0){tap=null;return;}
    active.add(e.pointerId);surface.setPointerCapture(e.pointerId);
    const label=labels.find(l=>l.el===e.target.closest('.room-label'));
    tap=active.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,room:label?.room}:null;
  },true);
  surface.addEventListener('pointermove',e=>{
    if(tap&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap=null;
  },true);
  surface.addEventListener('pointerup',e=>{
    const candidate=tap;active.delete(e.pointerId);tap=null;
    if(!candidate||candidate.id!==e.pointerId||active.size||e.timeStamp-candidate.time>500||Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)>8)return;
    if(candidate.room){
      const room=candidate.room;
      const entry=facadeChanges&&[...openingEntries.values()].find(e=>e.wall.home===room.home&&e.wall.level===room.level&&(room.id.endsWith('-balcony-door')&&e.wall.study==='门2'||room.id.endsWith('-terrace-door')&&e.wall.study==='门1'||room.id.endsWith('-rear-exit')&&e.wall.code==='rear-exit'||room.id.endsWith('-back-entry')&&e.wall.code==='back-entry'||room.id.endsWith('-courtyard-access')&&e.wall.code==='courtyard-access'||room.id.endsWith('-gallery-terrace')&&e.wall.code==='gallery-terrace'));
      if(entry){toggleOpening(entry);return;}
      selectRoom(room);return;
    }
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    if(facadeChanges&&pickOpening(raycaster))return;
    const visible=roomMeshes.filter(m=>m.userData.room.design===state.design&&m.parent.visible&&m.parent.parent.visible);
    const hit=raycaster.intersectObjects(visible,false)[0];if(hit)selectRoom(hit.object.userData.room);
  },true);
  const cancel=e=>{active.delete(e.pointerId);tap=null;};
  surface.addEventListener('pointercancel',cancel,true);
  surface.addEventListener('lostpointercapture',cancel,true);
}
let toastTimer;
function changeRoofColor() {
  state.roofColor=$('#roof-color').value;
  materials.seamRoof.color.setHex(roofColors[state.roofColor].hex);
  $('#show-roof').checked=true;
  const move=state.floor!=='all';state.floor='all';
  const url=new URL(location.href);url.searchParams.set('roof',state.roofColor);history.replaceState(null,'',url.href);
  updateView(move);
}
function toast(text) {$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
async function share() {
  const url=new URL(location.href);url.search='';url.searchParams.set('design',state.design);url.searchParams.set('floor',state.floor);url.searchParams.set('scene',state.scene);url.searchParams.set('home',state.home);
  if(facadeStudy){url.searchParams.set('facade','1');url.searchParams.set('v',strictOriginal?'strict-1':'1101-v6-wall-joints-4');}
  if(facadeStudy&&!strictOriginal&&state.roofColor)url.searchParams.set('roof',state.roofColor);
  if(['site','north','arrival','garden'].includes(state.camera))url.searchParams.set('view',state.camera);
  if(facadeChanges){url.searchParams.set('season',state.sunSeason.toFixed(3));url.searchParams.set('hour',state.sunHour.toFixed(2));}
  try {
    if(navigator.share)await navigator.share({title:strictOriginal?'严格原图版 · 祁东双户住宅':facadeStudy?'方案11/01 · v6 · 祁东双户住宅':'祁东双户合院 · 一起看家',text:strictOriginal?'门窗平面按原始PDF核对，层高与门窗高度未核实。':state.camera==='site'?'看看新宅与周边道路、田地和水塘的关系。':facadeStudy?'看看当前门窗、卧室书桌和联厅布置。':'转一转模型，看看长辈房和20人团圆宴的布置。',url:url.href});
    else {await navigator.clipboard.writeText(url.href);toast('分享链接已复制，可以发给家人了');}
  }catch(e){if(e.name!=='AbortError')toast('请复制浏览器地址栏中的链接分享');}
}
function resize() {
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  const ratio=Math.min(Math.max(devicePixelRatio,2),3,Math.sqrt(4_000_000/(w*h)));
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestFrame();
}
function render(time=performance.now()) {
  nextFrame=false;if(solarDirty)updateSolarLight();controls.update();scene.updateMatrixWorld();
  let moving=false;
  for(const entry of openingEntries.values())if(entry.value!==entry.target) {
    const progress=Math.min(1,Math.max(0,(time-entry.started)/360));
    entry.value=matchMedia('(prefers-reduced-motion:reduce)').matches||progress===1?entry.target:entry.from+(entry.target-entry.from)*(1-(1-progress)**3);
    entry.variants.forEach(v=>v.setOpen(entry.value));moving=true;
  }
  if(moving){renderer.shadowMap.needsUpdate=true;scene.updateMatrixWorld();requestFrame();}
  if(facadeChanges)updateNightLighting();renderer.render(scene,camera);
  const width=host.clientWidth,height=host.clientHeight;
  const occupied=[];
  const priority=l=>l.room.id===state.selected?0:['bath','laundry'].includes(l.room.kind)?1:['service','stairs'].includes(l.room.kind)?3:2;
  for(const l of [...labels].sort((a,b)=>priority(a)-priority(b))) {
    const floorVisible=(state.floor==='all'?l.room.id==='court'||facadeStudy&&(l.room.id.endsWith('-terrace-door')||l.room.id.endsWith('-balcony-door')||l.room.id==='east-pavilion'):state.floor==='explode'||Number(state.floor)===l.room.level);
    const visible=state.camera!=='site'&&l.room.design===state.design&&$('#show-labels').checked&&floorVisible&&(state.home==='both'||l.room.home===state.home||l.room.home==='both');
    if(!visible){l.el.hidden=true;continue;}
    const p=l.point.clone();l.parent.localToWorld(p);p.project(camera);
    const x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;
    l.el.hidden=p.z>1||p.z<0||x<0||x>width||y<45||y>height-35;
    if(!l.el.hidden){
      l.el.style.left=x+'px';l.el.style.top=y+'px';
      const w=l.el.offsetWidth,h=l.el.offsetHeight;
      const rect={left:x-w/2-3,right:x+w/2+3,top:y-h/2-2,bottom:y+h/2+2};
      const overlaps=()=>occupied.some(r=>r.left<rect.right&&r.right>rect.left&&r.top<rect.bottom&&r.bottom>rect.top);
      let offset=0;
      if(['bath','laundry'].includes(l.room.kind)) {
        while(overlaps()) {offset+=h+5;rect.top-=h+5;rect.bottom-=h+5;}
        l.el.style.top=(y-offset)+'px';
      }
      l.el.classList.toggle('shifted',offset>0);
      l.el.style.setProperty('--leader',Math.max(0,offset-h/2)+'px');
      if(!['bath','laundry'].includes(l.room.kind)&&l.room.id!==state.selected&&overlaps())l.el.hidden=true;
      else occupied.push(rect);
    }
  }
}
