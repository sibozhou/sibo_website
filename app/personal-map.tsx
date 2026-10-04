"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Language } from "./languages";
import { projectOverviewLocation, projectDetailLocation, detailFromOverview, detailWorldWidth, nearestWorldX, mapWorldOffsets } from "./map/projection";
import { MapDetails } from "./map/map-details";
import geography from "./map/overview.json";
import { loadMapAsset } from "./map/load-asset";
import { animateOverviewZoom } from "./map/zoom-transition";

const places = [
  { id: "haikou", country: "CHN", division: "CN-HI", longitude: 110.289, latitude: 20.0025, offset: [12, -26], city: ["Haikou", "海口", "海口"], region: ["Hainan, China", "中国 · 海南省", "中國 · 海南省"], chapter: ["home", "家乡", "家鄉"] },
  { id: "elmhurst", country: "USA", division: "US-IL", longitude: -87.942, latitude: 41.8953, offset: [0, -26], city: ["Elmhurst", "埃尔姆赫斯特", "埃爾姆赫斯特"], region: ["Illinois, USA", "美国 · 伊利诺伊州", "美國 · 伊利諾州"], chapter: ["high school", "高中", "高中"] },
  { id: "los-angeles", country: "USA", division: "US-CA", longitude: -118.2859, latitude: 34.0219, offset: [-34, 28], city: ["Los Angeles", "洛杉矶", "洛杉磯"], region: ["California, USA", "美国 · 加利福尼亚州", "美國 · 加州"], chapter: ["undergraduate", "本科", "大學"] },
  { id: "providence", country: "USA", division: "US-RI", longitude: -71.4038, latitude: 41.8261, offset: [32, 24], city: ["Providence", "普罗维登斯", "普羅維登斯"], region: ["Rhode Island, USA", "美国 · 罗得岛州", "美國 · 羅德島州"], chapter: ["master’s", "硕士", "碩士"] },
  { id: "berkeley", country: "USA", division: "US-CA", longitude: -122.2578, latitude: 37.8721, offset: [-32, -22], city: ["Berkeley", "伯克利", "柏克萊"], region: ["California, USA", "美国 · 加利福尼亚州", "美國 · 加州"], chapter: ["current work", "现在的工作", "現在的工作"] },
] as const;

const copy = {
  en: { places: "Places along the way", map: "Interactive world map", world: "world view", zoomIn: "Zoom in", zoomOut: "Zoom out", country: "country", region: { CHN: "province", USA: "state" }, city: "city", scales: "Boundary views" },
  zh: { places: "走过的地方", map: "互动世界地图", world: "世界全景", zoomIn: "放大", zoomOut: "缩小", country: "国家", region: { CHN: "省", USA: "州" }, city: "城市", scales: "边界视图" },
  "zh-hant": { places: "走過的地方", map: "互動世界地圖", world: "世界全景", zoomIn: "放大", zoomOut: "縮小", country: "國家", region: { CHN: "省", USA: "州" }, city: "城市", scales: "邊界檢視" },
};

const worldView = { x: 500, y: 270, zoom: 1, detail: false };
type BoundaryView = "country" | "region" | "city";
const fitBoundary = ([left, top, right, bottom]: number[], width = 1000) => ({
  x: (left + right) / 2,
  y: (top + bottom) / 2,
  zoom: Math.min(width * .8 / (right - left), 400 / (bottom - top)),
  detail: true,
});
const zoomAt = (view: typeof worldView, amount: number, maxZoom: number, anchor = { x: 500, y: 270 }, minZoom = 1) => {
  const level = Math.min(maxZoom, Math.max(minZoom, view.zoom * amount));
  if (level === minZoom && amount < 1) return worldView;
  const point = { x: view.x + (anchor.x - 500) / view.zoom, y: view.y + (anchor.y - 270) / view.zoom };
  const detail = view.detail ? point : detailFromOverview(point);
  return { x: nearestWorldX(detail.x - (anchor.x - 500) / level, 500), y: detail.y - (anchor.y - 270) / level, zoom: level, detail: true };
};
const boundaryFor = (index: number, scale: BoundaryView) => {
  const place = places[index];
  return scale === "country" ? geography.closeupBounds.countries[place.country] : scale === "region" ? geography.closeupBounds.regions[place.division] : geography.closeupBounds.cities[place.id];
};

export function PersonalMap({ language }: { language: Language }) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState(worldView);
  const [scale, setScale] = useState<BoundaryView | null>(null);
  const [interaction, setInteraction] = useState<"preset" | "direct" | "dragging">("preset");
  const [closeup, setCloseup] = useState<Omit<typeof geography.preview, "tropics"> | null>(null);
  const [extent, setExtent] = useState({ left: 0, right: 1000, overviewZoom: 1, measured: false });
  const stage = useRef<HTMLDivElement>(null);
  const placesList = useRef<HTMLOListElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  const drag = useRef(new Map<number, { x: number; y: number }>());
  const projectionZoom = useRef<(() => void) | null>(null);
  const text = copy[language];
  const translation = language === "en" ? 0 : language === "zh" ? 1 : 2;
  const place = places[selected];
  const data = view.detail ? closeup ?? geography.preview : geography;
  const project = view.detail ? projectDetailLocation : projectOverviewLocation;
  const country = data.countries[place.country];
  const region = data.regions[place.division];
  const city = data.cities[place.id];
  const maxZoom = Math.max(2400, fitBoundary(geography.closeupBounds.cities[place.id]).zoom * 2);
  const atWorld = !view.detail && view.zoom === 1 && view.x === 500 && view.y === 270;
  const overviewFrame = (current: typeof worldView) => current.detail ? current : { ...current, zoom: current.zoom * extent.overviewZoom };
  const frame = { ...overviewFrame(view), left: extent.left, right: extent.right };
  const tropics = view.detail ? geography.preview.tropics : geography.tropics;
  // Screen-sized coordinates sit at the edges, never scale up over the places.
  const coordinates = view.detail && view.zoom > extent.overviewZoom ? [
    ...[-180, -120, -60, 0, 60, 120].flatMap(longitude => {
      const point = projectDetailLocation(longitude, 0);
      return mapWorldOffsets(view).map(copy => {
        const x = (point.x + copy - frame.x) * frame.zoom + 500;
        return { axis: "longitude", value: longitude, x, y: 522, copy, anchor: x < extent.left + 60 ? "start" : x > extent.right - 60 ? "end" : "center" };
      });
    }),
    ...[-60, -30, -23.5, 0, 23.5, 30, 60].map(latitude => {
      const point = projectDetailLocation(0, latitude);
      return { axis: "latitude", value: latitude, x: extent.left + 18, y: (point.y - frame.y) * frame.zoom + 270, copy: 0, anchor: "start" };
    }),
  ].filter(point => point.x > extent.left && point.x < extent.right && point.y > 0 && point.y < 540)
    .map(point => ({ ...point, x: Math.max(extent.left + 15, Math.min(extent.right - 15, point.x)), y: Math.max(14, Math.min(526, point.y)) })) : [];
  const pins = places.flatMap((item, index) => {
    const point = project(item.longitude, item.latitude);
    const nearestX = ((view.detail ? nearestWorldX(point.x, frame.x) : point.x) - frame.x) * frame.zoom + 500;
    const y = (point.y - frame.y) * frame.zoom + 270;
    const xs = view.detail ? [nearestX, nearestX - detailWorldWidth * frame.zoom, nearestX + detailWorldWidth * frame.zoom].filter((x, copy) => copy === 0 || x >= extent.left && x <= extent.right) : [nearestX];
    return xs.map((x, copy) => ({ item, index, x, y, copy }));
  });
  useEffect(() => {
    const element = canvas.current, surface = drawing.current;
    if (!element || !surface) return;
    let pending = 0;
    const measure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        const width = box.width / (box.height * 1000 / 540) * 1000;
        setExtent({ left: (1000 - width) / 2, right: (1000 + width) / 2, overviewZoom: Math.min(1, width / 1000), measured: true });
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(pending); };
  }, []);
  useEffect(() => {
    if (!view.detail || closeup) return;
    const controller = new AbortController();
    const path = `${language === "en" ? "../" : "../../"}map-geography/${geography.closeupFile}`;
    loadMapAsset<Omit<typeof geography.preview, "tropics">>(path, controller.signal).then(setCloseup).catch(() => {});
    return () => controller.abort();
  }, [language, view.detail, closeup]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      event.preventDefault();
      if (drag.current.size) return;
      const box = drawing.current!.getBoundingClientRect();
      const anchor = { x: (event.clientX - box.left) / box.width * 1000, y: (event.clientY - box.top) / box.height * 540 };
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.height : 1);
      const amount = Math.exp(-Math.max(-240, Math.min(240, pixels)) * (event.ctrlKey ? .02 : .002));
      if (amount < 1) projectionZoom.current?.();
      else if (!projectionZoom.current) projectionZoom.current = animateOverviewZoom(element, drawing.current, event, () => { projectionZoom.current = null; });
      setInteraction("direct");
      setScale(null);
      setView(current => zoomAt(current.detail ? current : { ...current, zoom: current.zoom * extent.overviewZoom }, amount, maxZoom, anchor, extent.overviewZoom));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [maxZoom, extent.overviewZoom]);
  useEffect(() => () => projectionZoom.current?.(), []);
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || drag.current.size >= 2 || (event.target as Element).closest("button")) return;
    projectionZoom.current?.();
    drag.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction("dragging");
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.has(event.pointerId)) return;
    const [a, b = a] = Array.from(drag.current.values());
    drag.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [c, d = c] = Array.from(drag.current.values());
    const box = drawing.current!.getBoundingClientRect();
    const anchor = { x: ((a.x + b.x) / 2 - box.left) / box.width * 1000, y: ((a.y + b.y) / 2 - box.top) / box.height * 540 };
    const dx = (c.x + d.x - a.x - b.x) / 2 / box.width * 1000;
    const dy = (c.y + d.y - a.y - b.y) / 2 / box.height * 540;
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const amount = distance ? Math.hypot(d.x - c.x, d.y - c.y) / distance : 1;
    if (dx === 0 && dy === 0 && amount === 1) return;
    if (amount < 1) projectionZoom.current?.();
    else if (amount > 1 && !projectionZoom.current) projectionZoom.current = animateOverviewZoom(canvas.current, drawing.current, { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }, () => { projectionZoom.current = null; });
    setScale(null);
    // Incremental updates preserve every movement, even before React renders.
    // Zoom around the old midpoint, then carry that location to the new midpoint.
    setView(current => {
      const next = amount === 1 && current.detail ? current : zoomAt(overviewFrame(current), amount, maxZoom, anchor, extent.overviewZoom);
      if (amount !== 1 && !next.detail) return next;
      return { ...next, x: nearestWorldX(next.x - dx / next.zoom, 500), y: next.y - dy / next.zoom };
    });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.delete(event.pointerId)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setInteraction(drag.current.size ? "dragging" : "direct");
  };
  const showBoundary = (index: number, boundary: BoundaryView, scrollToMap = true) => {
    projectionZoom.current?.();
    setInteraction("preset");
    setScale(boundary);
    setView(fitBoundary(boundaryFor(index, boundary), extent.right - extent.left));
    if (scrollToMap && window.matchMedia("(max-width: 700px)").matches && stage.current && stage.current.getBoundingClientRect().top < 64) {
      stage.current.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  };
  const choosePlace = (index: number, fromMap = false) => {
    setSelected(index);
    showBoundary(index, "region", !fromMap);
    if (fromMap && window.matchMedia("(max-width: 700px)").matches) {
      placesList.current?.scrollIntoView({ block: "end", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  };
  const zoom = (amount: number) => {
    if (amount < 1) projectionZoom.current?.();
    else if (!projectionZoom.current) projectionZoom.current = animateOverviewZoom(canvas.current, drawing.current, undefined, () => { projectionZoom.current = null; });
    const target = scale ? { ...view, ...projectDetailLocation(place.longitude, place.latitude) } : view;
    setInteraction("preset");
    setScale(null);
    setView(zoomAt(overviewFrame(target), amount, maxZoom, undefined, extent.overviewZoom));
  };

  return (
    <section className="personal-map" aria-label={text.places}>
      <div className="map-layout">
        <ol className="map-places" ref={placesList}>
          {places.map((item, index) => (
            <li key={item.id}>
              <button type="button" className="map-place" aria-pressed={selected === index} onClick={() => choosePlace(index)}>
                <span className="map-place-number" aria-hidden="true">{index + 1}</span>
                <span><span className="map-place-city">{item.city[translation]}</span><span className="map-place-chapter">{item.chapter[translation]}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="map-viewport">
          <div className="map-stage" ref={stage} role="group" aria-label={text.map}>
            <div className="map-controls">
              <button type="button" className="map-reset" disabled={atWorld} onClick={() => { projectionZoom.current?.(); setInteraction("preset"); setView(worldView); setScale(null); }}>{text.world}</button>
              <button type="button" aria-label={text.zoomOut} disabled={atWorld} onClick={() => zoom(1 / 1.5)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" /></svg></button>
              <button type="button" aria-label={text.zoomIn} disabled={view.zoom === maxZoom} onClick={() => zoom(1.5)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M10 4v12" /></svg></button>
            </div>
            <div className="map-canvas" ref={canvas} data-overview={!view.detail} data-measured={extent.measured} data-direct={interaction !== "preset"} data-dragging={interaction === "dragging"} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
              <div className="map-drawing" ref={drawing}>
              <svg className="map-world" viewBox="0 0 1000 540" aria-hidden="true">
                <defs><g id="map-base-geography">
                  <path className="map-graticule" d={view.detail ? geography.preview.graticule : data.graticule} />
                  <path className="map-land" d={data.land} fillRule="evenodd" />
                  {(["CHN", "USA"] as const).map(id => <path key={id} className="map-land" data-country={id} d={data.countries[id].path} fillRule="evenodd" />)}
                  <path className="map-country" d={country.path} fillRule="evenodd" />
                  <path className="map-divisions" d={country.divisions} fillRule="evenodd" />
                  <path className="map-region" d={region.path} fillRule="evenodd" />
                  <path className="map-lakes" d={data.lakes} fillRule="evenodd" />
                  <path className="map-lakes-detail" d={region.lakes} fillRule="evenodd" />
                  <path className="map-city" d={city.path} fillRule="evenodd" />
                  <path className="map-maritime" d={country.maritime} />
                  {tropics.map(({ latitude, path }) => <path key={latitude} className="map-tropic" data-latitude={latitude} aria-label={latitude > 0 ? ["Tropic of Cancer", "北回归线", "北回歸線"][translation] : ["Tropic of Capricorn", "南回归线", "南回歸線"][translation]} d={path} />)}
                </g></defs>
                <g key={view.detail ? "closeup" : "overview"} className="map-geography" style={{ transform: `translate(${500 - frame.x * frame.zoom}px, ${270 - frame.y * frame.zoom}px) scale(${frame.zoom})` }}>
                  {mapWorldOffsets(view).map(offset => <use key={offset} href="#map-base-geography" x={offset} />)}
                </g>
              </svg>
              <MapDetails language={language} view={frame} locations={places} />
              {coordinates.map(({ axis, value, x, y, copy, anchor }) => <span key={`${axis}-${value}-${copy}`} className="map-coordinate" data-axis={axis} data-value={value} data-anchor={anchor} aria-hidden="true" style={{ left: `${x / 10}%`, top: `${y / 5.4}%` }}>{Math.abs(value)}°{value ? axis === "longitude" ? value > 0 ? "E" : "W" : value > 0 ? "N" : "S" : ""}</span>)}
              {pins.map(({ item, index, x, y, copy }) => {
                const offsetX = x < extent.left + 150 ? Math.abs(item.offset[0]) : x > extent.right - 150 ? -Math.abs(item.offset[0]) : item.offset[0];
                const offsetY = y < 100 ? Math.abs(item.offset[1]) : y > 440 ? -Math.abs(item.offset[1]) : item.offset[1];
                return (
                  <div key={`${item.id}-${copy}`} className="map-point" data-selected={selected === index} hidden={x < extent.left || x > extent.right || y < 0 || y > 540} style={{ left: `${x / 10}%`, top: `${y / 5.4}%` }}>
                    <svg className="map-leader" viewBox="-44 -44 88 88" aria-hidden="true"><path d={`M0 0L${offsetX} ${offsetY}`} /><circle r="2.5" /></svg>
                    <button type="button" className="map-pin" style={{ transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))` }} aria-label={`${item.city[translation]}, ${item.region[translation]} · ${item.chapter[translation]}`} aria-pressed={selected === index} onClick={() => choosePlace(index, true)}>
                      <span aria-hidden="true">{index + 1}</span>
                    </button>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
          <div className="map-caption" aria-live="polite" aria-atomic="true">
            <p><strong>{place.city[translation]}</strong><span className="map-caption-region">{place.region[translation]}</span></p>
            <div className="map-scales" role="group" aria-label={text.scales}>
              {(["country", "region", "city"] as const).map((boundary) => (
                <button key={boundary} type="button" className="map-scale" data-boundary={boundary} aria-pressed={scale === boundary} onClick={() => showBoundary(selected, boundary)}><span aria-hidden="true" />{boundary === "region" ? text.region[place.country] : text[boundary]}</button>
              ))}
            </div>
          </div>
          <p className="map-source"><span>Natural Earth · U.S. Census Bureau · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></span></p>
        </div>
      </div>
    </section>
  );
}
