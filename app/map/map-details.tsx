"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "../languages";
import { projectDetailLocation, nearestWorldX, mapWorldOffsets } from "./projection";
import { layoutMapLabels, mapDetailPath, routeInView, type MapDetailData, type MapView } from "./details";
import { loadMapAsset } from "./load-asset";
type Location = { longitude: number; latitude: number; offset: readonly number[] };

export function MapDetails({ language, placeId, view, locations }: { language: Language; placeId: string; view: MapView; locations: readonly Location[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [context, setContext] = useState<MapDetailData | null>(null);
  const [local, setLocal] = useState<{ id: string; data: MapDetailData } | null>(null);
  const [tiles, setTiles] = useState<Record<string, MapDetailData>>({});
  const tileWork = useRef({ paths: new Set<string>(), loaded: new Set<string>(), requests: new Map<string, AbortController>(), updates: {} as Record<string, MapDetailData>, frame: 0 });
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
    const controller = new AbortController();
    if (view.detail) loadMapAsset<MapDetailData>(mapDetailPath(language, "context"), controller.signal).then(data => { if (!controller.signal.aborted) setContext(data); }).catch(() => {});
    return () => controller.abort();
  }, [language, view.detail]);
  useEffect(() => {
    const controller = new AbortController();
    if (localEnabled) loadMapAsset<MapDetailData>(mapDetailPath(language, placeId), controller.signal).then(data => { if (!controller.signal.aborted) setLocal({ id: placeId, data }); }).catch(() => {});
    return () => controller.abort();
  }, [language, placeId, localEnabled]);
  const localData = localEnabled && local?.id === placeId ? local.data : null;
  const contextPaths = (context?.tiles ?? []).filter(tile => routeInView(tile, view)).map(tile => mapDetailPath(language, `context/${tile.id}`, tile.version));
  const localTiles = (localData?.tiles ?? []).filter(tile => routeInView(tile, view));
  const localPaths = localTiles.map(tile => mapDetailPath(language, `${placeId}/${tile.id}`, tile.version));
  const tilePaths = [...localPaths, ...contextPaths].join("|");
  useEffect(() => {
    const work = tileWork.current;
    work.paths = new Set(tilePaths.split("|").filter(Boolean));
    for (const [path, controller] of work.requests) {
      if (!work.paths.has(path)) { controller.abort(); work.requests.delete(path); }
    }
    for (const path of work.loaded) {
      if (!work.paths.has(path)) { work.loaded.delete(path); delete work.updates[path]; }
    }
    const flush = () => {
      work.frame = 0;
      const paths = [...work.paths], updates = work.updates;
      work.updates = {};
      setTiles(previous => Object.fromEntries(paths.flatMap(path => updates[path] || previous[path] ? [[path, updates[path] ?? previous[path]]] : [])));
    };
    // Drop offscreen references; the shared byte-limited cache handles revisits.
    if (!work.frame) work.frame = requestAnimationFrame(flush);
    for (const path of work.paths) {
      if (work.loaded.has(path) || work.requests.has(path)) continue;
      const controller = new AbortController();
      work.requests.set(path, controller);
      loadMapAsset<MapDetailData>(path, controller.signal).then(data => {
        if (controller.signal.aborted) return;
        work.updates[path] = data;
        work.loaded.add(path);
        if (!work.frame) work.frame = requestAnimationFrame(flush);
      }).catch(() => {}).finally(() => { if (work.requests.get(path) === controller) work.requests.delete(path); });
    }
  }, [tilePaths]);
  useEffect(() => {
    const work = tileWork.current;
    return () => {
      for (const controller of work.requests.values()) controller.abort();
      work.requests.clear(); work.loaded.clear(); work.updates = {};
      cancelAnimationFrame(work.frame); work.frame = 0;
    };
  }, []);
  const contextData = contextPaths.flatMap(path => tiles[path] ? [tiles[path]] : []);
  const localReady = localTiles.every((tile, index) => tile.minZoom >= 700 || tiles[localPaths[index]]);
  const localChunks = localPaths.flatMap(path => tiles[path] ? [tiles[path]] : []);
  const routes = [...(context?.routes ?? []), ...contextData.flatMap(tile => tile.routes)].filter(route => routeInView(route, view));
  const localRoutes = localReady ? [...(localData?.routes ?? []), ...localChunks.flatMap(tile => tile.routes)].filter(route => routeInView(route, view)) : [];
  const coverage = localReady ? localData?.coverage : undefined;
  const area = coverage && { x: coverage[0], y: coverage[1], width: coverage[2] - coverage[0], height: coverage[3] - coverage[1] };
  const reserved = locations.map(item => {
    const point = projectDetailLocation(item.longitude, item.latitude);
    const x = (nearestWorldX(point.x, view.x) - view.x) * view.zoom + 500, y = (point.y - view.y) * view.zoom + 270;
    const dx = x < 150 ? Math.abs(item.offset[0]) : x > 850 ? -Math.abs(item.offset[0]) : item.offset[0];
    const dy = y < 100 ? Math.abs(item.offset[1]) : y > 440 ? -Math.abs(item.offset[1]) : item.offset[1];
    return { left: x / 1000 * size.width + dx - 22, top: y / 540 * size.height + dy - 22, width: 44, height: 44 };
  });
  const labels = layoutMapLabels([...(localData?.labels ?? []), ...localChunks.flatMap(tile => tile.labels), ...(context?.labels ?? [])], view, size, language, reserved);
  return (
    <div className="map-details" ref={root} aria-hidden="true">
      <svg className="map-world" viewBox="0 0 1000 540">
        {area && <defs>
          <mask id="map-context-coverage" maskUnits="userSpaceOnUse" x="0" y="-500" width="1000" height="1540"><rect x="0" y="-500" width="1000" height="1540" fill="white" /><rect {...area} fill="black" /></mask>
          <clipPath id="map-local-coverage"><rect {...area} /></clipPath>
        </defs>}
        <defs><g id="map-base-details">
          <g mask={area ? "url(#map-context-coverage)" : undefined}>
            {routes.map((route, index) => <path key={`${route.kind}-${route.level}-${index}`} className={`map-detail-${route.kind}`} data-level={route.level} d={route.path} />)}
          </g>
          <g clipPath={area ? "url(#map-local-coverage)" : undefined}>
            {localRoutes.map((route, index) => <path key={`${route.kind}-${route.level}-${index}`} className={`map-detail-${route.kind}`} data-level={route.level} d={route.path} />)}
          </g>
        </g></defs>
        <g className="map-geography" style={{ transform: `translate(${500 - view.x * view.zoom}px, ${270 - view.y * view.zoom}px) scale(${view.zoom})` }}>
          {mapWorldOffsets(view).map(offset => <use key={offset} href="#map-base-details" x={offset} />)}
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
