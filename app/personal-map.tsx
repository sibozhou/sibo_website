"use client";

import { useRef, useState } from "react";
import type { Language } from "./languages";
import { projectLocation } from "./map/projection";
import geography from "./map/world-land.json";

const places = [
  { id: "haikou", longitude: 110.1999, latitude: 20.044, offset: [12, -26], city: ["Haikou", "海口", "海口"], region: ["China", "中国", "中國"], chapter: ["home", "家乡", "家鄉"] },
  { id: "elmhurst", longitude: -87.9403, latitude: 41.8995, offset: [0, -26], city: ["Elmhurst", "埃尔姆赫斯特", "埃爾姆赫斯特"], region: ["Illinois, USA", "美国 · 伊利诺伊州", "美國 · 伊利諾州"], chapter: ["high school", "高中", "高中"] },
  { id: "los-angeles", longitude: -118.2437, latitude: 34.0522, offset: [-34, 28], city: ["Los Angeles", "洛杉矶", "洛杉磯"], region: ["California, USA", "美国 · 加利福尼亚州", "美國 · 加州"], chapter: ["undergraduate", "本科", "大學"] },
  { id: "providence", longitude: -71.4128, latitude: 41.824, offset: [32, 24], city: ["Providence", "普罗维登斯", "普羅維登斯"], region: ["Rhode Island, USA", "美国 · 罗得岛州", "美國 · 羅德島州"], chapter: ["master’s", "硕士", "碩士"] },
  { id: "berkeley", longitude: -122.273, latitude: 37.8715, offset: [-32, -22], city: ["Berkeley", "伯克利", "柏克萊"], region: ["California, USA", "美国 · 加利福尼亚州", "美國 · 加州"], chapter: ["current work", "现在的工作", "現在的工作"] },
] as const;

const copy = {
  en: { places: "Places along the way", map: "Interactive world map", hint: "Choose a place to take a closer look.", world: "world view", zoomIn: "Zoom in", zoomOut: "Zoom out" },
  zh: { places: "走过的地方", map: "互动世界地图", hint: "选择一个地点，走近看看。", world: "世界全景", zoomIn: "放大", zoomOut: "缩小" },
  "zh-hant": { places: "走過的地方", map: "互動世界地圖", hint: "選擇一個地點，走近看看。", world: "世界全景", zoomIn: "放大", zoomOut: "縮小" },
};

const worldView = { x: 500, y: 270, zoom: 1 };

export function PersonalMap({ language }: { language: Language }) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState(worldView);
  const stage = useRef<HTMLDivElement>(null);
  const text = copy[language];
  const translation = language === "en" ? 0 : language === "zh" ? 1 : 2;
  const place = places[selected];
  const choosePlace = (index: number) => {
    const point = projectLocation(places[index].longitude, places[index].latitude);
    setSelected(index);
    setView({ ...point, zoom: 3.2 });
    if (window.matchMedia("(max-width: 700px)").matches && stage.current && stage.current.getBoundingClientRect().top < 64) {
      stage.current.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  };
  const zoom = (amount: number) => {
    const level = Math.min(6, Math.max(1, view.zoom * amount));
    const point = projectLocation(place.longitude, place.latitude);
    setView(level === 1 ? worldView : { ...point, zoom: level });
  };

  return (
    <section className="personal-map" aria-label={text.places}>
      <p className="map-hint">{text.hint}</p>
      <div className="map-layout">
        <ol className="map-places">
          {places.map((item, index) => (
            <li key={item.id}>
              <button type="button" className="map-place" aria-pressed={selected === index} onClick={() => choosePlace(index)}>
                <span className="map-place-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span><span className="map-place-city">{item.city[translation]}</span><span className="map-place-chapter">{item.chapter[translation]}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="map-viewport">
          <div className="map-stage" ref={stage} role="group" aria-label={text.map}>
            <div className="map-controls">
              <button type="button" className="map-reset" disabled={view.zoom === 1} onClick={() => setView(worldView)}>{text.world}</button>
              <button type="button" aria-label={text.zoomOut} disabled={view.zoom === 1} onClick={() => zoom(1 / 1.5)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" /></svg></button>
              <button type="button" aria-label={text.zoomIn} disabled={view.zoom === 6} onClick={() => zoom(1.5)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M10 4v12" /></svg></button>
            </div>
            <div className="map-canvas">
              <svg className="map-world" viewBox="0 0 1000 540" aria-hidden="true">
                <g className="map-geography" style={{ transform: `translate(${500 - view.x * view.zoom}px, ${270 - view.y * view.zoom}px) scale(${view.zoom})` }}>
                  <path className="map-graticule" d={geography.graticule} />
                  <path className="map-land" d={geography.land} />
                </g>
              </svg>
              {places.map((item, index) => {
                const point = projectLocation(item.longitude, item.latitude);
                const x = (point.x - view.x) * view.zoom + 500;
                const y = (point.y - view.y) * view.zoom + 270;
                const offsetX = x < 150 ? Math.abs(item.offset[0]) : x > 850 ? -Math.abs(item.offset[0]) : item.offset[0];
                const offsetY = y < 100 ? Math.abs(item.offset[1]) : y > 440 ? -Math.abs(item.offset[1]) : item.offset[1];
                return (
                  <div key={item.id} className="map-point" data-selected={selected === index} hidden={x < 0 || x > 1000 || y < 0 || y > 540} style={{ left: `${x / 10}%`, top: `${y / 5.4}%` }}>
                    <svg className="map-leader" viewBox="-44 -44 88 88" aria-hidden="true"><path d={`M0 0L${offsetX} ${offsetY}`} /><circle r="2.5" /></svg>
                    <button type="button" className="map-pin" style={{ transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))` }} aria-label={`${item.city[translation]}, ${item.region[translation]} · ${item.chapter[translation]}`} aria-pressed={selected === index} onClick={() => choosePlace(index)}>
                      <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="map-caption" aria-live="polite" aria-atomic="true">
            <p><strong>{place.city[translation]}</strong><span className="map-caption-region">{place.region[translation]}</span></p>
            <p className="map-coordinates" lang="en">{place.latitude.toFixed(2)}° N <span aria-hidden="true">·</span> {Math.abs(place.longitude).toFixed(2)}° {place.longitude < 0 ? "W" : "E"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
