"use client";

/* 
    PhotoStrip Page
     - Loads the 4 photos saved in sessionStorage (either from camera or upload)
     - Allows user to reorder photos by drag and drop
     - Allows user to pick a background color
     - Allows user to change the tones of the photos
     - Export strip as a PNG
     - Create a 10-min QR share link
*/

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react"; 
import styles from "./photostrip.module.css";

/* ===== SAFE SESSION HELPERS (iOS Private mode) ===== */
declare global {
  interface Window { 
    __LUMA_PHOTOS__?: string[];
    __LUMA_LIVE__?: boolean;        // <-- added (flag set by Photobooth on live capture)
    __LUMA_PREROLL__?: string[][];  // optional fallback if you ever store preroll in-memory
  }
}
function safeSetSession(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch {}
}
function safeRemoveSession(key: string) {
  try { sessionStorage.removeItem(key); } catch {}
}
/* ================================================ */

/* simple color presets the user can click */

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

/* default setting for the strip and tones */
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
  const [filter, setFilter] = useState(defaultFilter); // not used for rendering
  const [tones, setTones] = useState(defaultTones);
  const [palette, setPalette] = useState(defaultPalette);

  const [photos, setPhotos] = useState(defaultPhotos);
  const [stickers, setStickers] = useState(defaultStickers);
  
  const [themeColor, setThemeColor] = useState(DEFAULTS.themeColor);    // strip background color
  const [customColor, setCustomColor] = useState(DEFAULTS.customColor); // color picker current value
  
  /* tone object we use to compute CSS + overlays */
  const [tone, setTone] = useState(DEFAULTS.tone);
  
  const [showHint, setShowHint] = useState(true); // "drag to reorder" hint
  const [footerTitle, setFooterTitle] = useState("LUMA LEAF"); // Footer Branding ( Bottom of PhotoStrip )
  const [footerDate, setFooterDate] = useState(
  new Date().toLocaleDateString() // date change real time
   
  );

  /* Copy-to-clipboard feedback for QR link */
  const [copyOk, setCopyOk] = useState(false);

  // QR share UI state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);              // show/hide the QR card
  const [creatingQR, setCreatingQR] = useState(false);
  

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
      const list = raw ? JSON.parse(raw) : (window.__LUMA_PHOTOS__ ?? []);
      setPhotos(list);

      // take a snapshot of the original order
      const hasOriginal = sessionStorage.getItem("luma_photos_original");
      if (!hasOriginal && list.length) {
        safeSetSession("luma_photos_original", JSON.stringify(list));
      }
    } catch {}

    // restore color + custom + tone from previous session in this tab
    try {
      const t = sessionStorage.getItem("luma_theme");
      if (t) setThemeColor(t);
    } catch {}

    try {
      const c = sessionStorage.getItem("luma_custom");
      if (c) setCustomColor(c);
    } catch {}

    try {
      const toneRaw = sessionStorage.getItem("luma_tone");
      if (toneRaw) {
        try { setTone(JSON.parse(toneRaw)); } catch {}
      }
    } catch {}
  }, []);

  // theme/custom/tone - reloading them keeps the choice
  useEffect(() => { safeSetSession("luma_theme", themeColor); }, [themeColor]);
  useEffect(() => { safeSetSession("luma_custom", customColor); }, [customColor]);
  useEffect(() => { safeSetSession("luma_tone", JSON.stringify(tone)); }, [tone]);

  /* Memos - fast to re-ender, only when deps change */

  // 4 slots from current photos list
  const slots: (string | null)[] = [
  photos[0] ?? null,
  photos[1] ?? null,
  photos[2] ?? null,
  photos[3] ?? null,
];

  // helpers for overlays + CSS filter (temperature / tint overlays)
  // - scale for 100% or -100%
  function norm(p: number) {
    return Math.max(-1, Math.min(1, (p - 100) / 100));
  }

  // temperature overlay
  const t = norm(tone.temperature);
  const tempOverlay =
    t === 0
      ? { color: "rgba(0,0,0,0)", alpha: 0 }
      : {
          color: t > 0 ? "rgba(255,140,0,1)" : "rgba(0,120,255,1)",
          alpha: Math.min(0.35, Math.abs(t) * 0.35),
        };

  // tint overlay 
  const tt = norm(tone.tint);
  const tintOverlay =
    tt === 0
      ? { color: "rgba(0,0,0,0)", alpha: 0 }
      : {
          color: tt > 0 ? "rgba(255,0,170,1)" : "rgba(0,255,170,1)",
          alpha: Math.min(0.25, Math.abs(tt) * 0.25),
        };

  // CSS filter string for photo previews
  const cssFilter = `saturate(${tone.saturation}%) brightness(${tone.brightness}%) contrast(${tone.contrast}%)`;
  
  
  // load all the little "pre-roll" frames
  async function loadPrerollFramesAll(): Promise<HTMLImageElement[][]> {
    try {
      // grab the saved string of pre-roll data
      const raw = sessionStorage.getItem("luma_preroll_all");
      if (!raw) 
        return [];

      // turn that string back into an array of arrays of image data URLs
      const groups: string[][] = JSON.parse(raw); 
      // ex of what it should lool like [ [f1..], [f2..], [f3..], [f4..] ]

      // helper function: take a data URL, make an <img>, and wait until it finishes loading
      const load = (src: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);    // when loaded, resolve with the <img>
          img.onerror = rej;              // if it fails, reject
          img.src = src;                  // start loading from the data URL
        });

      // for each group, load all the images inside it -> group of HTMLImageElement objects you can draw on a canvas
      const imagesGroups = await Promise.all(
        groups.map((arr) => Promise.all(arr.map(load)))
      );
      return imagesGroups; // return the 2D array of loaded images
    } catch {
      return [];
    }
  }
  
  /* VIDEO GIF */
  async function buildPhotostripVideoWebM(
    prerollGroups: HTMLImageElement[][], // 4 arrays (may be empty)
    photosList: string[],                         // 4 main photos
    bgColor: string,                              // strip background color
    filterStr: string,                            // css filter (brightness, contrast, etc.)
    temp:      // temperature overlay
    { 
      color: string; 
      alpha: number 
    },       
    tint:      // tint overlay
    { 
      color: string; 
      alpha: number 
    },      
    footer:    // footer text
    { 
      title: string; 
      date: string 
    },      

    fps = 12,                // smoother playback
    segmentSeconds = 3,      // use last 3 seconds
    repetitions = 2          // loop 2x => ~6 seconds total
  ): Promise<Blob> {

    // sizes for the strip
    const outer_pad = 30;
    const photo_gap = 20;
    const photo_width = 600;
    const photo_height = 450;
    const footer_height= 120;

    const canvasW = photo_width + outer_pad * 2;
    const canvasH = outer_pad * 2 + 4 * photo_height + 3 * photo_gap + footer_height;

    // Browser can record a video
    if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
      throw new Error("Video export not supported in this browser.");
    }

    // create a canvas and a 2d drawing context
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) 
      throw new Error("No 2D context");

    //helper: load an <img> from a data URL
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

    // if no preroll, fall back to just 4 still photos
    const slotImgs = await Promise.all(
      Array.from({ length: 4 }, (_, i) => (photosList[i] ? loadImage(photosList[i]) : null))
    );

    // recorder
    const stream = canvas.captureStream(fps);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm;codecs=vp8";
    const rec = new MediaRecorder(stream, 
      { 
        mimeType: mime, 
        videoBitsPerSecond: 2_000_000 
      });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data && chunks.push(e.data);
    rec.start();

    const targetAspect = photo_width / photo_height;
    const drawSlot = (img: HTMLImageElement | null, y_position: number) => {
      if (!img) {
        ctx.fillStyle = "#f3f3f3";
        ctx.fillRect(outer_pad, y_position, photo_width, photo_height);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(outer_pad, y_position, photo_width, photo_height);
        return;
      }
      const imageAspect = img.width / img.height;
      let crop_x = 0, crop_y = 0, crop_width = img.width, crop_height = img.height;
      if (imageAspect > targetAspect) {
        crop_height = img.height;
        crop_width = Math.round(crop_width * targetAspect);
        crop_x = Math.round((img.width - crop_width) / 2);
      } else {
        crop_width = img.width;
        crop_height = Math.round(crop_width / targetAspect);
        crop_y = Math.round((img.height - crop_height) / 2);
      }
      ctx.drawImage(img, crop_x, crop_y, crop_width, crop_height, outer_pad, y_position, photo_width, photo_height);
    };

    /* overlays + footer */
    /* 
        - lays a warm/cool overlay and a tint on top of the whole strip
        - draws the bottom footer with title + date
    */
    const applyOverlaysAndFooter = () => {
      // put color overlays on top
      // @ts-ignore
      ctx.globalCompositeOperation = "color";
      if (temp.alpha > 0) {
        ctx.fillStyle = temp.color.replace(",1)", `,${temp.alpha})`);
        ctx.fillRect(0, 0, canvasW, canvasH);
      }
      if (tint.alpha > 0) {
        ctx.fillStyle = tint.color.replace(",1)", `,${tint.alpha})`);
        ctx.fillRect(0, 0, canvasW, canvasH);
      }

      // go back to normal drawing mode
      ctx.globalCompositeOperation = "source-over";

      // draw footer box
      ctx.filter = "none";
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, canvasH - footer_height, canvasW, footer_height);

      const textColor = isDark(bgColor) ? "#fff" : "#000";
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = '700 36px "Times New Roman", Times, serif';
      ctx.fillText(footer.title, canvasW / 2, canvasH - footer_height / 2 - 10);

      ctx.font = '400 18px Arial, Helvetica, sans-serif';
      ctx.fillText(footer.date, canvasW / 2, canvasH - footer_height / 2 + 24);
    };

    // layout
    const y = [
      outer_pad, 
      outer_pad + photo_height + photo_gap, 
      outer_pad + 2 * (photo_height + photo_gap), 
      outer_pad + 3 * (photo_height + photo_gap)
    ];

    // preroll frames timeline
    // Build a 3s segment per slot (last 3s of captured frames)
    const segFrames = Math.max(1, Math.round(segmentSeconds * fps));

    // take only the LAST 'segFrames' from each slot's preroll - final moments before pictures
    const rawSegments = prerollGroups.map((group) => {
      const g = group || [];
      if (g.length === 0) 
        return [] as HTMLImageElement[];
      const start = Math.max(0, g.length - segFrames);
      return g.slice(start); 
    });

    // if some slots have fewer frames, repeat frames so every slot has the same count
    const normalizedSegments = rawSegments.map((seg) => {
      if (seg.length === 0) 
        return seg;                    
      if (seg.length === segFrames) 
        return seg;
      const out: HTMLImageElement[] = new Array(segFrames);
      for (let i = 0; i < segFrames; i++) {
        out[i] = seg[i % seg.length]; // repeat frames to fill
      }
      return out;
    });

    /* render each frame of the video */
    // how many frames total it will draw (3 segments times 2 loops = 6 seconds)
    const totalOutFrames = repetitions * segFrames;
    const frameDelay = 1000 / fps;

    for (let i = 0; i < totalOutFrames; i++) {
      const idx = i % segFrames;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.filter = filterStr;

      // draw each of the 4 slots:
        // - if we have preroll frames, use the matching frame for this moment
        // - if no preroll, draw the still photo

      for (let s = 0; s < 4; s++) {
        const seg = normalizedSegments[s];
        const img = seg.length ? seg[idx] : slotImgs[s]; 
        drawSlot(img ?? null, y[s]);
      }

      applyOverlaysAndFooter();

      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, frameDelay));
    }

    /* stop the recorder and combine the chunks into a single file-like Blob */
    rec.stop();
    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });
    return blob;
  }


  /* in web code, a Blob = “big chunk of binary data.”
      it’s like a file in memory (not on disk yet).
      could be an image, a video, audio, or any raw data.
      you can save it, download it, or show it in the browser.
  */

  // Helper Function: decide if a hex color is one of the "dark" ones we use
  function isDark(hex: string) {
    const h = hex.toLowerCase();
    return h === "#000000" || h === "#000" || h === "#2b2b2b"; // black or dark grey from your presets
  }

  /* PNG builder helper */
  async function buildPhotostripPng(
    photosList: string[],
    bgColor: string,
    filterStr: string,
    temp: 
    { 
      color: string; 
      alpha: number 
    },
    tint: 
    {
      color: string; 
      alpha: number 
    },
    footer: 
    { 
      title: string; 
      date: string 
    },
    format: "png" | "jpeg" = "png",
    quality = 0.9
  ) {
      if (!photosList.length) 
        throw new Error("No photos");

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  const imgs = await Promise.all(photosList.map(loadImage));

  // Fixed layout
  const outer_pad = 30;                 // outer padding
  const photo_gap = 20;                 // gap between photos
  const photo_width = 600;            // fixed frame width
  const photo_height = 450;            // fixed frame height (4:3 -> 600x450)
  const targetAspect = photo_width / photo_height;

  const count = imgs.length;      // usually 4
  const footer_height = 120;
  const canvasW = photo_width + outer_pad * 2;
  const canvasH = outer_pad * 2 + count * photo_height + (count - 1) * photo_gap + footer_height;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // Background (strip color)
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Base tone filter
  ctx.filter = filterStr;

  // Verticle 
  let y = outer_pad;
  for (const img of imgs) {
    const srcAR = img.width / img.height;

    let crop_x = 0, crop_y = 0, crop_width = img.width, crop_height = img.height;
    if (srcAR > targetAspect) {
      crop_height = img.height;
      crop_width = Math.round(crop_height * targetAspect);
      crop_x = Math.round((img.width - crop_width) / 2);
      crop_y = 0;
    } else {
      crop_width = img.width;
      crop_height = Math.round(crop_width / targetAspect);
      crop_x = 0;
      crop_y = Math.round((img.height - crop_height) / 2);
    }

    ctx.drawImage(img, crop_x, crop_y, crop_width, crop_height, outer_pad, y, photo_width, photo_height);
    y += photo_height + photo_gap;
  }

  // Overlays (temperature / tint)
  // @ts-ignore
  ctx.globalCompositeOperation = "color";
  if (temp.alpha > 0) {
    ctx.fillStyle = temp.color.replace(",1)", `,${temp.alpha})`);
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  if (tint.alpha > 0) {
    ctx.fillStyle = tint.color.replace(",1)", `,${tint.alpha})`);
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  ctx.globalCompositeOperation = "source-over";

    // --- footer ---
  ctx.filter = "none";                 // keep text crisp (no photo filters)
  const FOOTER_H = footer_height;           // just for readability

  // repaint footer background (helps if overlays tinted the area)
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, canvasH - FOOTER_H, canvasW, FOOTER_H);

  // if background is black, turn text to white
  const textColor = isDark(bgColor) ? "#fff" : "#000";
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // title
  ctx.font = '700 36px "Times New Roman", Times, serif';
  ctx.fillText(footer.title, canvasW / 2, canvasH - FOOTER_H / 2 - 10);

  // date
  ctx.font = '400 18px Arial, Helvetica, sans-serif';
  ctx.fillText(footer.date, canvasW / 2, canvasH - FOOTER_H / 2 + 24);
  
  if (format === "jpeg") {
    return canvas.toDataURL("image/jpeg", quality); // MUCH smaller
    }
    return canvas.toDataURL("image/png");
  }

function restoreOriginalOrderSafely() {
  const origRaw = sessionStorage.getItem("luma_photos_original");
  if (!origRaw) return; 

  try {
    const orig: unknown = JSON.parse(origRaw);
    if (Array.isArray(orig) && orig.length > 0) {
      setPhotos(orig as string[]);
      safeSetSession("luma_photos", JSON.stringify(orig));
    }
  } catch {
  }
}


  /* Handlers - action buttons */

  // go back to capture page, clear session keys
  const handleNew = () => {
    safeRemoveSession("luma_photos");
    safeRemoveSession("luma_photos_original");
    router.push("/photobooth");
  };

  // reset tones/palette/stickers and restore original photo order
  const handleRedo = () => {
    // theme + tones
    setThemeColor(DEFAULTS.themeColor);
    setCustomColor(DEFAULTS.customColor);
    setTone(DEFAULTS.tone);
    safeSetSession("luma_theme", DEFAULTS.themeColor);
    safeSetSession("luma_custom", DEFAULTS.customColor);
    safeSetSession("luma_tone", JSON.stringify(DEFAULTS.tone));

    setFilter("none");
    setTones(
      { brightness: 100, 
        contrast: 100, 
        saturation: 100 
      }
    );
    setPalette("#ffffff");

    // stickers
    setStickers([]);

    // restore snapshot of original 4 photos
    restoreOriginalOrderSafely();

    setShowHint(true);
  };

  // export PNG (uses the helper)
  const handleDownload = async () => {
    if (!photos.length) return;
    try {
      const url = await buildPhotostripPng(
        photos, 
        themeColor, 
        cssFilter, 
        tempOverlay, 
        tintOverlay,
        {
          title: footerTitle, 
          date:footerDate
        },
        "png",
        0.92
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "photostrip.png";
      a.click();
    } catch (e) {
      alert("Could not build image.");
      console.error(e);
    }
  };

  // QR CODE
  const handleCreateQR = async () => {
    if (!photos.length) return;
    try {
      setCreatingQR(true);

      // PNG data URL for current strip
      const dataUrl = await buildPhotostripPng(
        photos,
        themeColor,
        cssFilter,
        tempOverlay,
        tintOverlay,
        { 
          title: footerTitle, 
          date: footerDate 
        },
        "jpeg",
        0.85
      );

      // POST to API -> get token
      const res = await fetch("/api/strip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) {
        alert("Failed to create QR link.");
        return;
      }
      const { token } = await res.json();

      if (!token) {
      alert("No token returned from server.");
      return;
    }

      // build absolute URL to the share page
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://luma-leaf-sepia.vercel.app";
    const url = `${origin}/share/${token}`;

    setShareUrl(url);
    setQrOpen(true);
  } catch (e) {
    console.error(e);
    alert("Could not create QR link.");
  } finally {
    setCreatingQR(false);
  }
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

    if (Number.isNaN(from) || from === i) return;

    // move photo inside array and persist new order
    setPhotos((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(i, 0, moved);
      safeSetSession("luma_photos", JSON.stringify(arr)); // only working order
      return arr;
    });
  };

  const handleDragEnd = () => {
    dragFrom.current = null;
    setOverIdx(null);
  };

  const footerTextColor = isDark(themeColor) ? "#fff" : "#000";


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

          {/* custom outside the box */}
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

          <p className={styles.smallTitle}>choose a sticker! (COMING SOON! - DOES NOT WORK!)</p>
          <div className={styles.box}>
            <h2>Themes</h2>
            <p>none</p>
            <p>cute</p>
            <p>leaf</p>
            <p>stars</p>
            <p>kpop demon hunters</p>
            <p>horror</p>
          </div>
          <img
            src="/paintbottles.png"
            alt=""
            width={250}
            height={250}
            className={styles.paintbottles}
          />
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
            <div className={styles.footerBox} style={{ color: footerTextColor }}>
             <div className={styles.footerTitle}>{footerTitle}</div>
             <div className={styles.footerDate}>{footerDate}</div>
             </div>
          </div>
        </main>

        {/* RIGHT: Tones + Actions */}
        <aside className={styles.rightPanel}>
          <img
            src="/leaf3.png"
            alt=""
            width={180}
            height={280}
            className={styles.leaf}
          />
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
          <button
                  className={styles.boxButton}
                  onClick={async () => {
                    try {
                      // Check raw preroll JSON first (with fallbacks)
                      let parsed: string[][] = [];
                      try {
                        const raw = sessionStorage.getItem("luma_preroll_all");
                        parsed = raw ? JSON.parse(raw) : [];
                      } catch {}
                      // optional in-memory preroll fallback if you ever set it elsewhere
                      // @ts-ignore
                      if ((!parsed || !parsed.length) && Array.isArray(window.__LUMA_PREROLL__)) {
                        // @ts-ignore
                        parsed = window.__LUMA_PREROLL__;
                      }

                      const totalFrames = (parsed || []).reduce((n, g) => n + (g?.length || 0), 0);

                      // detect "live" session via flag (sessionStorage OR memory)
                      const isLive =
                        (() => { try { return !!sessionStorage.getItem("luma_live"); } catch { return false; } })() ||
                        // @ts-ignore
                        !!window.__LUMA_LIVE__;

                      // If NOT live at all (i.e., uploaded photos), block; otherwise allow even if preroll is missing
                      if (!isLive) {
                        alert(
                          "Sorry, the Video GIF option is only available for live camera sessions (not uploaded photos)."
                        );
                        return;
                      }

                      // only now load the images to build the video (will gracefully use stills if no preroll)
                      const groups = await loadPrerollFramesAll();

                      const blob = await buildPhotostripVideoWebM(
                        groups,
                        photos,
                        themeColor,
                        cssFilter,
                        tempOverlay,
                        tintOverlay,
                        { title: footerTitle, date: footerDate },
                          12, // fps 
                            3,  // segmentSeconds: use last 3s
                            4   // repetitions: loop 2x => ~6s total
                      );

                      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                      if (isIOS) {
                        alert(
                          "Heads up: iPhone Photos doesn’t support .webm.\n\nTap “Download”, then choose “Save to Files”. You can still share/play it from the Files app or a compatible player. MP4 support coming soon!"
                        );
                      }

                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "photostrip_preroll.webm";
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error(e);
                      alert("Could not build video.");
                    }
                  }}
                >
                  VIDEO GIF
                </button>

          {/* QR CODE */}
          <button
            className={styles.boxButton}
            onClick={handleCreateQR}
            disabled={!photos.length || creatingQR}
          >
            {creatingQR ? "Building QR..." : "QR CODE"}
          </button>

          <button className={styles.boxButton} onClick={handleDownload} disabled={!photos.length}>DOWNLOAD</button>

          {/* QR card */}
          {qrOpen && shareUrl && (
            <div
              style={{
                marginTop: 12,
                padding: 16,
                width: 240,
                background: "#fff",
                border: "1px solid #000",
                borderRadius: 14,
                textAlign: "center",
                boxShadow: "0 6px 16px rgba(0,0,0,.1)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>QR Code</div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
                Scan to view & download your photo strip.
              </div>

              <div
                style={{
                  display: "inline-block",
                  padding: 8,
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 6px 16px rgba(0,0,0,.12)",
                  marginBottom: 10,
                }}
              >
                <QRCodeCanvas value={shareUrl} size={180} />
              </div>
                <button
                  className={styles.boxButton}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setCopyOk(true);
                      setTimeout(() => setCopyOk(false), 1500);
                    } catch {}
                  }}
                  style={{ width: "100%", borderRadius: 999 }}
                >
                  {copyOk ? "Copied!" : "Copy Link"}
                </button>

              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                This link will expire in 10 minutes
              </div>

              <button
                className={styles.boxButton}
                onClick={() => setQrOpen(false)}
                style={{ width: "100%", marginTop: 8 }}
              >
                Close
              </button>
            </div>
          )}
  
          <img
            src="/pallete.png"
            alt=""
            width={200}
            height={200}
            className={styles.pallete}
          />
        </aside>
      </div>
    </div>
  );
}
