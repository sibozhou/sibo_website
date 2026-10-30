import * as THREE from 'three';

const boxGeometry=new THREE.BoxGeometry(1,1,1);
const pickMaterial=new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide});

// Local x follows the wall; local z points to its right in plan.
export function createOpening(parent,wall,limit,normal,materials,solid) {
  const [a,b,c,d]=wall.points,horizontal=Math.abs(b-d)<.001;
  const length=Math.hypot(c-a,d-b),isWindow=wall.kind==='window';
  const bottom=isWindow?(wall.sill??.85):0,head=wall.head??(isWindow?2.45:2.35);
  const height=Math.min(head,limit)-bottom;if(height<=.015)return null;
  const root=new THREE.Group();parent.add(root);
  root.position.set(Math.min(a,c)-14.8,bottom,8.35-Math.min(b,d));
  root.rotation.y=horizontal?0:Math.PI/2;
  const inward=Math.sign(horizontal?-normal[1]:normal[0])||1;
  const moves=[];
  function box(g,x,y,z,w,h,t,material) {
    if(w<=0||h<=0)return;
    solid(g,boxGeometry,material,[x+w/2,y+h/2,z+t/2],[w,h,t]);
  }
  function panel(g,x,w,h,glazed,handle) {
    if(glazed) {
      const profile=wall.balconyPortal?.025:.035;
      box(g,x+profile,profile,-.014,w-2*profile,h-2*profile,.028,wall.frost?materials.frost:materials.glass);
      for(const xx of [x,x+w-profile])box(g,xx,0,-.025,profile,h,.05,materials.windowFrame);
      for(const yy of [0,h-profile])box(g,x,yy,-.025,w,profile,.05,materials.windowFrame);
    } else {
      const finish={entry:materials.entryDoor,interior:materials.interiorDoor,bath:materials.bathDoor,service:materials.serviceDoor}[wall.doorFinish]||materials.wood;
      if(wall.vented) {
        const split=h*.60;
        box(g,x,0,-.02,w,split,.04,finish);
        for(const xx of [x,x+w-.05])box(g,xx,split,-.02,.05,h-split,.04,finish);
        box(g,x,h-.05,-.02,w,.05,.04,finish);
        for(let yy=split;yy<h-.05;yy+=.075)box(g,x+.05,yy,-.02,w-.10,.035,.04,finish);
      } else box(g,x,0,-.02,w,h,.04,finish);
      if(wall.level===1&&horizontal&&Math.abs(b-1.5)<.001)for(let xx=x+.10;xx<x+w-.08;xx+=.16)box(g,xx,.06,-inward*.022-.004,.008,h-.12,.008,materials.doorGroove||materials.woodLine);
    }
    if(handle) {
      const handleX=handle==='bottom'?x+w/2:handle==='start'?x+.12:x+w-.12;
      const handleY=handle==='bottom'?.10:Math.min(isWindow&&wall.handleHeight!==undefined?wall.handleHeight-bottom-.025-.035/2:.95,h-.08);
      for(const side of isWindow?[inward]:[-1,1]) {
        if(wall.study==='门7')box(g,handleX-.03,Math.min(.88,h-.18),side*.022-.004,.06,.16,.008,materials.metal);
        else box(g,handleX-.06,handleY,side*.04-.025,.12,.035,.05,materials.metal);
      }
    }
  }
  const frame=wall.pictureWindow?.03:wall.balconyPortal?.035:.045;
  for(const x of [0,length-frame])box(root,x,0,-wall.width/2,frame,height,wall.width,materials.windowFrame);
  if(limit>=head)box(root,0,height-frame,-wall.width/2,length,frame,wall.width,materials.windowFrame);
  if(isWindow)box(root,0,0,-wall.width/2,length,wall.pictureWindow?frame:.045,wall.width,materials.windowFrame);
  if(isWindow&&wall.pictureWindow) {
    box(root,frame,frame,-.014,length-2*frame,height-2*frame,.028,materials.glass);
  } else if(isWindow&&wall.operation==='awning') {
    const sash=new THREE.Group();root.add(sash);sash.position.set(.025,height-.025,0);
    const leaf=new THREE.Group();sash.add(leaf);leaf.position.y=-(height-.05);
    panel(leaf,0,length-.05,height-.05,true,wall.highLevelControl?null:'bottom');
    if(wall.highLevelControl){
      const control=(wall.controlHeight??1.45)-bottom,z=inward*(wall.width/2+.055);
      box(root,length-.14,control,z-.012,.018,-control,.024,materials.metal);
      box(root,length-.18,control-.04,z-.025,.10,.08,.05,materials.windowFrame);
      box(root,length-.16,control-.005,z,.09,.018,.035,materials.metal);
    }
    moves.push(t=>{sash.rotation.x=inward*t*Math.PI/6;});
  } else if(isWindow&&wall.operation==='bifold') {
    const span=(length-.12)/4;
    for(const start of [true,false]) {
      const outer=new THREE.Group();root.add(outer);outer.position.set(start?.045:length-.045,.025,0);
      panel(outer,start?0:-span,span,height-.065,true,null);
      const inner=new THREE.Group();outer.add(inner);inner.position.x=(start?1:-1)*(span+.01);
      panel(inner,start?0:-span,span,height-.065,true,start?'end':'start');
      moves.push(t=>{outer.rotation.y=(start?1:-1)*inward*t*(wall.openingAngle??85)*Math.PI/180;inner.rotation.y=-2*outer.rotation.y;});
    }
  } else if(isWindow&&wall.operation==='fixed-two-casements') {
    const width=wall.openingLeaf;
    box(root,width+.025,.025,-.014,length-2*width-.05,height-.05,.028,materials.glass);
    for(const start of [true,false]) {
      const split=start?width:length-width;
      box(root,split-.02,0,-.035,.04,height,.07,materials.windowFrame);
      const sash=new THREE.Group();root.add(sash);sash.position.set(start?.025:length-.025,.025,0);
      panel(sash,start?0:-(width-.05),width-.05,height-.05,true,start?'end':'start');
      moves.push(t=>{sash.rotation.y=(start?1:-1)*inward*t*Math.PI/2;});
    }
  } else if(isWindow&&wall.operation==='fixed-casement') {
    const width=wall.openingLeaf,start=wall.openingSide!=='end',split=start?width:length-width;
    const fixedStart=start?width:0,fixedWidth=length-width;
    box(root,fixedStart+.025,.025,-.014,fixedWidth-.05,height-.05,.028,materials.glass);
    box(root,split-.02,0,-.035,.04,height,.07,materials.windowFrame);
    const sash=new THREE.Group();root.add(sash);sash.position.set(start?.025:length-.025,.025,0);
    panel(sash,start?0:-(width-.05),width-.05,height-.05,true,start?'end':'start');
    moves.push(t=>{sash.rotation.y=(start?1:-1)*inward*t*Math.PI/2;});
  } else if(isWindow&&!wall.operation?.startsWith('casement')) {
    const width=wall.singleSash?length:(wall.openingLeaf??.45);
    const start=wall.openingSide==='end'?length-width:0;
    if(width<length-.01) {
      const fixedStart=start===0?width:0,fixedWidth=length-width;
      box(root,fixedStart+.025,.025,-.014,fixedWidth-.05,height-.05,.028,wall.frost?materials.frost:materials.glass);
      box(root,start===0?width-.02:start-.02,0,-.035,.04,height,.07,materials.windowFrame);
    }
    const sash=new THREE.Group();root.add(sash);sash.position.set(start+.025,.025,0);
    panel(sash,0,width-.05,height-.05,true,wall.operation==='fixed'?null:'end');
    if(wall.operation!=='fixed')moves.push(t=>{sash.rotation.x=inward*t*Math.PI/15;});
  } else if(wall.study==='门7') {
    // Surface sliding private doors keep the bedroom entrance and desk aisle clear.
    const leaf=new THREE.Group();root.add(leaf);leaf.position.set(-.02,.025,inward*(wall.width/2+.035));
    panel(leaf,0,length+.04,height-.065,false,'start');
    moves.push(t=>{leaf.position.x=-.02+t*(length+.04);});
    if(limit>=head)box(root,-.05,height+.025,inward*(wall.width/2+.035)-.025,length*2+.10,.055,.05,materials.metal);
  } else if(wall.operation==='slide') {
    const half=length/2,fixedAtStart=wall.fixedSide!=='end';
    const fixed=new THREE.Group();root.add(fixed);fixed.position.set(fixedAtStart?.035:half+.01,.025,-.035);
    panel(fixed,0,half-.045,height-.065,true,null);
    const leaf=new THREE.Group();root.add(leaf);const closed=fixedAtStart?half+.01:.035;leaf.position.set(closed,.025,.035);
    panel(leaf,0,half-.045,height-.065,true,fixedAtStart?'start':'end');
    moves.push(t=>{leaf.position.x=closed+(fixedAtStart?-1:1)*t*(half-.08);});
    if(wall.balconyPortal)box(root,0,.008,-.07,length,.012,.14,materials.windowFrame);
  } else {
    const glazed=isWindow||wall.glazed||wall.study==='门1';
    const hingeAtStart=(horizontal?c<a:d<b);
    const leaves=isWindow?wall.operation==='casement'?2:1:wall.leaves??(length>1.6?2:1);
    for(let i=0;i<leaves;i++) {
      const start=leaves===2?i===0:hingeAtStart,span=length/leaves-(leaves===2?.045:.09);
      const leaf=new THREE.Group();root.add(leaf);leaf.position.set(start?.045:length-.045,.025,0);
      panel(leaf,start?0:-span,span,height-.065,glazed,start?'end':'start');
      moves.push(t=>{leaf.rotation.y=(start?-1:1)*inward*(wall.operation?.startsWith('casement')||wall.opensTo==='outside'?-1:1)*t*Math.PI/2;});
    }
  }
  const target=new THREE.Mesh(new THREE.PlaneGeometry(length,height),pickMaterial);
  target.position.set(length/2,height/2,0);root.add(target);
  return {root,setOpen:t=>moves.forEach(move=>move(t))};
}
