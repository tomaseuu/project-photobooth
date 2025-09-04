"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./photostrip.module.css";

export default function Page() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);

  // Load shots from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("luma_photos");
      setPhotos(raw ? JSON.parse(raw) : []);
    } catch {
      setPhotos([]);
    }
  }, []);

  // Always show exactly 4 slots
  const slots = useMemo<(string | null)[]>(
    () => Array.from({ length: 4 }, (_, i) => photos[i] ?? null),
    [photos]
  );

  // Actions
  const handleNew = () => {
    sessionStorage.removeItem("luma_photos");
    router.push("/photobooth");
  };
  const handleRedo = () => router.push("/photobooth");

  // Build a vertical photostrip PNG and download
  const handleDownload = async () => {
    if (!photos.length) return;

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

    const imgs = await Promise.all(photos.map(loadImage));

    const pad = 30;   // outer padding
    const gap = 20;   // space between photos
    const targetW = 600; // inner width

    const scaled = imgs.map((img) => {
      const scale = targetW / img.width;
      return { img, w: targetW, h: Math.round(img.height * scale) };
    });

    const innerH = scaled.reduce((acc, s) => acc + s.h, 0) + gap * (scaled.length - 1);
    const canvasW = targetW + pad * 2;
    const canvasH = innerH + pad * 2;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    let y = pad;
    scaled.forEach(({ img, w, h }) => {
      ctx.drawImage(img, pad, y, w, h);
      y += h + gap;
    });

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "photostrip.png";
    a.click();
  };

  return (
    <div className={styles.page}>
      <h1>LUMA LEAF</h1>

      <div className={styles.layout}>
        {/* LEFT: Palette + Themes */}
        <aside className={styles.leftPanel}>
          <p className={styles.smallTitle}>select your shade!</p>

          <div className={styles.paletteBox}>
            <h2>Palette</h2>
            <p>white</p>
            <p>blue</p>
            <p>green</p>
            <p>purple</p>
            <p>red</p>
            <p>black</p>
          </div>

          <p className={styles.smallTitle}>choose a sticker!</p>

          <div className={styles.paletteBox}>
            <h2>Themes</h2>
            <p>none</p>
            <p>cute</p>
            <p>leaf</p>
            <p>BTS</p>
            <p>TWICE</p>
            <p>Miffy</p>
          </div>
        </aside>

        {/* CENTER: Photostrip */}
        <main className={styles.centerPanel}>
          <div className={styles.strip}>
            {slots.map((src, i) => (
              <div key={i} className={styles.slot}>
                {src ? (
                  <img src={src} alt={`Photo ${i + 1}`} />
                ) : (
                  <div className={styles.placeholder} />
                )}
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT: Actions */}
        <aside className={styles.rightPanel}>
          <button className={styles.boxButton} onClick={handleNew}>NEW</button>
          <button className={styles.boxButton} onClick={handleRedo}>REDO</button>
          <button className={styles.boxButton} onClick={() => alert("Coming soon!")}>VIDEO GIF</button>
          <button className={styles.boxButton} onClick={() => alert("Coming soon!")}>QR CODE</button>
          <button
            className={styles.boxButton}
            onClick={handleDownload}
            disabled={!photos.length}
            title={!photos.length ? "No photos to download yet" : "Download photostrip"}
          >
            DOWNLOAD
          </button>
        </aside>
      </div>
    </div>
  );
}
