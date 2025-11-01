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

const OUTER = 30;
const GAP = 20;
const PW = 600;   // photo width
const PH = 450;   // photo height
const FOOT = 120;

const CANVAS_W = PW + OUTER * 2;
const CANVAS_H = OUTER * 2 + 4 * PH + 3 * GAP + FOOT;

declare global {
  interface Window { 
    __LUMA_PHOTOS__?: string[];
    __LUMA_LIVE__?: boolean;       
    __LUMA_PREROLL__?: string[][]; 
  }
}
function safeSetSession(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch {}
}
function safeRemoveSession(key: string) {
  try { sessionStorage.removeItem(key); } catch {}
}

/* simple color presets the user can click */

const PRESETS = [       
  { name: "white",  hex: "#ffffff" },
  { name: "blue",   hex: "#bcd6ff" },
  { name: "green",  hex: "#c9ffc9" },
  { name: "purple", hex: "#e8c9ff" },
  { name: "red",    hex: "#ffb3b3" },
  { name: "black",  hex: "#2b2b2b" },
];

/* default setting for the strip and tones */
const DEFAULTS = {
  themeColor: "#ffffff",
  customColor: "#ffffff",
  tone: { saturation: 100, brightness: 100, contrast: 100, temperature: 100, tint: 100 },
};

type Sticker = {
  flip?: boolean; 
  src: string;
  left: number;   
  top: number;   
  width: number;  
  rot?: number;   
  opacity?: number;
};

const STICKER_SCALE = 1.4;

type StickerTheme = {
  themeColor: string;
  stickers: Sticker[];
};

const THEMES: Record<string, StickerTheme> = {
  none: { themeColor: "#ffffff", stickers: [] },
  leaf: {
    themeColor: "#ffffff",
    stickers: [
      { src: "/stickers/leaf-3.png", left: 8, top: 3,  width: 20, rot: -8 }, 
      { src: "/stickers/leaf-4.png", left: 7, top: 20,  width: 16, rot: 170, flip: true},  
      { src: "/stickers/leaf-6.png", left: 88, top: 0.5,  width: 18, rot: 90, flip: true },
      { src: "/stickers/leaf-1.png", left: 55, top: 3, width: 10, rot: 110 },
      { src: "/stickers/leaf-5.png", left: 30, top: 0, width: 12, rot: -50, flip: true }, 
      { src: "/stickers/leaf-1.png", left: 92, top: 18, width: 20, rot: 230 },
      { src: "/stickers/leaf-3.png", left: 10, top: 27, width: 16, rot: -22 }, 
      { src: "/stickers/leaf-3.png", left: 91, top: 44.8, width: 16, rot: 40 },        
      { src: "/stickers/leaf-2.png", left: 10, top: 42.4, width: 18, rot: -70 }, 
      { src: "/stickers/leaf-2.png", left: 90, top: 28.3, width: 18, rot: 100 },  
      { src: "/stickers/leaf-3.png", left: 5.5, top: 58, width: 10, rot: 160 },         
      { src: "/stickers/leaf-6.png", left: 30, top: 50, width: 10, rot: -120, flip: true },  
      { src: "/stickers/leaf-1.png", left: 92.3, top: 55, width: 18, rot: -50, flip: true }, 
      { src: "/stickers/leaf-5.png", left: 96, top: 67, width: 12, rot: -5 }, 
      { src: "/stickers/leaf-1.png", left: 9, top: 73.6, width: 16, rot: -20}, 
      { src: "/stickers/leaf-3.png", left: 95, top: 77, width: 18, rot: 0, flip: true },           
      { src: "/stickers/leaf-6.png", left: 70, top: 72.2, width: 10, rot: -15 }, 
      { src: "/stickers/leaf-6.png", left: 76, top: 97, width: 8, rot: 170 }, 
      { src: "/stickers/leaf-4.png", left: 6, top: 91.6, width: 20, rot: 10, flip: true },
      { src: "/stickers/leaf-3.png", left: 48, top: 94.5, width: 8, rot: 220, flip: true }, 
      { src: "/stickers/leaf-5.png", left: 16,  top: 98.4, width: 13, rot: 1, flip: true },  
      { src: "/stickers/leaf-5.png", left: 97,  top: 95, width: 8, rot: 14 },  
      { src: "/stickers/leaf-6.png", left: 88.9, top: 93, width: 22, rot: -2, flip: true }, 
      { src: "/stickers/leaf-4.png", left: 94, top: 99, width: 15, rot: 4 },  
      { src: "/stickers/leaf-6.png", left: 4, top: 98, width: 15, rot: 3, flip: true },  
    ],
  },
  cute: {
    themeColor: "#dccffbff",
    stickers: [ 
      { src: "/stickers/cute-8.png", left: 20, top: 3,  width: 14, rot: -18 },  
      { src: "/stickers/cute-7.png", left: 91, top: 3,  width: 14, rot: 0 },     
      { src: "/stickers/cute-6.png", left: 6,  top: 14, width: 16, rot: -6, flip: true},  
      { src: "/stickers/cute-1.png", left: 5,  top: 23, width: 8,  rot: 12 },
      { src: "/stickers/cute-6.png", left: 90,  top: 24, width: 20, rot: 0},  
      { src: "/stickers/cute-2.png", left: 10, top: 35, width: 12, rot: 15 },   
      { src: "/stickers/cute-1.png", left: 94,  top: 45, width: 8,  rot: 30 },
      { src: "/stickers/cute-9.png", left: 30, top: 47.6, width: 15, rot: -23 },  
      { src: "/stickers/cute-8.png", left: 92, top: 54, width: 14, rot: 70 },    
      { src: "/stickers/cute-7.png", left: 3, top: 62,  width: 15, rot: 0 },  
      { src: "/stickers/cute-5.png", left: 9,  top: 93, width: 23, rot: 0 },     
      { src: "/stickers/cute-1.png", left: 22, top: 71, width: 8, rot: -15 }, 
      { src: "/stickers/cute-3.png", left: 95, top: 76, width: 12, rot: 0 }, 
      { src: "/stickers/cute-4.png", left: 8,  top: 99, width: 20, rot: 0 },    
      { src: "/stickers/cute-7.png", left: 94, top: 98, width: 20, rot: 0 },   
      { src: "/stickers/cute-1.png", left: 94, top: 92.7, width: 10, rot: 13 },    
    ],
  },
  kpopdemonhunters: {
    themeColor: "#323978",
    stickers: [
      { src: "/stickers/kdh-13.png", left: 1,  top: 1.5, width: 2, rot: 0 },   
      { src: "/stickers/kdh-14.png", left: 13, top: 0.4, width: 1.5, rot: 0 },  
      { src: "/stickers/kdh-15.png", left: 26, top: 0.7, width: 2.2, rot: 0 },  
      { src: "/stickers/kdh-16.png", left: 40, top: 0.8, width: 1.4, rot: 0 },  
      { src: "/stickers/kdh-17.png", left: 62, top: 0.3, width: 3, rot: 0 },  
      { src: "/stickers/kdh-18.png", left: 78, top: 0.8, width: 1.7, rot: 0 },  
      { src: "/stickers/kdh-19.png", left: 98.3, top: 0.5, width: 3, rot: 0 }, 
      { src: "/stickers/kdh-7.png", left: 50, top: 5,  width: 40, rot: 0 },
      { src: "/stickers/kdh-6.png", left: 50, top: 23, width: 42, rot: 0 },
      { src: "/stickers/kdh-4.png", left: 8, top: 27, width: 18, rot: -14 },
      { src: "/stickers/kdh-5.png", left: 94.5, top: 43.2, width: 18, rot: 14 },
      { src: "/stickers/kdh-9.png", left: 13, top: 50, width: 18, rot: 10},
      { src: "/stickers/kdh-8.png", left: 88.5, top: 50, width: 18, rot: -15 },
      { src: "/stickers/kdh-10.png", left: 10, top: 67.6, width: 18, rot: -10 },
      { src: "/stickers/kdh-1.png",  left: 90, top: 68, width: 18, rot: 11 },
      { src: "/stickers/kdh-3.png", left: 15,  top: 89.6, width: 34},
      { src: "/stickers/kdh-2.png", left: 92, top: 90, width: 22},
      { src: "/stickers/kdh-12.png", left: 50, top: 94, width: 5, rot: 0 },
      { src: "/stickers/kdh-11.png", left: 10, top: 95, width: 3, rot: 0 },
      { src: "/stickers/kdh-18.png", left: 20, top: 97, width: 3, rot: 0 },
      { src: "/stickers/kdh-20.png", left: 5, top: 98, width: 9, rot: 0 },
      { src: "/stickers/kdh-21.png", left: 94, top: 98, width: 9, rot: 0 },
      { src: "/stickers/kdh-22.png", left: 30, top: 95, width: 3, rot: 0 },
      { src: "/stickers/kdh-23.png", left: 30, top: 99.2, width: 6, rot: 0 },
      { src: "/stickers/kdh-11.png", left: 99.5, top: 93.6, width: 3, rot: 0 },
      { src: "/stickers/kdh-11.png", left: 82, top: 97, width: 5, rot: 0 },
      { src: "/stickers/kdh-24.png", left: 75, top: 98.7, width: 3, rot: 0 },
      { src: "/stickers/kdh-25.png", left: 70, top: 95, width: 3, rot: 0 },
      { src: "/stickers/kdh-26.png", left: 65, top: 93.9, width: 4, rot: 0 },
    ],
  },
};


/* Component */

export default function Page() {
  /* Placeholders - do not break anything else */
  const defaultFilter = "none";
  const defaultTones = { brightness: 100, contrast: 100, saturation: 100 };
  const defaultPalette = "#ffffff";
  const defaultPhotos: string[] = [];
  const defaultStickers: string[] = [];

  /* State */
  const [filter, setFilter] = useState(defaultFilter);
  const [tones, setTones] = useState(defaultTones);
  const [palette, setPalette] = useState(defaultPalette);
  const [photos, setPhotos] = useState(defaultPhotos);
  const [themeColor, setThemeColor] = useState(DEFAULTS.themeColor);
  const [customColor, setCustomColor] = useState(DEFAULTS.customColor);
  const [tone, setTone] = useState(DEFAULTS.tone);
  const [showHint, setShowHint] = useState(true);
  const [footerTitle, setFooterTitle] = useState("LUMA LEAF");
  const [footerDate, setFooterDate] = useState(new Date().toLocaleDateString());
  const [copyOk, setCopyOk] = useState(false);

  // QR share UI state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [creatingQR, setCreatingQR] = useState(false);

  /* Refs / Router */
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  /* clear helper */
  function clearStripSession() {
    [
      "luma_photos",
      "luma_photos_original",
      "luma_preroll_all",
      "luma_live",
      "luma_theme",
      "luma_custom",
      "luma_tone",
      "luma_stickers_theme",
    ].forEach((k) => safeRemoveSession(k));
  }

  /* clear when leaving this page (SPA nav or real unload) */
  useEffect(() => {
    const onPageHide = () => clearStripSession();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      clearStripSession();
    };
  }, []);

  /* show a reload/close confirmation IF there are photos */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      let hasData = photos.length > 0;
      if (!hasData) {
        try { hasData = !!sessionStorage.getItem("luma_photos"); } catch {}
      }
      if (hasData) {
        e.preventDefault();
        e.returnValue = "Reloading will remove your photos.";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [photos]);

  /* Effects */

  // load photos + theme/custom/tone; snapshot original once
  useEffect(() => {
    // --- PHOTOS ---
    try {
      const raw = sessionStorage.getItem("luma_photos");
      let list: string[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {
          sessionStorage.removeItem("luma_photos");
        }
      }
      if (!list.length && Array.isArray(window.__LUMA_PHOTOS__) && window.__LUMA_PHOTOS__.length) {
        list = window.__LUMA_PHOTOS__;
        safeSetSession("luma_photos", JSON.stringify(list));
      }

      // 🔸 NEW: if there are no photos, redirect to /photobooth
      if (!list.length) {
        // also ensure we don't leave any stale settings around
        clearStripSession();
        router.replace("/photobooth");
        return; // stop initializing this page
      }

      setPhotos(list);

      // snapshot original once
      const hasOriginal = sessionStorage.getItem("luma_photos_original");
      if (!hasOriginal && list.length) {
        safeSetSession("luma_photos_original", JSON.stringify(list));
      }
    } catch (e) {
      console.warn("[photostrip] failed to load photos:", e);
      setPhotos([]);
      clearStripSession();
      router.replace("/photobooth");
      return;
    }

    // --- LIVE FLAG ---
    try {
      if (window.__LUMA_LIVE__) safeSetSession("luma_live", "1");
    } catch {}

    // --- PREROLL ---
    try {
      const prerollRaw = sessionStorage.getItem("luma_preroll_all");
      if (!prerollRaw && Array.isArray(window.__LUMA_PREROLL__) && window.__LUMA_PREROLL__.length) {
        safeSetSession("luma_preroll_all", JSON.stringify(window.__LUMA_PREROLL__));
      } else if (prerollRaw) {
        try { JSON.parse(prerollRaw); } catch { sessionStorage.removeItem("luma_preroll_all"); }
      }
    } catch {}

    // --- THEME / CUSTOM / TONE ---
    try { const t = sessionStorage.getItem("luma_theme"); if (t) setThemeColor(t); } catch {}
    try { const c = sessionStorage.getItem("luma_custom"); if (c) setCustomColor(c); } catch {}
    try {
      const toneRaw = sessionStorage.getItem("luma_tone");
      if (toneRaw) { try { setTone(JSON.parse(toneRaw)); } catch {} }
    } catch {}
  }, [router]);

  const [stickerTheme, setStickerTheme] = useState<keyof typeof THEMES>("none");

  useEffect(() => {
    try { sessionStorage.setItem("luma_stickers_theme", "none"); } catch {}
  }, []);

  // theme/custom/tone - persist
  useEffect(() => { safeSetSession("luma_theme", themeColor); }, [themeColor]);
  useEffect(() => { safeSetSession("luma_custom", customColor); }, [customColor]);
  useEffect(() => { safeSetSession("luma_tone", JSON.stringify(tone)); }, [tone]);
  useEffect(() => {
    try { sessionStorage.setItem("luma_stickers_theme", stickerTheme); } catch {}
  }, [stickerTheme]);

  /* helpers */

  function applyStickerTheme(key: keyof typeof THEMES) {
    setStickerTheme(key);
    const next = THEMES[key]?.themeColor;
    if (next) {
      setThemeColor(next);
      setCustomColor(next);
      safeSetSession("luma_theme", next);
      safeSetSession("luma_custom", next);
    }
  }

  /* Memos */

  const slots: (string | null)[] = [
    photos[0] ?? null,
    photos[1] ?? null,
    photos[2] ?? null,
    photos[3] ?? null,
  ];

  function norm(p: number) {
    return Math.max(-1, Math.min(1, (p - 100) / 100));
  }

  const t = norm(tone.temperature);
  const tempOverlay =
    t === 0
      ? { color: "rgba(0,0,0,0)", alpha: 0 }
      : {
          color: t > 0 ? "rgba(255,140,0,1)" : "rgba(0,120,255,1)",
          alpha: Math.min(0.35, Math.abs(t) * 0.35),
        };

  const tt = norm(tone.tint);
  const tintOverlay =
    tt === 0
      ? { color: "rgba(0,0,0,0)", alpha: 0 }
      : {
          color: tt > 0 ? "rgba(255,0,170,1)" : "rgba(0,255,170,1)",
          alpha: Math.min(0.25, Math.abs(tt) * 0.25),
        };

  const cssFilter = `saturate(${tone.saturation}%) brightness(${tone.brightness}%) contrast(${tone.contrast}%)`;
  
  // preroll loader
  async function loadPrerollFramesAll(): Promise<HTMLImageElement[][]> {
    try {
      const raw = sessionStorage.getItem("luma_preroll_all");
      if (!raw) return [];
      const groups: string[][] = JSON.parse(raw);
      const load = (src: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const imagesGroups = await Promise.all(groups.map((arr) => Promise.all(arr.map(load))));
      return imagesGroups;
    } catch {
      return [];
    }
  }
  
  /* VIDEO GIF */
  async function buildPhotostripVideoWebM(
    prerollGroups: HTMLImageElement[][],
    photosList: string[],
    bgColor: string,
    filterStr: string,
    temp: { color: string; alpha: number },
    tint: { color: string; alpha: number },
    footer: { title: string; date: string },
    fps = 12,
    segmentSeconds = 3,
    repetitions = 2
  ): Promise<Blob> {
    const outer_pad = 30;
    const photo_gap = 20;
    const photo_width = 600;
    const photo_height = 450;
    const footer_height= 120;

    const canvasW = photo_width + outer_pad * 2;
    const canvasH = outer_pad * 2 + 4 * photo_height + 3 * photo_gap + footer_height;

    if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
      throw new Error("Video export not supported in this browser.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

    const slotImgs = await Promise.all(
      Array.from({ length: 4 }, (_, i) => (photosList[i] ? loadImage(photosList[i]) : null))
    );

    const stickerSet = THEMES[stickerTheme].stickers;
    const stickerImgs = await Promise.all(
      stickerSet.map(
        (s) =>
          new Promise<HTMLImageElement | null>((res) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => res(null);
            img.src = s.src;
          })
      )
    );
    const drawStickersFast = () => {
      for (let i = 0; i < stickerSet.length; i++) {
        const s = stickerSet[i];
        const img = stickerImgs[i];
        if (!img) continue;
        const x = (s.left / 100) * canvasW;
        const y = (s.top / 100) * canvasH;
        const w = ((s.width * STICKER_SCALE) / 100) * canvasW;
        const scale = w / img.width;
        const h = img.height * scale;

        ctx.save();
        ctx.globalAlpha = s.opacity ?? 1;
        ctx.translate(x, y);
        ctx.rotate(((s.rot ?? 0) * Math.PI) / 180);
        if (s.flip) ctx.scale(-1, 1); 
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    };

    const stream = canvas.captureStream(fps);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm;codecs=vp8";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_000_000 });
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

    const applyOverlaysAndFooter = () => {
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

    const y = [
      outer_pad, 
      outer_pad + photo_height + photo_gap, 
      outer_pad + 2 * (photo_height + photo_gap), 
      outer_pad + 3 * (photo_height + photo_gap)
    ];

    const segFrames = Math.max(1, Math.round(segmentSeconds * fps));

    const rawSegments = prerollGroups.map((group) => {
      const g = group || [];
      if (g.length === 0) return [] as HTMLImageElement[];
      const start = Math.max(0, g.length - segFrames);
      return g.slice(start); 
    });

    const normalizedSegments = rawSegments.map((seg) => {
      if (seg.length === 0) return seg;
      if (seg.length === segFrames) return seg;
      const out: HTMLImageElement[] = new Array(segFrames);
      for (let i = 0; i < segFrames; i++) out[i] = seg[i % seg.length];
      return out;
    });

    const totalOutFrames = repetitions * segFrames;
    const frameDelay = 1000 / fps;

    for (let i = 0; i < totalOutFrames; i++) {
      const idx = i % segFrames;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.filter = filterStr;

      for (let s = 0; s < 4; s++) {
        const seg = normalizedSegments[s];
        const img = seg.length ? seg[idx] : slotImgs[s]; 
        drawSlot(img ?? null, y[s]);
      }

      applyOverlaysAndFooter();
      drawStickersFast();
      await new Promise((r) => setTimeout(r, frameDelay));
    }

    rec.stop();
    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });
    return blob;
  }

  async function drawStickersOnCtx(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    stickers: Sticker[]
  ) {
    if (!stickers.length) return;

    const load = (src: string) => new Promise<HTMLImageElement | null>((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });

    const imgs = await Promise.all(stickers.map((s) => load(s.src)));

    stickers.forEach((s, i) => {
      const img = imgs[i];
      if (!img) return;
      const x = (s.left / 100) * canvasW;
      const y = (s.top / 100) * canvasH;
      const w = ((s.width * STICKER_SCALE) / 100) * canvasW;
      const scale = w / img.width;
      const h = img.height * scale;

      ctx.save();
      ctx.globalAlpha = s.opacity ?? 1;
      ctx.translate(x, y);
      ctx.rotate(((s.rot ?? 0) * Math.PI) / 180);
      if (s.flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  function isDark(hex: string) {
    const h = hex.toLowerCase();
    return h === "#000000" || h === "#000" || h === "#2b2b2b" || h === "#323978";
  }

  async function buildPhotostripPng(
    photosList: string[],
    bgColor: string,
    filterStr: string,
    temp: { color: string; alpha: number },
    tint: { color: string; alpha: number },
    footer: { title: string; date: string },
    format: "png" | "jpeg" = "png",
    quality = 0.9
  ) {
    if (!photosList.length) throw new Error("No photos");

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    const imgs = await Promise.all(photosList.map(loadImage));

    const outer_pad = 30;
    const photo_gap = 20;
    const photo_width = 600;
    const photo_height = 450;
    const targetAspect = photo_width / photo_height;

    const count = imgs.length;
    const footer_height = 120;
    const canvasW = photo_width + outer_pad * 2;
    const canvasH = outer_pad * 2 + count * photo_height + (count - 1) * photo_gap + footer_height;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.filter = filterStr;

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

    ctx.filter = "none";
    const FOOTER_H = footer_height;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, canvasH - FOOTER_H, canvasW, FOOTER_H);

    await drawStickersOnCtx(ctx, canvasW, canvasH, THEMES[stickerTheme].stickers);

    const textColor = isDark(bgColor) ? "#fff" : "#000";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = '700 36px "Times New Roman", Times, serif';
    ctx.fillText(footer.title, canvasW / 2, canvasH - FOOTER_H / 2 - 10);

    ctx.font = '400 18px Arial, Helvetica, sans-serif';
    ctx.fillText(footer.date, canvasW / 2, canvasH - FOOTER_H / 2 + 24);
    
    if (format === "jpeg") {
      return canvas.toDataURL("image/jpeg", quality);
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
    } catch {}
  }

  /* Handlers */

  const handleNew = () => {
    clearStripSession();
    router.push("/photobooth");
  };

  const handleRedo = () => {
    setThemeColor(DEFAULTS.themeColor);
    setCustomColor(DEFAULTS.customColor);
    setTone(DEFAULTS.tone);
    safeSetSession("luma_theme", DEFAULTS.themeColor);
    safeSetSession("luma_custom", DEFAULTS.customColor);
    safeSetSession("luma_tone", JSON.stringify(DEFAULTS.tone));

    setFilter("none");
    setTones({ brightness: 100, contrast: 100, saturation: 100 });
    setPalette("#ffffff");

    setStickerTheme("none");
    try { sessionStorage.setItem("luma_stickers_theme", "none"); } catch {}

    restoreOriginalOrderSafely();
    setShowHint(true);
  };

  const handleDownload = async () => {
    if (!photos.length) return;
    try {
      const url = await buildPhotostripPng(
        photos, 
        themeColor, 
        cssFilter, 
        tempOverlay, 
        tintOverlay,
        { title: footerTitle, date: footerDate },
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

  const handleCreateQR = async () => {
    if (!photos.length) return;
    try {
      setCreatingQR(true);
      const dataUrl = await buildPhotostripPng(
        photos,
        themeColor,
        cssFilter,
        tempOverlay,
        tintOverlay,
        { title: footerTitle, date: footerDate },
        "jpeg",
        0.85
      );

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

  const openCustomPicker = () => {
    const el = colorInputRef.current;
    // @ts-ignore
    if (el?.showPicker) el.showPicker(); else el?.click();
  };

  /* Drag and Drop */

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

    setPhotos((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(i, 0, moved);
      safeSetSession("luma_photos", JSON.stringify(arr));
      return arr;
    });
  };

  const handleDragEnd = () => {
    dragFrom.current = null;
    setOverIdx(null);
  };

  const footerTextColor = isDark(themeColor) ? "#fff" : "#000";
  const videoGifDisabled = photos.length === 0;

  /* Render */

  return (
    <div data-page="photostrip" className={styles.page}>
      <h1>LUMA LEAF</h1>
      <p className={styles.dimensionsNote}>
        *preview dimensions may differ slightly from final download
      </p>

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

          <p className={styles.smallTitle}>(COMING SOON!)</p>
          <div className={styles.box}>
            <h2>Stickers</h2>

            <div className={styles.stickerList} role="list">
              {(["none", "leaf"] as (keyof typeof THEMES)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="listitem"
                  className={`${styles.stickerItem} ${stickerTheme === key ? styles.stickerItemActive : ""}`}
                  onClick={() => applyStickerTheme(key)}
                  aria-pressed={stickerTheme === key}
                >
                  {key === "none" ? "none" : "leaf"}
                </button>
              ))}
              {(["cute"] as (keyof typeof THEMES)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="listitem"
                  className={`${styles.stickerItem} ${stickerTheme === key ? styles.stickerItemActive : ""}`}
                  onClick={() => applyStickerTheme(key)}
                  aria-pressed={stickerTheme === key}
                >
                  {key === "none" ? "none" : "cute"}
                </button>
              ))}
              {(["kpopdemonhunters"] as (keyof typeof THEMES)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="listitem"
                  className={`${styles.stickerItem} ${stickerTheme === key ? styles.stickerItemActive : ""}`}
                  onClick={() => applyStickerTheme(key)}
                  aria-pressed={stickerTheme === key}
                >
                  {key === "none" ? "none" : "kpop demon hunters"}
                </button>
              ))}
            </div>
          </div>

          <img src="/paintbottles.png" alt="" width={250} height={250} className={styles.paintbottles} />
        </aside>
        
        {/* CENTER: Strip */}
        <main className={styles.centerPanel}>
          <div
            className={styles.previewShell}
            style={{ ["--cw" as any]: `${CANVAS_W}px`, ["--ch" as any]: `${CANVAS_H}px`, ["--scale" as any]: 0.45 }}
          >
            <div
              className={styles.strip}
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                ["--outer" as any]: `${OUTER}px`,
                ["--foot" as any]: `${FOOT}px`,
                ["--theme-color" as any]: themeColor,
                ["--border-color" as any]: "#58611F", 
              }}
            >
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
                    {src ? <img src={src} alt={`Photo ${i + 1}`} /> : <div className={styles.placeholder} />}

                    {tempOverlay.alpha > 0 && (
                      <div className={styles.overlay} style={{ background: tempOverlay.color, opacity: tempOverlay.alpha }} />
                    )}

                    {tintOverlay.alpha > 0 && (
                      <div className={styles.overlay} style={{ background: tintOverlay.color, opacity: tintOverlay.alpha }} />
                    )}
                  </div>
                </div>
              ))}

              {THEMES[stickerTheme].stickers.map((s, i) => (
                <img
                  key={i}
                  src={s.src}
                  alt=""
                  className={styles.sticker}
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    width: `${s.width * STICKER_SCALE}%`,
                    opacity: s.opacity ?? 1,
                    transform: `translate(-50%, -50%) rotate(${s.rot ?? 0}deg) ${s.flip ? "scaleX(-1)" : ""}`,
                  }}
                />
              ))}

              <div className={styles.footerBox} style={{ color: footerTextColor }}>
                <div className={styles.footerTitle}>{footerTitle}</div>
                <div className={styles.footerDate}>{footerDate}</div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT: Tones + Actions */}
        <aside className={styles.rightPanel}>
          <img src="/leaf3.png" alt="" width={180} height={280} className={styles.leaf} />
          <div className={styles.box}>
            <h2>Tones</h2>

            <div className={styles.toneBlock}>
              <div className={styles.toneLabel}>Saturation</div>
              <input type="range" min={0} max={200} value={tone.saturation} onChange={(e) => setTone({ ...tone, saturation: +e.target.value })} />
              <div className={styles.toneValue}>{tone.saturation}%</div>
            </div>

            <div className={styles.toneBlock}>
              <div className={styles.toneLabel}>Brightness</div>
              <input type="range" min={0} max={200} value={tone.brightness} onChange={(e) => setTone({ ...tone, brightness: +e.target.value })} />
              <div className={styles.toneValue}>{tone.brightness}%</div>
            </div>

            <div className={styles.toneBlock}>
              <div className={styles.toneLabel}>Contrast</div>
              <input type="range" min={0} max={200} value={tone.contrast} onChange={(e) => setTone({ ...tone, contrast: +e.target.value })} />
              <div className={styles.toneValue}>{tone.contrast}%</div>
            </div>

            <div className={styles.toneBlock}>
              <div className={styles.toneLabel}>Temperature</div>
              <input type="range" min={0} max={200} value={tone.temperature} onChange={(e) => setTone({ ...tone, temperature: +e.target.value })} />
              <div className={styles.toneValue}>{tone.temperature}%</div>
            </div>

            <div className={styles.toneBlock}>
              <div className={styles.toneLabel}>Tint</div>
              <input type="range" min={0} max={200} value={tone.tint} onChange={(e) => setTone({ ...tone, tint: +e.target.value })} />
              <div className={styles.toneValue}>{tone.tint}%</div>
            </div>
          </div>
          
          <button className={styles.boxButton} onClick={handleNew}>NEW</button>
          <button className={styles.boxButton} onClick={handleRedo}>RESET ALL</button>
          <button
            className={styles.boxButton}
            disabled={videoGifDisabled}
            title={videoGifDisabled ? "Add photos to enable video" : undefined}
            onClick={async () => {
              try {
                let parsed: string[][] = [];
                try {
                  const raw = sessionStorage.getItem("luma_preroll_all");
                  parsed = raw ? JSON.parse(raw) : [];
                } catch {}
                // @ts-ignore
                if ((!parsed || !parsed.length) && Array.isArray(window.__LUMA_PREROLL__)) {
                  // @ts-ignore
                  parsed = window.__LUMA_PREROLL__;
                }

                const isLive =
                  (() => { try { return !!sessionStorage.getItem("luma_live"); } catch { return false; } })() ||
                  // @ts-ignore
                  !!window.__LUMA_LIVE__;

                if (!isLive) {
                  alert("Sorry, the Video GIF option is only available for live camera sessions (not uploaded photos).");
                  return;
                }

                const groups = await loadPrerollFramesAll();

                const blob = await buildPhotostripVideoWebM(
                  groups,
                  photos,
                  themeColor,
                  cssFilter,
                  tempOverlay,
                  tintOverlay,
                  { title: footerTitle, date: footerDate },
                  12,
                  3,
                  4
                );

                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (isIOS) {
                  alert("Heads up: iPhone Photos doesn’t support .webm.\n\nTap “Download”, then choose “Save to Files”. You can still share/play it from the Files app or a compatible player. MP4 support coming soon!");
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
              className={styles.qrCard} 
              style={{
                marginTop: 12,
                padding: 16,
                width: 240,
                background: "#f9f9f9",
                border: "1px solid #58611F",
                borderRadius: 14,
                textAlign: "center",
                boxShadow: "0 6px 16px rgba(0,0,0,.1)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>QR Code</div>
              <div style={{ fontSize: 13, color: "#58611F", marginBottom: 10 }}>
                Scan to view & download your photo strip.
              </div>

              <div
                style={{
                  display: "inline-block",
                  padding: 8,
                  background: "#f9f9f9",
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
                style={{ width: "100%", borderRadius: 12 }}
              >
                {copyOk ? "Copied!" : "Copy Link"}
              </button>

              <div style={{ fontSize: 12, color: "#58611F", marginTop: 8 }}>
                This link will expire in 10 minutes
              </div>

              <button
                className={styles.boxButton}
                onClick={() => setQrOpen(false)}
                style={{ width: "100%", marginTop: 8, borderRadius: 12 }}
              >
                Close
              </button>
            </div>
          )}
  
          <img src="/pallete.png" alt="" width={200} height={200} className={styles.pallete} />
        </aside>
      </div>
    </div>
  );
}
