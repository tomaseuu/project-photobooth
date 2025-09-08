"use client";

/* 
    PhotoStrip Page
     - Loads the 4 photos saved in sessionStorage (either from camera or upload)
     - Allows user to reorder photos by drag and drop
     - Allows user to pick a background color
     - Allows user to change the tones of the photos
     - Export strip as a PNG
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./photostrip.module.css";

/* Constants */

const PRESETS = [
  { 
    name: "white",  
    hex: "#ffffff" 
  },
  { 
    name: "blue",   
    hex: "#bcd6ff" 
  },
  { 
    name: "green",  
    hex: "#c9ffc9" 
  },
  { 
    name: "purple", 
    hex: "#e8c9ff" 
  },
  { 
    name: "red",    
    hex: "#ffb3b3" 
  },
  { 
    name: "black",  
    hex: "#2b2b2b" 
  },
];

const DEFAULTS = {
  themeColor: "#ffffff",
  customColor: "#ffffff",
  tone: 
  { 
    saturation: 100, 
    brightness: 100, 
    contrast: 100, 
    temperature: 100, 
    tint: 100 
  },
};

/* Component */

export default function Page() {
  /* Placeholders - so we do not break anything else */
  const defaultFilter = "none";
  const defaultTones = 
  { 
    brightness: 100, 
    contrast: 100, 
    saturation: 100 
  };
  const defaultPalette = "#ffffff";
  const defaultPhotos: string[] = [];
  const defaultStickers: string[] = [];

  /* State */
  const [filter, setFilter] = useState(defaultFilter);               // not used for rendering
  const [tones, setTones] = useState(defaultTones);                 
  const [palette, setPalette] = useState(defaultPalette);            
  const [photos, setPhotos] = useState(defaultPhotos);
  const [stickers, setStickers] = useState(defaultStickers);  
  const [themeColor, setThemeColor] = useState(DEFAULTS.themeColor);       // strip background color
  const [customColor, setCustomColor] = useState(DEFAULTS.customColor);    // color picker current value
  const [tone, setTone] = useState(DEFAULTS.tone);
  const [showHint, setShowHint] = useState(true);   // "drag to reoder" hint - should disappear once you start dragging

  /* Refs / Routers */
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();



  /* Effects */

  // hide the "drag to reorder" hint after 10s
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 10000);
    return () => clearTimeout(t);
  }, []);

  // load photos + theme/custom/tone; snapshot original order once
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("luma_photos");
      const list = raw ? JSON.parse(raw) : [];
      setPhotos(list);

      const hasOriginal = sessionStorage.getItem("luma_photos_original");
      if (!hasOriginal && list.length) {
        sessionStorage.setItem("luma_photos_original", JSON.stringify(list));
      }
    } catch {}

    // restore color + custom + tone from previous session in this tab
    const t = sessionStorage.getItem("luma_theme");
    if (t) setThemeColor(t);

    const c = sessionStorage.getItem("luma_custom");
    if (c) setCustomColor(c);

    const toneRaw = sessionStorage.getItem("luma_tone");
    if (toneRaw) {
      try { 
        setTone(JSON.parse(toneRaw)); 
      } catch 
      {}
    }
  }, []);

  // theme/custom/tone - reloading them keeps the choice
  useEffect(() => { sessionStorage.setItem("luma_theme", themeColor); }, [themeColor]);
  useEffect(() => { sessionStorage.setItem("luma_custom", customColor); }, [customColor]);
  useEffect(() => { sessionStorage.setItem("luma_tone", JSON.stringify(tone)); }, [tone]);





  /* Memos */

  // 4 slots from current photos list
  const slots = useMemo<(string | null)[]>(
    () => Array.from({ length: 4 }, (_, i) => photos[i] ?? null),
    [photos]
  );

  // helpers for overlays + CSS filter (temperature / tint overlays)
  // - normalize 0 - 200% into -1... +1 around 100% (neutral)
  const norm = (p: number) => Math.max(-1, Math.min(1, (p - 100) / 100));

  const tempOverlay = useMemo(() => {
    const t = norm(tone.temperature);
    if (t === 0) 
      return { color: "rgba(0,0,0,0)", alpha: 0 };
    const color = t > 0 ? "rgba(255,140,0,1)" : "rgba(0,120,255,1)";
    const alpha = Math.min(0.35, Math.abs(t) * 0.35);
    return { color, alpha };
  }, [tone.temperature]);

  const tintOverlay = useMemo(() => {
    const tt = norm(tone.tint);
    if (tt === 0) 
      return { color: "rgba(0,0,0,0)", alpha: 0 };
    const color = tt > 0 ? "rgba(255,0,170,1)" : "rgba(0,255,170,1)";
    const alpha = Math.min(0.25, Math.abs(tt) * 0.25);
    return { color, alpha };
  }, [tone.tint]);

  // CSS filter string for photo previews
  const cssFilter = useMemo(
    () => `saturate(${tone.saturation}%) brightness(${tone.brightness}%) contrast(${tone.contrast}%)`,
    [tone]
  );




  /* Handlers - action buttons */

  // go back to capture page, clear session keys
  const handleNew = () => {
    sessionStorage.removeItem("luma_photos");
    sessionStorage.removeItem("luma_photos_original");
    router.push("/photobooth");
  };

  // reset tones/palette/stickers and restore original photo order
  const handleRedo = () => {
    // theme + tones
    setThemeColor(DEFAULTS.themeColor);
    setCustomColor(DEFAULTS.customColor);
    setTone(DEFAULTS.tone);
    sessionStorage.setItem("luma_theme", DEFAULTS.themeColor);
    sessionStorage.setItem("luma_custom", DEFAULTS.customColor);
    sessionStorage.setItem("luma_tone", JSON.stringify(DEFAULTS.tone));


    setFilter("none");
    setTones(
      { 
        brightness: 100, 
        contrast: 100, 
        saturation: 100 
      }
    );
    setPalette("#ffffff");

    // stickers
    setStickers([]);

    // restore snapshot of original 4 photos
    try {
      const origRaw = sessionStorage.getItem("luma_photos_original");
      const orig: string[] = origRaw ? JSON.parse(origRaw) : [];
      setPhotos(orig);
      sessionStorage.setItem("luma_photos", JSON.stringify(orig));
    } catch {}

    setShowHint(true);
  };



  // export PNG
  const handleDownload = async () => {
    if (!photos.length) return;

    // helper: create <img> and wait for load
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

    const imgs = await Promise.all(photos.map(loadImage));
    // layout math for export canvas
    const pad = 30;           // outer padding
    const gap = 20;           // gap between photos
    const targetW = 600;      // scale every photo to this width

    const scaled = imgs.map((img) => {
      const s = targetW / img.width;
      return { img, w: targetW, h: Math.round(img.height * s) };
    });

    const innerH = scaled.reduce((a, s) => a + s.h, 0) + gap * (scaled.length - 1);
    const canvasW = targetW + pad * 2;
    const canvasH = innerH + pad * 2;

    // build canvas
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;


    // background (strip color)
    ctx.fillStyle = themeColor;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.filter = cssFilter;

    // draw photos vertically stacked
    let y = pad;
    scaled.forEach(({ img, w, h }) => {
      ctx.drawImage(img, pad, y, w, h);
      y += h + gap;
    });



    // overlays
    // @ts-ignore
    ctx.globalCompositeOperation = "color";
    if (tempOverlay.alpha > 0) {
      ctx.fillStyle = tempOverlay.color.replace(",1)", `,${tempOverlay.alpha})`);
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    if (tintOverlay.alpha > 0) {
      ctx.fillStyle = tintOverlay.color.replace(",1)", `,${tintOverlay.alpha})`);
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    ctx.globalCompositeOperation = "source-over";

    // export as PNG
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "photostrip.png";
    a.click();
  };

  // open native color picker
  const openCustomPicker = () => {
    const el = colorInputRef.current;
    if (!el) return;
    // @ts-ignore
    if (el.showPicker) el.showPicker();
    else el.click();
  };




  /* Drag and Drop Feature */

  const dragFrom = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (i: number) => (e: React.DragEvent) => {
    setShowHint(false);
    dragFrom.current = i;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  };

  const handleDragOver = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverIdx(i);
  };

  const handleDragLeave = () => setOverIdx(null);
  const handleDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();

    const from =
      dragFrom.current !== null
        ? dragFrom.current
        : Number(e.dataTransfer.getData("text/plain"));

    dragFrom.current = null;
    setOverIdx(null);

    if (Number.isNaN(from) || from === i) 
      return;

    // move photo inside array and persist new order
    setPhotos((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(i, 0, moved);
      sessionStorage.setItem("luma_photos", JSON.stringify(arr)); // only working order
      return arr;
    });
  };

  const handleDragEnd = () => {
    dragFrom.current = null;
    setOverIdx(null);
  };





  /* Render */

  return (
    <div className={styles.page}>
      <h1>LUMA LEAF</h1>

      <div className={styles.layout}>
        {/* LEFT: Palette + Custom + Themes */}
        <aside className={styles.leftPanel}>
          <p className={styles.smallTitle}>select your shade!</p>

          <div className={styles.box}>
            <h2>Palette</h2>
            <div className={styles.swatchList}>
              {PRESETS.map((c) => (
                <div key={c.hex} className={styles.swatchRow}>
                  <span className={styles.swatchName}>{c.name}</span>
                  <button
                    type="button"
                    className={styles.swatchChipBtn}
                    aria-label={`Choose ${c.name}`}
                    onClick={() => setThemeColor(c.hex)}
                  >
                    <span className={styles.swatchChip} style={{ background: c.hex }} />
                    <span className={styles.swatchPreview} style={{ background: c.hex }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* custom outside the box (closer spacing) */}
          <div className={styles.customRowOutside}>
            <span className={styles.swatchName}>custom:</span>
            <button
              type="button"
              className={styles.swatchChipBtn}
              aria-label="Pick custom color"
              onClick={openCustomPicker}
            >
              <span className={styles.swatchChip} style={{ background: customColor }} />
              <span className={styles.swatchPreview} style={{ background: customColor }} />
            </button>
            <input
              ref={colorInputRef}
              type="color"
              value={customColor}
              onChange={(e) => {
                const hex = e.target.value;
                setCustomColor(hex);
                setThemeColor(hex);
              }}
              className={styles.hiddenColor}
            />
          </div>

          <p className={styles.smallTitle}>choose a sticker!</p>
          <div className={styles.box}>
            <h2>Themes</h2>
            <p>none</p>
            <p>cute</p>
            <p>leaf</p>
            <p>BTS</p>
            <p>TWICE</p>
            <p>Miffy</p>
          </div>
        </aside>

        {/* CENTER: Strip */}
        <main className={styles.centerPanel}>
          <div className={styles.strip} style={{ ["--theme-color" as any]: themeColor }}>
            {showHint && <div className={styles.stripHint}>drag photos to reorder</div>}

            {slots.map((src, i) => (
              <div
                key={i}
                className={`${styles.slot} ${overIdx === i ? styles.dropTarget : ""}`}
                draggable={!!src}
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDragEnter={handleDragEnter(i)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(i)}
                onDragEnd={handleDragEnd}
              >
                <div className={styles.photoWrap} style={{ filter: cssFilter }}>
                  {src ? (
                    <img src={src} alt={`Photo ${i + 1}`} />
                  ) : (
                    <div className={styles.placeholder} />
                  )}

                  {tempOverlay.alpha > 0 && (
                    <div
                      className={styles.overlay}
                      style={{ background: tempOverlay.color, opacity: tempOverlay.alpha }}
                    />
                  )}

                  {tintOverlay.alpha > 0 && (
                    <div
                      className={styles.overlay}
                      style={{ background: tintOverlay.color, opacity: tintOverlay.alpha }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

  {/* RIGHT: Tones + Actions */}
<aside className={styles.rightPanel}>
  <div className={styles.box}>
    <h2>Tones</h2>

    <div className={styles.toneBlock}>
      <div className={styles.toneLabel}>Saturation</div>
      <input
        type="range"
        min={0}
        max={200}
        value={tone.saturation}
        onChange={(e) => setTone({ ...tone, saturation: +e.target.value })}
      />
      <div className={styles.toneValue}>{tone.saturation}%</div>
    </div>

    <div className={styles.toneBlock}>
      <div className={styles.toneLabel}>Brightness</div>
      <input
        type="range"
        min={0}
        max={200}
        value={tone.brightness}
        onChange={(e) => setTone({ ...tone, brightness: +e.target.value })}
      />
      <div className={styles.toneValue}>{tone.brightness}%</div>
    </div>

    <div className={styles.toneBlock}>
      <div className={styles.toneLabel}>Contrast</div>
      <input
        type="range"
        min={0}
        max={200}
        value={tone.contrast}
        onChange={(e) => setTone({ ...tone, contrast: +e.target.value })}
      />
      <div className={styles.toneValue}>{tone.contrast}%</div>
    </div>

    <div className={styles.toneBlock}>
      <div className={styles.toneLabel}>Temperature</div>
      <input
        type="range"
        min={0}
        max={200}
        value={tone.temperature}
        onChange={(e) => setTone({ ...tone, temperature: +e.target.value })}
      />
      <div className={styles.toneValue}>{tone.temperature}%</div>
    </div>

    <div className={styles.toneBlock}>
      <div className={styles.toneLabel}>Tint</div>
      <input
        type="range"
        min={0}
        max={200}
        value={tone.tint}
        onChange={(e) => setTone({ ...tone, tint: +e.target.value })}
      />
      <div className={styles.toneValue}>{tone.tint}%</div>
    </div>
  </div>

  <button className={styles.boxButton} onClick={handleNew}>NEW</button>
  <button className={styles.boxButton} onClick={handleRedo}>RESET ALL</button>
  <button className={styles.boxButton} onClick={() => alert("Coming soon!")}>VIDEO GIF</button>
  <button className={styles.boxButton} onClick={() => alert("Coming soon!")}>QR CODE</button>
  <button className={styles.boxButton} onClick={handleDownload} disabled={!photos.length}>DOWNLOAD</button>
</aside>

      </div>
    </div>
  );
}
