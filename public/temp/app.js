import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js?v=mobile-2';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const host = $('#canvas-host');
const params = new URLSearchParams(location.search);
const facadeStudy = params.get('facade')==='1'||(!params.has('design')&&params.get('facade')!=='0');
const state = {
  design: !facadeStudy&&params.get('design')==='proposed'?'proposed':'original',
  floor: ['all','1','2','3','explode'].includes(params.get('floor')) ? params.get('floor') : facadeStudy?'all':'1',
  scene: params.get('scene') === 'festival' ? 'festival' : 'daily',
  home: ['A','B'].includes(params.get('home')) ? params.get('home') : 'both',
  camera: facadeStudy?(params.get('view')==='site'?'site':'entry'):'bird', selected: null,
};
const base = [0, 3.3, 6.4];
const heights = [3.3, 3.1, 3.0];
const floorNames = ['一层','二层','三层'];
const colors = { bedroom:0xd9e2ce, elder:0xd5e1c4, living:0xe4d9bf, reunion:0xe6cdb5,
  kitchen:0xe2d6bc, dining:0xe4d9bf, bath:0xc8dedc, laundry:0xdce3d5, service:0xe0e2d9, stairs:0xd9dbd1 };
const materials = {};
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
if(facadeStudy) {
  document.body.classList.add('facade-study');
  document.title='原图外观草案 · 祁东双户住宅';
  for(const [name,color] of Object.entries({wall:0xf2e9d9,wallCap:0x777a75,slab:0xe6e0d3,roof:0xb3b0a7,windowFrame:0x414944,metal:0x414944,wood:0xa57a48,glass:0xa8b9bf,ground:0xd2d0c8,paving:0xe1ddd2,court:0xd2cebc}))materials[name].color.setHex(color);
  materials.glass.opacity=.28;
  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=128;
  const textureContext=textureCanvas.getContext('2d');textureContext.fillStyle='#c9bda9';textureContext.fillRect(0,0,128,128);
  for(let i=0;i<900;i++) {const shade=165+i%55;textureContext.fillStyle=`rgb(${shade},${shade},${shade})`;textureContext.fillRect(i*37%128,i*61%128,1,1);}
  const stucco=new THREE.CanvasTexture(textureCanvas);stucco.wrapS=stucco.wrapT=THREE.RepeatWrapping;stucco.repeat.set(3,3);
  materials.wall.bumpMap=stucco;materials.wall.bumpScale=.018;
  $$('.brand strong').forEach(el=>el.textContent='原图外观草案');$('.brand').href='./facade/?v=site-3';
  $('#original-model')?.style.setProperty('display','flex');
  $$('[data-design="original"]').forEach(el=>el.textContent='原图外观草案');
}
const unitBox = new THREE.BoxGeometry(1,1,1);
const unitCylinder = new THREE.CylinderGeometry(1,1,1,24);
const unitSphere = new THREE.SphereGeometry(1,12,8);
const toiletSeat = new THREE.TorusGeometry(1,.13,8,24);toiletSeat.rotateX(-Math.PI/2);
const batches = new Map();
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

let renderer, scene, camera, controls, data, currentDesign;
let siteContextInfo,siteScenery,siteNotes;
function siteAngle() {return siteContextInfo&&state.design==='original'?(180-siteContextInfo.frontBearing)*Math.PI/180:0;}
const roots={};
const floors = [], homes = [], roofGroups = [], wallSets = [], roomMeshes = [], labels = [];
let dailyFurniture, festivalFurniture, highlighted;
let nextFrame = false;
function requestFrame() { if (!nextFrame) { nextFrame=true; requestAnimationFrame(render); } }
function fail(error) {
  console.error(error); $('#loading').hidden=true; $('#fallback').hidden=false;
}

try {
  const [proposal,original] = await Promise.all(['./model.json',facadeStudy?'./facade-model.json?v=site-3':'./original-model.json'].map(async p=>(await fetch(p)).json()));
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
  const ambient = new THREE.HemisphereLight(0xffffff,facadeStudy?0xc5bbb0:0xbac4a6,1.5); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffefd3,2.5); sun.position.set(-18,35,22);
  sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:100});
  sun.shadow.bias=-.0006; sun.shadow.normalBias=.035; scene.add(sun);
  scene.add(sun.target);
  buildModel('original',original);buildModel('proposed',proposal);finalizeBatches();
  const focusMaterial=new THREE.MeshBasicMaterial({color:0x72926b,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  highlighted=new THREE.Mesh(new THREE.PlaneGeometry(1,1),focusMaterial);highlighted.rotation.set(-Math.PI/2,0,0,'YXZ');highlighted.visible=false;scene.add(highlighted);
  bindControls();
  $('#cutaway').checked=false;updateView(true);
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
  geometry.rotateX(-Math.PI/2); geometry.translate(-14.8,elev-thickness,8.35);
  const mesh=new THREE.Mesh(geometry,material); mesh.receiveShadow=true;mesh.castShadow=true;parent.add(mesh);
}

function buildModel(design,modelData) {
  data=modelData;currentDesign=design;
  const root=group(scene);roots[design]=root;
  const original=design==='original';
  const thisFloors=[];
  const site=group(root);
  if(facadeStudy&&original&&modelData.context)makeSiteContext(site,modelData.context);
  else block(site,-3,-3,35.6,22.7,.38,-.62,materials.ground);
  const building=facadeStudy&&original?group(root):root,paving=group(building);
  if(facadeStudy&&original)building.rotation.y=siteAngle();
  block(paving,-1.2,-1.9,32,20.2,.12,-.22,materials.paving);
  footprint(data.court,'A',0,paving,-.03,.10,materials.court);
  // Paving joints make the courtyard readable without inventing a surveyed landscape.
  for(let y=-1.2;y<17.6;y+=1.5) block(paving,12.4,y,4.8,.016,.015,-.025,materials.wallCap);
  for(let x=12.4;x<=17.2;x+=1.2) block(paving,x,-1.2,.016,18.8,.015,-.025,materials.wallCap);
  if(facadeStudy&&original) {
    for(let x=-1.2;x<30.8;x+=1.2)block(paving,x,-1.9,.014,3.2,.008,-.215,materials.joint);
    for(let y=-1.9;y<1.3;y+=1.2)block(paving,-1.2,y,32,.014,.008,-.215,materials.joint);
    makeCourtyardTree(paving);
  }
  for(let level=1;level<=3;level++) {
    const f=group(building);f.position.y=base[level-1];floors.push({g:f,level,design});thisFloors.push(f);
    for(const home of ['A','B']) {
      const g=group(f);homes.push({g,home,level});
      const outline=original&&level===1?data.outline.map(([x,y])=>[x===10.2&&[6.7,11.1].includes(y)?9.4:x,y]):data.outline;
      footprint(level===3?data.upper:outline,home,level,g,0,.18,materials.slab,level>1);
      const full=group(g),low=group(g);wallSets.push({full,low});
      for(const wall of data.walls.filter(w=>w.level===level&&w.home===home)) {
        makeWall(wall,full,heights[level-1],false);makeWall(wall,low,1.08,true);
      }
      for(const room of data.rooms.filter(r=>r.level===level&&r.home===home)) makeRoom({...room,design},g);
      for(const bed of data.beds.filter(b=>b.level===level&&b.home===home)) original?makeOriginalBed(g,bed):makeBed(g,bed);
      const mx=(x,w=0)=>mirror(home,x,w);
      if(original) {
        makeOriginalFixtures(g,home,level);
        if(facadeStudy) {
          block(g,mx(-.14,.09),11.05,.09,.09,heights[level-1],0,materials.windowFrame);
          if(level===1) {
            makeFacadeDoor(g,home,8.4,1.5,2.1,2.35,false);
            makeFacadeDoor(g,home,12.3,3.1,1.1,2.3,true,true);
            makeLabel({id:home+'-courtyard-door',name:(home==='A'?'甲':'乙')+'户天井门（窗改门）',home,level,rect:[mx(11.8,.6),3.1,.6,1.1],kind:'terrace',description:'一层公共起居厅原天井侧窗改玻璃门，保留固定侧窗，每户独立进入天井。前方围挡移除，门槛、开启方向和排水须深化。'},g);
            makePlanter(g,home,8.0,.5,.75);
          }
          if(level===2)makePlanter(g,home,7.95,.65,.7);
          if(level===2) {
            makeFacadeDoor(g,home,8.4,1.5,2.1,2.4,true);
            makeLabel({id:home+'-balcony-door',name:(home==='A'?'甲':'乙')+'户阳台门（窗改门）',home,level,rect:[mx(8.4,2.1),.7,2.1,.6],kind:'terrace',description:'二层公共起居厅原正面窗改为玻璃推拉门，直接进入本户阳台；保留原窗洞宽度，降低窗台。门净宽、轨道和门槛防水须深化。'},g);
          }
        }
        if(facadeStudy&&level===3) {
          makeFacadeDoor(g,home,7.75,8.5,1.1,2.3,true);
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
      if(level<3)makeStairs(g,home,heights[level-1]);
      if(level<3) {
        // The front entrance canopy/balcony is open, with supports only.
        if(!facadeStudy||level===1)for(const x of [7.5,12.3])block(g,mx(x-.15,.3),-.15,.3,.3,heights[level-1],0,materials.wall);
        if(level===2) {
          rail(g,mx(7.5),0,mx(12.3),0,1.15);
          for(const x of [7.5,12.3])rail(g,mx(x),0,mx(x),1.5,1.15);
        }
      }
      if(level===3) {
        footprint(data.terrace,home,level,g,.01,.20,materials.paving);
        const terrace=data.terrace;
        for(let i=0;i<terrace.length;i++) {
          const a=terrace[i],b=terrace[(i+1)%terrace.length];
          if(a[1]===8.5&&b[1]===8.5)continue;
          rail(g,mx(a[0]),a[1],mx(b[0]),b[1],1.2);
        }
        // Quiet outdoor tea setting; the rooftop remains open to the sky.
        if(!original)roundTable(g,mx(6.3),5.2,.95,3);
        const roof=group(g);roofGroups.push(roof);
        footprint(data.upper,home,level,roof,3.08,.18,materials.roof);
        if(facadeStudy&&original)makeFacadeRoof(roof,home);
        makeLabel({id:home+'-terrace',name:(home==='A'?'甲':'乙')+(original&&!facadeStudy?' · 拟用露台':'户露台'),home,level,rect:[mx(4.8,3),4.5,3,2],kind:'terrace',description:original&&!facadeStudy?'原图三层空白区按拟用露台示意；准确范围、围护及是否连通仍待确认。':'三层前部为露天屋面露台。防水、排水、保温及栏杆需与建筑施工图同步深化。'},g);
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
    for(let i=0;i<3;i++)block(link,7.5,-.35*(i+1),14.6,.35,.12,-.12*(i+1),materials.slab);
  }
  makeLabel({id:'court',name:'露天天井',level:1,home:'both',rect:[12.4,6.8,4.8,3],kind:'court',description:original?'依据已确认用途保持露天，未增设建议方案的后部雨棚连接。':'中间天井保持露天，不作为雨天年夜饭场地。两户后走廊之间拟设小面积轻雨棚连接，需核对许可与排水。'},thisFloors[0]);
}

function makeWall(w,parent,height,cut) {
  const [x1,y1,x2,y2]=w.points, horizontal=Math.abs(y2-y1)<.001;
  const length=Math.hypot(x2-x1,y2-y1),width=w.width;
  const x=Math.min(x1,x2)-(horizontal?0:width/2),y=Math.min(y1,y2)-(horizontal?width/2:0);
  const dx=horizontal?length:width,dy=horizontal?width:length;
  function part(bottom,top,material=materials.wall,thickness=1) {
    top=Math.min(top,height);if(top-bottom<.015)return;
    block(parent,x+(horizontal?0:width*(1-thickness)/2),y+(horizontal?width*(1-thickness)/2:0),
      horizontal?dx:dx*thickness,horizontal?dy*thickness:dy,top-bottom,bottom,material);
  }
  if(w.kind==='wall') {
    part(0,height);
    if(facadeStudy&&w.level===1&&width>.19)part(0,.55,materials.plinth,1.04);
    if(cut)part(height-.025,height,materials.wallCap);return;
  }
  if(w.kind==='window') {
    const sill=w.sill??((Math.abs(y1-15.3)<.01&&horizontal)?1.75:.85),head=w.head??2.45;
    part(0,sill);part(head,heights[w.level-1]);part(sill,head,w.frost?materials.frost:materials.glass,.28);
    part(sill,sill+.045,materials.windowFrame,1.12);part(head-.05,head,materials.windowFrame,1.12);
    if(facadeStudy) {
      if(w.level===1&&width>.19)part(0,.55,materials.plinth,1.04);
      const jambHeight=Math.min(head,height)-sill;
      if(jambHeight>.015)for(const end of [0,length-.05])block(parent,x+(horizontal?end:0),y+(horizontal?0:end),horizontal?.05:dx,horizontal?dy:.05,jambHeight,sill,materials.windowFrame);
    }
    if(!cut&&length>1.7)block(parent,(x1+x2)/2-.025,(y1+y2)/2-.025,.05,.05,w.head===undefined&&w.sill===undefined?1.55:head-sill,sill,materials.windowFrame);
  } else {
    part(w.head??2.35,heights[w.level-1]);
    // Recessed threshold marks openings while keeping circulation visible.
    if(w.kind!=='opening')block(parent,x,y,dx,dy,.015,.01,materials.lightWood);
    if(facadeStudy&&w.kind==='door'&&(!w.study||['门4','门5','门6'].includes(w.study))&&!(w.level===1&&horizontal&&y1===1.5)) {
      part(.025,Math.min(w.head??2.35,height)-.04,materials.wood,.32);
      const frameHeight=Math.min(w.head??2.35,height);
      for(const end of [0,length-.045])block(parent,x+(horizontal?end:0),y+(horizontal?0:end),horizontal?.045:dx,horizontal?dy:.045,frameHeight,0,materials.windowFrame);
      if(!cut)part(frameHeight-.045,frameHeight,materials.windowFrame);
    }
    if(!cut&&w.kind==='slider')part(0,2.35,materials.glass,.12);
  }
}

function makeFacadeDoor(parent,home,x,y,w,h,glazed,side=false) {
  function part(along,depth,width,thickness,height,elev,material) {
    if(side)block(parent,mirror(home,x+depth,thickness),y+along,thickness,width,height,elev,material);
    else block(parent,mirror(home,x+along,width),y+depth,width,thickness,height,elev,material);
  }
  for(const a of [0,w-.055])part(a,-.03,.055,.06,h,0,materials.windowFrame);
  part(0,-.03,w,.06,.055,h-.055,materials.windowFrame);
  part(.055,-.015,w-.11,.03,h-.11,.055,glazed?materials.glass:materials.wood);
  if(glazed&&w>1.5)part(w/2-.035,-.045,.07,.09,h-.11,.055,materials.windowFrame);
  if(!glazed)for(let a=.14;a<w-.1;a+=.16)part(a,-.034,.008,.008,h-.14,.07,materials.woodLine);
  part(glazed&&w>1.5?w/2-.16:w-.18,-.065,.025,.055,.25,.95,materials.metal);
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

function makeRoom(room,parent) {
  if(room.kind==='stairs') {makeLabel(room,parent);return;}
  if(facadeStudy&&room.design==='original'&&room.kind==='bath')room={...room,description:(room.access==='public'?'从公共走廊进入；':'从相邻卧室进入；')+'设淋浴区、坐便器和洗手盆。洁具尺寸、门扇开启、排水与防水仍须深化。'};
  const [x,y,w,d]=room.rect;
  const material=new THREE.MeshStandardMaterial({color:colors[room.kind]||0xdedccc,roughness:1});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w-.23,d-.23),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(worldPoint(x+w/2,y+d/2,.008));
  mesh.receiveShadow=true;mesh.userData.room=room;parent.add(mesh);roomMeshes.push(mesh);
  makeLabel(room,parent);
}
function makeLabel(room,parent) {
  room={...room,design:currentDesign};
  const el=document.createElement('button');el.className='room-label '+(room.kind==='elder'?'elder ':'')+(['service','stairs'].includes(room.kind)?'small':'');
  el.dataset.kind=room.kind;
  el.textContent=room.name;el.setAttribute('aria-label',room.name+'，查看说明');
  el.addEventListener('click',e=>{if(e.detail===0)selectRoom(room);});$('#labels').append(el);
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
  const {x,y,w,d,head}=bed;
  block(parent,x,y,w,d,.22,.08,materials.wood);
  block(parent,x+.025,y+.025,w-.05,d-.05,.22,.30,materials.white);
  block(parent,head==='east'?x+.025:x+.55,y+.025,w-.58,d-.05,.035,.52,materials.blanket);
  block(parent,head==='east'?x+w-.08:x,y,.08,d,.88,0,materials.lightWood);
  for(const yy of [y+.1,y+d/2+.04])block(parent,head==='east'?x+w-.47:x+.12,yy,.31,d/2-.16,.09,.52,materials.pillow);
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
    roundTable(parent,mx(12),14.55,1.8,12);
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
    sideSofa(3.65,3.0,3.0,true);
    block(parent,mx(5.2,1.1),4.0,1.1,.7,.35,0,materials.lightWood);
    block(parent,mx(7.365,.06),3.2,.06,1.6,.9,1.05,materials.dark);
    block(parent,mx(6.98,.38),3.15,.38,1.7,.38,0,materials.lightWood);
    block(parent,mx(10.9,1.2),1.65,1.2,.35,.9,0,materials.lightWood);
    block(parent,mx(10.25,1.3),5.0,1.3,.65,.72,0,materials.lightWood);
    for(const x of [10.55,11.25]) {
      chair(parent,mx(x),4.6,0,0);chair(parent,mx(x),6.05,Math.PI,0);
    }
  }
  if(level===2) {
    sideSofa(10.9,3.25,2.5,false);
    block(parent,mx(9.2,.8),4.0,.8,1.2,.35,0,materials.lightWood);
    block(parent,mx(7.575,.06),3.2,.06,1.6,.9,1.05,materials.dark);
    block(parent,mx(7.63,.36),3.15,.36,1.7,.38,0,materials.lightWood);
  }
  if(level===3&&home==='B') {
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
  } else if(room.access==='public') {
    makeShower(parent,mx(.12,w-.24),y+1.38,w-.24,.90,'front',room.home==='A');
    makeToilet(parent,mx(.08,.68),y+.10,room.home==='A'?'right':'left');
    makeBasin(parent,mx(.10,.40),y+.68,.40,.60,room.home==='A'?'right':'left');
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
  const flight=10,run=.29;
  for(let i=0;i<flight;i++) {
    const a=(i+1)*rise/20,b=rise/2+(i+1)*rise/20;
    block(parent,mx(7.3-(i+1)*run,run),8.65,run,1.02,.15,a-.15,materials.slab);
    block(parent,mx(4.4+i*run,run),9.98,run,1.02,.15,b-.15,materials.slab);
  }
  block(parent,mx(3.45,.95),8.65,.95,2.35,.15,rise/2-.15,materials.slab);
  // A simple continuous inner guard indicates the stair direction in the concept model.
  for(let i=0;i<10;i++) {
    const xx=mx(4.4+i*.29);
    block(parent,xx-.02,9.88,.04,.04,.85,rise/2+(i+1)*rise/20,materials.metal);
  }
}
function rail(parent,x1,y1,x2,y2,h) {
  if(facadeStudy)h=1.2;
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<.02)return;
  const angle=Math.atan2(dy,dx),cx=(x1+x2)/2,cy=(y1+y2)/2;
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
    block(parent,Math.min(x1,x2)-(horizontal?0:.11),Math.min(y1,y2)-(horizontal?.11:0),horizontal?len:.22,horizontal?.22:len,.10,0,materials.slab);
    block(parent,Math.min(x1,x2)-(horizontal?0:.12),Math.min(y1,y2)-(horizontal?.12:0),horizontal?len:.24,horizontal?.24:len,.18,-.18,materials.wall);
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
  if(!['stairs','court','terrace'].includes(room.kind)) {
    const meta=document.createElement('span');meta.className='room-meta';
    meta.textContent=room.rect[2].toFixed(1)+' × '+room.rect[3].toFixed(1)+'米（轴线示意）';detail.append(meta);
  }
  labels.forEach(l=>l.el.classList.toggle('selected',l.room.id===room.id));
  if(!['stairs','court','terrace'].includes(room.kind)) {
    const [x,y,w,d]=room.rect;highlighted.position.copy(worldPoint(x+w/2,y+d/2,base[room.level-1]+offsetFor(room.level)+.025));
    highlighted.position.applyAxisAngle(new THREE.Vector3(0,1,0),siteAngle());highlighted.rotation.y=siteAngle();
    highlighted.scale.set(w-.19,d-.19,1);highlighted.visible=true;
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
  roofGroups.forEach(g=>{g.visible=state.floor==='all'&&$('#show-roof').checked;});
  dailyFurniture.visible=state.scene==='daily';festivalFurniture.visible=state.scene==='festival';
  $('#roof-option').style.display=state.floor==='all'?'flex':'none';
  $$('[data-floor]').forEach(b=>{b.classList.toggle('active',b.dataset.floor===state.floor);b.setAttribute('aria-pressed',b.dataset.floor===state.floor);});
  $$('[data-home]').forEach(b=>{b.classList.toggle('active',b.dataset.home===state.home);b.setAttribute('aria-pressed',b.dataset.home===state.home);});
  $$('[data-scene]').forEach(b=>{b.classList.toggle('active',b.dataset.scene===state.scene);b.setAttribute('aria-pressed',b.dataset.scene===state.scene);});
  $('#view-title').textContent=(facadeStudy?'外观草案 · ':state.design==='original'?'原设计 · ':'建议 · ')+(state.floor==='all'?'整体':state.floor==='explode'?'分层':floorNames[Number(state.floor)-1])+(state.home==='both'?'':state.home==='A'?' / 甲户':' / 乙户');
  $$('[data-design]').forEach(b=>{b.classList.toggle('active',b.dataset.design===state.design);b.setAttribute('aria-pressed',b.dataset.design===state.design);});
  $('#scene-controls').hidden=state.design==='original';
  const counted=roomMeshes.map(m=>m.userData.room).filter(r=>r.design===state.design&&(state.home==='both'||r.home===state.home));
  $('#bedroom-stat').textContent=counted.filter(r=>['elder','bedroom'].includes(r.kind)).length;
  $('#bath-stat').textContent=counted.filter(r=>r.kind==='bath').length;
  $('#kitchen-stat').textContent=counted.filter(r=>r.kind==='kitchen').length;
  $('#dining-stat').textContent=counted.filter(r=>r.kind==='dining').length;
  $('#stats-label').textContent=state.home==='both'?'全屋统计':state.home==='A'?'甲户统计':'乙户统计';
  $('#model-note').textContent=facadeStudy?'入户约南偏东12°。周边以56.50米量线校准；路宽、界址、高程及邻房高度待测。门前衔接与光影为示意。':state.design==='original'?'按原平面重建；层高、立面及露台边界为示意。':'概念方案，非施工图。每户一层、三层各1间洗衣房。';
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
  const cx=state.home==='both'?0:state.home==='A'?-7.5:7.5;
  const zoom=state.home==='both'?1:.78;
  const distance=40*Math.max(1,(matchMedia('(max-width:740px)').matches?1.35:1.2)/width)*zoom;
  controls.target.set(cx,y,-.2);
  if(preset==='top')camera.position.set(cx,y+distance,0.2);
  else if(preset==='entry')camera.position.set(cx+distance*.30,y+distance*.31,distance*.86);
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

function bindControls() {
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
    if(state.scene==='festival') {state.floor='1';state.home='both';}
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
    if(candidate.room){selectRoom(candidate.room);return;}
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const visible=roomMeshes.filter(m=>m.userData.room.design===state.design&&m.parent.visible&&m.parent.parent.visible);
    const hit=raycaster.intersectObjects(visible,false)[0];if(hit)selectRoom(hit.object.userData.room);
  },true);
  const cancel=e=>{active.delete(e.pointerId);tap=null;};
  surface.addEventListener('pointercancel',cancel,true);
  surface.addEventListener('lostpointercapture',cancel,true);
}
let toastTimer;
function toast(text) {$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
async function share() {
  const url=new URL(location.href);url.search='';url.searchParams.set('design',state.design);url.searchParams.set('floor',state.floor);url.searchParams.set('scene',state.scene);url.searchParams.set('home',state.home);
  if(facadeStudy){url.searchParams.set('facade','1');url.searchParams.set('v','site-3');}
  if(state.camera==='site')url.searchParams.set('view','site');
  try {
    if(navigator.share)await navigator.share({title:facadeStudy?'原图外观草案 · 祁东双户住宅':'祁东双户合院 · 一起看家',text:state.camera==='site'?'看看新宅与周边道路、田地和水塘的关系。':facadeStudy?'看看新增采光窗与三层露台门。':'转一转模型，看看长辈房和20人团圆宴的布置。',url:url.href});
    else {await navigator.clipboard.writeText(url.href);toast('分享链接已复制，可以发给家人了');}
  }catch(e){if(e.name!=='AbortError')toast('请复制浏览器地址栏中的链接分享');}
}
function resize() {
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  const ratio=Math.min(Math.max(devicePixelRatio,2),3,Math.sqrt(4_000_000/(w*h)));
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestFrame();
}
function render() {
  nextFrame=false;controls.update();scene.updateMatrixWorld();
  renderer.render(scene,camera);
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
