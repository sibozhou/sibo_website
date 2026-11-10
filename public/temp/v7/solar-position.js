// NOAA general solar-position equations; east-positive longitude, local civil time.
export function seasonDay(value) {
  const anchors=[79,172,266,355,444],v=Math.max(0,Math.min(4,value)),i=Math.min(3,Math.floor(v));
  return ((anchors[i]+(anchors[i+1]-anchors[i])*(v-i)-1)%365+365)%365+1;
}
export function seasonDate(value) {
  const date=new Date(Date.UTC(2026,0,1)+(seasonDay(value)-1)*86400000);
  return `${date.getUTCMonth()+1}月${date.getUTCDate()}日`;
}
export function solarPosition({latitude,longitude,timezone=8,dayOfYear,hour}) {
  const g=2*Math.PI/365*(dayOfYear-1+(hour-12)/24);
  const equation=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const h=(hour*60+equation+4*longitude-60*timezone)/4*Math.PI/180-Math.PI,lat=latitude*Math.PI/180;
  const east=-Math.cos(decl)*Math.sin(h),north=Math.cos(lat)*Math.sin(decl)-Math.sin(lat)*Math.cos(decl)*Math.cos(h),up=Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(h);
  return {east,north,up,altitude:Math.asin(Math.max(-1,Math.min(1,up)))*180/Math.PI,azimuth:((Math.atan2(east,north)*180/Math.PI)%360+360)%360};
}
