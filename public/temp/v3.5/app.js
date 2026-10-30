import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js?v=mobile-2';
import { seasonDay, seasonDate, solarPosition } from './solar-position.js?v=1029-v35-facade-1';
import { createOpening } from './opening-motion.js?v=1029-v35-facade-1';
import { loadBakedLighting } from './baked-lighting.js?v=1029-v35-facade-1';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const host = $('#canvas-host');
const params = new URLSearchParams(location.search);
const roofColors={stone:{name:'暖石板灰',hex:0x676962},charcoal:{name:'深炭灰',hex:0x3f4442},olive:{name:'灰橄榄',hex:0x666c60},clay:{name:'烟陶红',hex:0x8a6256},sand:{name:'砂岩褐',hex:0x80796b}};
const strictOriginal = /\/v2(?:\/index\.html)?\/?$/.test(location.pathname);
const facadeStudy = strictOriginal||params.get('facade')==='1'||(!params.has('design')&&params.get('facade')!=='0');
const facadeChanges = facadeStudy&&!strictOriginal;
const boundedParam=(key,min,max,fallback)=>params.has(key)&&Number.isFinite(Number(params.get(key)))?Math.max(min,Math.min(max,Number(params.get(key)))):fallback;
const state = {
  design: !facadeStudy&&params.get('design')==='proposed'?'proposed':'original',
  floor: ['all','1','2','3','explode'].includes(params.get('floor')) ? params.get('floor') : facadeStudy?'all':'1',
  scene: params.get('scene') === 'festival' ? 'festival' : 'daily',
  home: ['A','B'].includes(params.get('home')) ? params.get('home') : 'both',
  camera: facadeStudy?(['site','north'].includes(params.get('view'))?params.get('view'):facadeChanges&&params.get('scene')==='festival'?'top':'entry'):'bird', selected: null,
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
mat('metal',0x64776d); mat('glass',0xa6c9c2,{transparent:true,opacity:.4,roughness:.18,depthWrite:false});
mat('windowFrame',0x718e80); mat('sofa',0xc4bda4); mat('seat',0xafb9a1);
mat('dark',0x394a40); mat('tile',0xd0ded6); mat('water',0xa0c4c2); mat('roof',0x6e7b6d);
mat('ground',0xd6ddcc); mat('paving',0xe3e3d6); mat('court',0xd2d9c4); mat('red',0xaa6049);
mat('frost',0xd9e3dd,{transparent:true,opacity:.78,roughness:.8});
mat('guardGlass',0xc2d3d6,{transparent:true,opacity:.30,roughness:.08,depthWrite:false,side:THREE.DoubleSide});
mat('plinth',0x96958e);mat('joint',0xc4c0b7);mat('leaf',0x526d36);mat('pot',0x777a6b);
mat('woodLine',0x84623d);
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
  document.title=(strictOriginal?'严格原图版':'方案10/30 · v3.5')+' · 祁东双户住宅';
  if(strictOriginal)$('.brand small').textContent='平面核对 · 高度未核实';
  for(const [name,color] of Object.entries({wall:0xf2e9d9,wallCap:0x777a75,slab:0xe6e0d3,roof:0xb3b0a7,windowFrame:0x414944,metal:0x414944,wood:0xa57a48,glass:0xa8b9bf,ground:0xd2d0c8,paving:0xe1ddd2,court:0xd2cebc}))materials[name].color.setHex(color);
  materials.glass.opacity=.28;
  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=128;
  const textureContext=textureCanvas.getContext('2d');textureContext.fillStyle='#c9bda9';textureContext.fillRect(0,0,128,128);
  for(let i=0;i<900;i++) {const shade=165+i%55;textureContext.fillStyle=`rgb(${shade},${shade},${shade})`;textureContext.fillRect(i*37%128,i*61%128,1,1);}
  const stucco=new THREE.CanvasTexture(textureCanvas);stucco.wrapS=stucco.wrapT=THREE.RepeatWrapping;stucco.repeat.set(3,3);
  materials.wall.bumpMap=stucco;materials.wall.bumpScale=.018;
  $$('.brand strong').forEach(el=>el.textContent=strictOriginal?'严格原图版':'方案10/30 · v3.5');if(strictOriginal)$('.brand').href='./v2/';
  $('#original-model')?.style.setProperty('display','flex');
  $$('[data-design="original"]').forEach(el=>el.textContent=strictOriginal?'严格原图版':'方案10/30 · v3.5');
}
if(facadeChanges)materials.seamRoof.color.setHex(roofColors[state.roofColor].hex);
const unitBox = new THREE.BoxGeometry(1,1,1);
const unitCylinder = new THREE.CylinderGeometry(1,1,1,24);
const unitSphere = new THREE.SphereGeometry(1,12,8);
const toiletSeat = new THREE.TorusGeometry(1,.13,8,24);toiletSeat.rotateX(-Math.PI/2);
const batches = new Map();
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
  const [proposal,original] = await Promise.all(['./model.json',strictOriginal?'./v2/model.json?v=strict-1':facadeStudy?'./facade-model.json?v=1029-v35-facade-1':'./original-model.json'].map(async p=>(await fetch(p)).json()));
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
  buildModel('original',original);if(!strictOriginal)buildModel('proposed',proposal);finalizeBatches();
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
  // Rear service recess stays open on every level, matching the plan drawings.
  const notched=[];
  for (let i=0;i<points.length;i++) {
    const p=points[i], next=points[(i+1)%points.length]; notched.push(p);
    if(p[0]===0 && p[1]===16.7 && next[0]===13.8) notched.push([3.3,16.7],[3.3,data.recess||15.3],[6.9,data.recess||15.3],[6.9,16.7]);
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
  data=modelData;currentDesign=design;
  const root=group(scene);roots[design]=root;
  const original=design==='original';
  const joined=facadeChanges&&original&&modelData.joinedLayout;
  if(joined)joinedLayout=joined;
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
    const tree=group(paving);if(joined)tree.position.y=-.45;makeCourtyardTree(tree);
  }
  for(let level=1;level<=3;level++) {
    const f=group(building);f.position.y=base[level-1];floors.push({g:f,level,design});thisFloors.push(f);
    for(const home of ['A','B']) {
      const g=group(f);homes.push({g,home,level});
      if(joined)g.position.x=joined.homeShift[home];
      const outline=original&&level===1?(strictOriginal?data.groundOutline:data.outline.map(([x,y])=>[x===10.2&&[6.7,11.1].includes(y)?9.4:x,y])):data.outline;
      const floorOutline=data.hallDesign&&level===2?outline.filter(([x,y])=>!((x===12.3&&[0,6.7].includes(y))||(x===7.5&&y===0))).map(([x,y])=>x===7.5&&y===2.2?[7.5,6.7]:[x,y]):outline;
      if(data.hallDesign&&level===2)floorOutline.splice(floorOutline.findIndex(([x,y])=>x===3.3&&y===2.2),0,[7.5,2.2]);
      footprint(level===3&&!strictOriginal?data.upper:floorOutline,home,level,g,0,.18,joined?floorMaterials.outdoor:materials.slab,level>1);
      if(data.hallDesign&&level===2){footprint([[7.5,0],[12.3,0],[12.3,6.7],[7.5,6.7]],home,level,g,1.1,.18,floorMaterials.outdoor);makeHallAccessSteps(g,home);}
      if(joined&&level===1)footprint(outline,home,level,g,-.18,.27,materials.plinth);
      if(joined)for(const balcony of data.northBalconies.filter(b=>b.home===home&&b.level===level)){const [x,y,w,d]=balcony.localRect;footprint([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],home,level,g,0,.18,materials.slab);}
      const full=group(g),low=group(g);wallSets.push({full,low});
      for(const wall of data.walls.filter(w=>w.level===level&&w.home===home)) {
        const raised=wall.floorOffset||0,fg=raised?group(full):full,lg=raised?group(low):low;fg.position.y=raised;lg.position.y=raised;
        makeWall(wall,fg,wall.wallHeight??heights[level-1],false);makeWall(wall,lg,1.08,true);
      }
      if(strictOriginal)makeStrictStructure(home,level,full,low);
      if(joined)for(const column of data.columns.filter((v,i)=>v.home===home&&v.level===level&&!data.omittedColumns.includes(i)&&(!v.low||v.rect[1]>=8.15))) {
        makeStudyColumn(column,full,low);
      }
      for(const room of data.rooms.filter(r=>r.level===level&&r.home===home)) makeRoom({...room,design},g);
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
          makeLabel({id:home+'-back-entry',home,level,rect:[mirror(home,5.5,1),14.55,1,.7],kind:'terrace',name:'北侧后门',description:data.backAccess.description},g);
          const access=data.courtyardAccess,[px,py,pw,pd]=access.landing;
          block(g,mx(px,pw),py,pw,pd,-data.vertical.outdoorLevel,data.vertical.outdoorLevel,materials.slab);
          for(let i=1;i<access.risers;i++)block(g,mx(px+pw+(i-1)*access.tread,access.tread),py,access.tread,pd,-data.vertical.outdoorLevel-i*access.riserHeight,data.vertical.outdoorLevel,materials.slab);
          makeLabel({id:home+'-courtyard-access',home,level,rect:[mx(9.1,.6),9,.6,.7],kind:'service',name:'天井门',description:access.description},g);
        }
        if(joined&&level===2){const laundry=group(g);laundry.position.y=data.hallDesign?1.1:0;makeTerraceLaundry(laundry,home);}
        if(facadeChanges) {
          if(level===1) {
            makePlanter(g,home,8.0,.5,.75);
          }
          if(level===2){const planter=group(g);planter.position.y=data.hallDesign?1.1:0;makePlanter(planter,home,7.95,.65,.7);}
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
      if(facadeChanges&&original&&level===3) {
        const arrival=group(g);arrival.userData.stairArrival={home,fromLevel:2};arrival.position.y=-heights[1];makeStairs(arrival,home,heights[1]);
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
      if(joined)for(const guard of data.guards.filter(v=>v.home===home&&v.level===level)){const rg=group(g);rg.position.y=guard.floorOffset||0;if(guard.material==='masonry')makeMasonryGuard(rg,guard);else rail(rg,...guard.points,guard.height);}
      if(joined)for(const guard of data.stairGlassGuards.filter(v=>v.home===home&&v.level===level))makeStairGlassGuard(g,guard);
    }
    if(joined)makeInteriorLighting(f,'both',level);
    if(strictOriginal||facadeChanges&&original) {
      const full=group(f),low=group(f);wallSets.push({full,low});
      for(const wall of data.walls.filter(w=>w.level===level&&w.home==='both')) {
        makeWall(wall,full,data.separatedBuildings&&!data.hallDesign&&level===1?3.3:heights[level-1],false);makeWall(wall,low,1.08,true);
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


function makeMasonryGuard(parent,guard) {
  const [a,b,c,d]=guard.points,len=Math.hypot(c-a,d-b),angle=Math.atan2(d-b,c-a),cx=(a+c)/2,cy=(b+d)/2;
  solid(parent,unitBox,materials.wall,[cx-14.8,guard.height/2,8.35-cy],[len,guard.height,.18],angle);
  solid(parent,unitBox,materials.wallCap,[cx-14.8,guard.height+.025,8.35-cy],[len+.04,.05,.22],angle);
}
function makeHallAccessSteps(parent,home) {
  const mx=(x,w=0)=>mirror(home,x,w),rise=1.1/7;
  block(parent,mx(7.5,2.7),6.64,2.7,.06,1.1,0,materials.wall);
  for(let i=1;i<=6;i++)block(parent,mx(8.8,1),8.5-i*.3,1,.3,i*rise,0,materials.slab);
  for(const x of [8.82,9.78]) {
    for(let i=0;i<=6;i++){const yy=8.5-i*.3,zz=i*rise;block(parent,mx(x,.025),yy,.025,.025,.95+i*(1.1/6-rise),zz,materials.guardMetal);}
    const a=worldPoint(mx(x),8.5,.95),b=worldPoint(mx(x),6.7,1.1+.95),delta=b.clone().sub(a);
    const g=group(parent);g.position.copy(a.clone().add(b).multiplyScalar(.5));g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
    solid(g,unitBox,materials.guardMetal,[0,0,0],[.035,delta.length(),.035]);
  }
}
function profiledLaundryBlock(parent,w,x,y,dx,dy,bottom,top,material) {
  const corners=[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy]],limit=(xx,yy)=>3.3+lowRoofHeight(w.home==='A'?xx:29.6-xx,yy)-.04-(w.floorOffset||0);
  if(Math.max(...corners.map(([xx,yy])=>limit(xx,yy)))<=bottom+.005)return;
  const p=[...corners.map(([xx,yy])=>worldPoint(xx,yy,bottom)),...corners.map(([xx,yy])=>worldPoint(xx,yy,Math.max(bottom,Math.min(top,limit(xx,yy)))))];
  const indices=[0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7],geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(i=>p[i].toArray()),3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
}

function makeStudyColumn(column,full,low) {
  const [x,y,w,d]=column.rect,level=column.level,bottom=level===1?data.vertical.outdoorLevel-.05:(column.bottomOffset||0);
  const local=column.home==='A'?x:29.6-x-w,wing=level===2&&y<8.15&&local>2.9&&local<7.75;
  const roofY=yy=>{
    const r=data.pitchedRoof,ridge=r.frontEave+(r.ridgeY-r.frontY)*Math.tan(r.pitch*Math.PI/180);
    return yy<=r.ridgeY?r.frontEave+(yy-r.frontY)*Math.tan(r.pitch*Math.PI/180):ridge-(yy-r.ridgeY)*(ridge-r.backEave)/(16.7+r.overhang-r.ridgeY);
  };
  const top=(xx,yy)=>column.topHeight??(level===3?roofY(yy)-.04:wing?heights[1]+lowRoofHeight(column.home==='A'?xx:29.6-xx,yy)-.04:heights[level-1]);
  const corners=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],points=[...corners.map(([a,b])=>worldPoint(a,b,bottom)),...corners.map(([a,b])=>worldPoint(a,b,top(a,b)))];
  const indices=[0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7],vertices=indices.flatMap(i=>points[i].toArray());
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,materials.wall);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.studyColumn=column;full.add(mesh);
  if(level<3&&!wing)block(full,x,y,w,d,.018,column.topHeight??heights[level-1],materials.column);
  const cutTop=Math.max(1.08,bottom+1.08);block(low,x,y,w,d,cutTop-bottom,bottom,materials.wall);block(low,x,y,w,d,.018,cutTop,materials.column);
  if(level===1)for(const parent of [full,low])block(parent,x-.006,y-.006,w+.012,d+.012,.55-bottom,bottom,materials.plinth);
}

function makeWall(w,parent,height,cut) {
  const [x1,y1,x2,y2]=w.points, horizontal=Math.abs(y2-y1)<.001;
  const length=Math.hypot(x2-x1,y2-y1),width=w.width;
  const x=Math.min(x1,x2)-(horizontal?0:width/2),y=Math.min(y1,y2)-(horizontal?width/2:0);
  const dx=horizontal?length:width,dy=horizontal?width:length;
  function part(bottom,top,material=materials.wall,thickness=1) {
    top=Math.min(top,height);if(top-bottom<.015)return;
    const xx=x+(horizontal?0:width*(1-thickness)/2),yy=y+(horizontal?width*(1-thickness)/2:0),ww=horizontal?dx:dx*thickness,dd=horizontal?dy*thickness:dy;
    if(w.lowRoofLimit){profiledLaundryBlock(parent,w,xx,yy,ww,dd,bottom,top,material);return;}
    block(parent,xx,yy,ww,dd,top-bottom,bottom,material);
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
    part(0,sill);part(head,height);
    if(w.continuousStack&&!cut)part(w.level===1?head:0,w.level===1?height:sill,materials.windowFrame,.34);
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
    part(w.head??2.35,height);
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
    return horizontal?(Math.abs(b-y)<.001||Math.abs(b-y-depth)<.001)&&middle[0]>=x&&middle[0]<=x+width:(Math.abs(a-x)<.001||Math.abs(a-x-width)<.001)&&middle[1]>=y&&middle[1]<=y+depth;
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
    if(a[0]===0&&a[1]===16.7&&b[0]===13.8)edge.push([3.3,16.7],[3.3,data.recess],[6.9,data.recess],[6.9,16.7]);
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
  const ridge=r.frontEave+(r.ridgeY-front)*Math.tan(r.pitch*Math.PI/180);
  const top=y=>y<=r.ridgeY?r.frontEave+(y-front)*Math.tan(r.pitch*Math.PI/180):ridge-(y-r.ridgeY)*(ridge-r.backEave)/(back-r.ridgeY);
  const panel=(a,b,c,d)=>{
    const points=[[mx(a),c,top(c)],[mx(b),c,top(c)],[mx(b),d,top(d)],[mx(a),d,top(d)]];
    roofSurface(parent,points,materials.seamRoof);roofSurface(parent,points.map(([x,y,z])=>[x,y,z-.04]),materials.windowFrame);
  };
  // All front surfaces share one plane; the stair roofs no longer overlap the main roof.
  for(const [a,b,start]of [[-o,3.3-o,11.1-o],[3.3-o,10.2+o,front],[10.2+o,end,11.1-o]])panel(a,b,start,r.ridgeY);
  for(const [a,b,stop]of [[-o,3.3,back],[3.3,6.9,data.recess],[6.9,end,back]])panel(a,b,r.ridgeY,stop);
  for(const [a,b,y]of [[0,3.3,11.1],[3.3,10.2,8.5],[10.2,13.8,11.1],[0,3.3,16.7],[3.3,6.9,data.recess],[6.9,13.8,16.7]]) {
    roofSurface(parent,[[mx(a),y,wallTop],[mx(b),y,wallTop],[mx(b),y,top(y)],[mx(a),y,top(y)]],materials.roofInfill);
  }
  for(const [x,a,b]of [[0,11.1,16.7],[3.3,8.5,11.1],[10.2,8.5,11.1],[3.3,data.recess,16.7],[6.9,data.recess,16.7],[13.8,11.1,16.7]]) {
    const points=[[mx(x),a,wallTop],[mx(x),b,wallTop],[mx(x),b,top(b)]];
    if(a<r.ridgeY&&b>r.ridgeY)points.push([mx(x),r.ridgeY,ridge]);
    points.push([mx(x),a,top(a)]);roofSurface(parent,points,materials.roofInfill);
  }
  for(let x=-o+.28;x<end;x+=r.seamSpacing) {
    const start=x>=3.3-o&&x<=10.2+o?front:11.1-o,stop=x>3.3&&x<6.9?data.recess:back;
    for(const [a,b]of [[start,r.ridgeY],[r.ridgeY,stop]])roofSurface(parent,[[mx(x-.008),a,top(a)+.012],[mx(x+.008),a,top(a)+.012],[mx(x+.008),b,top(b)+.012],[mx(x-.008),b,top(b)+.012]],materials.windowFrame);
  }
  for(const [a,b,y]of [[-o,3.3-o,11.1-o],[3.3-o,10.2+o,front],[10.2+o,end,11.1-o],[-o,3.3,back],[3.3,6.9,data.recess],[6.9,end,back]])facadeBand(parent,home,[a,y],[b,y],.13,.10,top(y)-.07,materials.windowFrame);
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
  roofSurface(roof,[[13.65,10.9,4.25],[15.95,10.9,4.25],[15.95,16.9,3.95],[13.65,16.9,3.95]],materials.seamRoof);
  for(const [yy,zz]of [[11.1,4.24],[16.7,3.96]]) {
    block(roof,13.8,yy-.1,2,.20,zz-3.9,3.9,materials.wall);
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
  roofSurface(roof,[[13.65,10.9,4.25],[15.95,10.9,4.25],[15.95,16.9,3.95],[13.65,16.9,3.95]],materials.seamRoof);
  for(const [yy,zz] of [[11.1,4.24],[16.7,3.96]])block(roof,13.8,yy-.1,2,.20,zz-3.9,3.9,materials.wall);
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
  block(parent,14.15,7.35,1.3,1.3,.03,-.03,materials.woodLine);
  cylinder(parent,14.8,8,.10,2.8,0,materials.wood);
  for(let i=0;i<17;i++)solid(parent,unitSphere,materials.leaf,[Math.cos(i*2.4)*.7,2.6+i%3*.32,.35+Math.sin(i*2.4)*.7],[.65,.55,.62],i);
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
  for(const path of context.accessPaths)siteRibbon(parent,path.points,path.width,materials.accessPaving,-.232,3.5);
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
  if(facadeChanges&&room.design==='original'&&room.kind==='bath')room={...room,description:(room.access==='switchable'?room.description:room.access==='public'?'从公共走廊进入。':'从相邻卧室进入。')+'设淋浴区、坐便器和洗手盆。洁具尺寸、门扇开启、排水与防水仍须深化。'};
  const [x,y,w,d]=room.rect;
  const material=facadeChanges&&room.design==='original'?floorMaterials[room.floorFinish]:new THREE.MeshStandardMaterial({color:colors[room.kind]||0xdedccc,roughness:1});
  const continuousDining=facadeChanges&&room.design==='original'&&room.level===1&&(room.kind==='dining'||room.id==='rear-link'||room.corridorAnnex);
  const geometry=roomGeometry(room,continuousDining?0:.23);
  if(material.userData.floorFinish) {
    const uv=geometry.attributes.uv,position=geometry.attributes.position,shift=data.joinedLayout.homeShift[room.home]??0;
    for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)+x+w/2+shift,position.getY(i)+y+d/2);
  }
  const mesh=new THREE.Mesh(geometry,material);
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(worldPoint(x+w/2,y+d/2,.008+(room.floorOffset||0)));
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
  el.addEventListener('click',e=>{if(e.detail===0)selectRoom(room);});$('#labels').append(el);
  const [x,y,w,d]=room.rect;
  labels.push({el,room,parent,point:worldPoint(x+w/2,y+d/2,.82+(room.floorOffset||0))});
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
  for(let i=0;i<n;i++){const t=(i+.5)/n;solid(g,unitBox,materials.guardGlass,[a+(c-a)*t-14.8,(item.height+.08)/2,8.35-b-(d-b)*t],[len/n-.02,item.height-.12,.016],angle);}
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
      block(g,x-dx*.42,y-dy*.42,dx*.84,dy*.84,.008,z+.067,glow);
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
    if(f.kind==='sconce'){const [nx,ny]=f.normal;fixtureSources.push({spec:{...f,id:f.id+'u',intensity:15,angle:.26,distance:1.4},parent,point:worldPoint(x,y,z+.08),target:worldPoint(x-nx*.08,y-ny*.08,z+.55)});}
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
  const [x,y,w]=room.rect;
  const mx=(u,width)=>room.home==='B'?x+w-u-width:x+u;
  if(room.id.endsWith('front-bath')) {
    makeShower(parent,mx(.12,.90),y+.12,.90,.90,'side',room.home==='B');
    makeToilet(parent,mx(1.15,.46),y+.10,'rear');
    if(room.access==='suite')makeBasin(parent,mx(2.30,.40),y+1.05,.40,.60,room.home==='B'?'right':'left');
    else makeBasin(parent,mx(1.80,.60),y+.10,.60,.40,'rear');
  } else if(['public','switchable'].includes(room.access)) {
    makeShower(parent,mx(.12,w-.24),y+1.38,w-.24,.90,'front',room.home==='A');
    makeToilet(parent,mx(.10,.46),y+.10,'rear');
    makeBasin(parent,mx(.10,.40),y+.82,.40,.50,room.home==='A'?'right':'left');
  } else {
    const reverse=(room.home==='B')!==room.id.endsWith('bath-right');
    const sx=(u,width)=>reverse?x+w-u-width:x+u;
    makeShower(parent,sx(.12,w-.24),y+1.38,w-.24,.90,'front',reverse);
    makeToilet(parent,sx(1.02,.68),y+.10,reverse?'right':'left');
    makeBasin(parent,sx(1.30,.40),y+.68,.40,.60,reverse?'right':'left');
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
  // A simple continuous inner guard indicates the stair direction in the concept model.
  for(let i=0;i<flight;i++) {
    const xx=mx(4.4+i*run);
    block(parent,xx-.02,9.88,.04,.04,.85,rise/2+(i+1)*rise/(2*flight),materials.metal);
  }
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
    const [x,y,w,d]=room.rect,shift=facadeChanges&&state.design==='original'?(joinedLayout?.homeShift[room.home]??0):0;highlighted.position.copy(worldPoint(x+w/2+shift,y+d/2,base[room.level-1]+offsetFor(room.level)+(room.floorOffset||0)+.025));
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
  if(siteNotes)siteNotes.visible=siteScenery.visible&&state.camera==='site';
  floors.forEach(({g,level})=>{g.visible=!only||only===level;g.position.y=base[level-1]+offsetFor(level);});
  homes.forEach(({g,home})=>{g.visible=state.home==='both'||state.home===home;});
  wallSets.forEach(({full,low})=>{full.visible=!$('#cutaway').checked;low.visible=$('#cutaway').checked;});
  arrivalStairs.forEach(g=>{g.visible=state.floor==='3'||state.floor==='explode';});
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
  $('#model-note').textContent=strictOriginal?'墙柱及门窗平面按原始PDF矢量核对，未增窗、未补门。层高、门窗高和窗台高未核实，暂作外观示意。':facadeStudy?'概念方案，非施工图。洞口仅作柱位几何避让，承载与抗震未验算。':state.design==='original'?'按原平面重建；层高、立面及露台边界为示意。':'概念方案，非施工图。每户一层、三层各1间洗衣房。';
  $('#original-drawing').href='./downloads/original-floor-'+(only||1)+'.pdf';
  $('#original-drawing b').textContent=(only?floorNames[only-1]:'一层')+'原始图纸';
  $('#room-detail').hidden=!state.selected;
  labels.forEach(l=>l.el.classList.toggle('selected',l.room.id===state.selected));
  highlighted.visible=false;
  if(moveCamera) setCamera(state.camera);
  requestFrame();
}
function setCamera(preset) {
  if(preset==='site'&&(!siteContextInfo||state.floor!=='all'||state.home!=='both'))preset='bird';
  state.camera=preset;
  const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;
  const width=host.clientWidth/host.clientHeight;
  if(siteNotes)siteNotes.visible=siteScenery.visible&&preset==='site';
  if(preset==='site') {
    camera.near=1;
    const xs=siteContextInfo.bounds.map(p=>p[0]),ys=siteContextInfo.bounds.map(p=>p[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2-14.8,z=8.35-(Math.min(...ys)+Math.max(...ys))/2;
    const direction=new THREE.Vector3(0,.84,.53).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right),tan=Math.tan(camera.fov*Math.PI/360);
    let distance=0;
    for(const p of siteContextInfo.bounds)for(const h of [-.27,20]) {
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
  Object.assign(sunLight.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:220});sunLight.shadow.camera.updateProjectionMatrix();sunLight.shadow.bias=-.00015;sunLight.shadow.normalBias=.025;
  for(const [id,key]of [['sun-season','sunSeason'],['sun-hour','sunHour']]) {
    const input=$('#'+id);input.value=state[key];input.addEventListener('input',()=>{state[key]=Number(input.value);solarDirty=true;requestFrame();});
  }
  $('#night-preview').addEventListener('click',()=>{state.sunHour=20;$('#sun-hour').value=20;solarDirty=true;requestFrame();});
  solarDirty=true;requestFrame();
}
function updateSolarLight() {
  const sun=solarPosition({...solarSite,dayOfYear:seasonDay(state.sunSeason),hour:state.sunHour});
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
    if(b.dataset.camera==='site') {state.floor='all';state.home='both';state.selected=null;state.camera='site';updateView(true);}
    else setCamera(b.dataset.camera);
  }));
  ['cutaway','show-roof','show-labels'].forEach(id=>$('#'+id).addEventListener('change',()=>updateView()));
  $('#reset').addEventListener('click',()=>setCamera('bird'));
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
  if(facadeStudy){url.searchParams.set('facade','1');url.searchParams.set('v',strictOriginal?'strict-1':'1029-v35-facade-1');}
  if(facadeStudy&&!strictOriginal&&state.roofColor)url.searchParams.set('roof',state.roofColor);
  if(['site','north'].includes(state.camera))url.searchParams.set('view',state.camera);
  if(facadeChanges){url.searchParams.set('season',state.sunSeason.toFixed(3));url.searchParams.set('hour',state.sunHour.toFixed(2));}
  try {
    if(navigator.share)await navigator.share({title:strictOriginal?'严格原图版 · 祁东双户住宅':facadeStudy?'方案10/30 · v3.5 · 祁东双户住宅':'祁东双户合院 · 一起看家',text:strictOriginal?'门窗平面按原始PDF核对，层高与门窗高度未核实。':state.camera==='site'?'看看新宅与周边道路、田地和水塘的关系。':facadeStudy?'看看当前门窗、卧室书桌和联厅布置。':'转一转模型，看看长辈房和20人团圆宴的布置。',url:url.href});
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
    const floorVisible=(state.floor==='all'?l.room.id==='court'||facadeStudy&&(l.room.id.endsWith('-terrace-door')||l.room.id.endsWith('-balcony-door')):state.floor==='explode'||Number(state.floor)===l.room.level);
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
