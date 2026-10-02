"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "../languages";
import { projectDetailLocation } from "./projection";
import { layoutMapLabels, mapDetailPath, routeInView, type MapDetailData, type MapView } from "./details";

// Same-origin static files only; shared promises prevent repeated downloads on zoom.
const downloads = new Map<string, Promise<MapDetailData>>();
const load = (path: string) => {
  if (!downloads.has(path)) {
    downloads.set(path, fetch(path).then(response => {
      if (!response.ok) throw new Error("Map detail asset unavailable");
      return response.json() as Promise<MapDetailData>;
    }).catch(error => { downloads.delete(path); throw error; }));
  }
  return downloads.get(path)!;
};
type Location = { longitude: number; latitude: number; offset: readonly number[] };

export function MapDetails({ language, placeId, view, locations }: { language: Language; placeId: string; view: MapView; locations: readonly Location[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [context, setContext] = useState<MapDetailData | null>(null);
  const [local, setLocal] = useState<{ id: string; data: MapDetailData } | null>(null);
  const localEnabled = view.detail && view.zoom >= 60;
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => { const { width, height } = element.getBoundingClientRect(); setSize({ width, height }); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    if (view.detail) load(mapDetailPath(language, "context")).then(data => { if (active) setContext(data); }).catch(() => {});
    return () => { active = false; };
  }, [language, view.detail]);
  useEffect(() => {
    let active = true;
    if (localEnabled) load(mapDetailPath(language, placeId)).then(data => { if (active) setLocal({ id: placeId, data }); }).catch(() => {});
    return () => { active = false; };
  }, [language, placeId, localEnabled]);
  const localData = localEnabled && local?.id === placeId ? local.data : null;
  const routes = (context?.routes ?? []).filter(route => routeInView(route, view));
  const localRoutes = (localData?.routes ?? []).filter(route => routeInView(route, view));
  const coverage = localData?.coverage;
  const area = coverage && { x: coverage[0], y: coverage[1], width: coverage[2] - coverage[0], height: coverage[3] - coverage[1] };
  const reserved = locations.map(item => {
    const point = projectDetailLocation(item.longitude, item.latitude);
    const x = (point.x - view.x) * view.zoom + 500, y = (point.y - view.y) * view.zoom + 270;
    const dx = x < 150 ? Math.abs(item.offset[0]) : x > 850 ? -Math.abs(item.offset[0]) : item.offset[0];
    const dy = y < 100 ? Math.abs(item.offset[1]) : y > 440 ? -Math.abs(item.offset[1]) : item.offset[1];
    return { left: x / 1000 * size.width + dx - 22, top: y / 540 * size.height + dy - 22, width: 44, height: 44 };
  });
  const labels = layoutMapLabels([...(localData?.labels ?? []), ...(context?.labels ?? [])], view, size, language, reserved);
  return (
    <div className="map-details" ref={root} aria-hidden="true">
      <svg className="map-world" viewBox="0 0 1000 540">
        {area && <defs>
          <mask id="map-context-coverage" maskUnits="userSpaceOnUse" x="0" y="-500" width="1000" height="1540"><rect x="0" y="-500" width="1000" height="1540" fill="white" /><rect {...area} fill="black" /></mask>
          <clipPath id="map-local-coverage"><rect {...area} /></clipPath>
        </defs>}
        <g className="map-geography" style={{ transform: `translate(${500 - view.x * view.zoom}px, ${270 - view.y * view.zoom}px) scale(${view.zoom})` }}>
          <g mask={area ? "url(#map-context-coverage)" : undefined}>
            {routes.map((route, index) => <path key={`${route.kind}-${route.level}-${index}`} className={`map-detail-${route.kind}`} data-level={route.level} d={route.path} />)}
          </g>
          <g clipPath={area ? "url(#map-local-coverage)" : undefined}>
            {localRoutes.map((route, index) => <path key={`${route.kind}-${route.level}-${index}`} className={`map-detail-${route.kind}`} data-level={route.level} d={route.path} />)}
          </g>
        </g>
      </svg>
      {labels.map(label => (
        <span key={label.id} className="map-detail-label" data-kind={label.kind} style={{ left: `${label.left / size.width * 100}%`, top: `${label.top / size.height * 100}%` }}>
          {label.kind === "airport" && <svg viewBox="0 0 16 16"><path d="m8 1 1 5 5 3v1L9 9l-.5 4 2 1v1L8 14l-2.5 1v-1l2-1L7 9l-5 1V9l5-3 1-5Z" /></svg>}
          {label.kind === "station" && <svg viewBox="0 0 16 16"><path d="M4 3h8v8H4zM5 14l2-3m4 3-2-3M4 7h8" /></svg>}
          {label.text}
        </span>
      ))}
    </div>
  );
}
