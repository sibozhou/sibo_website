// Runs before the page is painted; winter is the no-JavaScript fallback.
const script = `(() => {
  const root = document.documentElement;
  let timer;
  function updateIcon() {
    const file = root.dataset.season === "summer" ? "favicon-summer.svg" : "favicon.svg";
    document.querySelectorAll('link[rel="icon"]').forEach((icon) => {
      const href = new URL(file, icon.href).href;
      if (icon.href !== href) icon.href = href;
    });
  }
  function update() {
    clearTimeout(timer);
    const now = new Date();
    const month = now.getMonth();
    root.dataset.season = month >= 3 && month <= 8 ? "summer" : "winter";
    updateIcon();
    const midnight = new Date(now.getFullYear(), month, now.getDate() + 1);
    timer = setTimeout(update, midnight.getTime() - now.getTime());
  }
  update();
  // Metadata can arrive after this script or change during page navigation.
  new MutationObserver(updateIcon).observe(document.head, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["href"]
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) update(); });
  window.addEventListener("pageshow", update);
})();`;

export function SeasonalTheme() {
  return <script id="seasonal-theme" dangerouslySetInnerHTML={{ __html: script }} />;
}
