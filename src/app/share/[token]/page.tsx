// app/share/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./share.module.css";

export default function SharePage() {
  const { token } = useParams<{ token: string }>();


  // React state variables to track
  const [img, setImg] = useState<string | null>(null);                // photostrip image
  const [remaining, setRemaining] = useState<number | null>(null);    // how many seconds until link expires
  const [error, setError] = useState<string | null>(null);            // error message
  const [copyOk, setCopyOk] = useState(false);                        // whether "copy link" was successful

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";

// when page first loads, fetch image from API
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/strip/${token}`, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || "Link invalid or expired");
          return;
        }
        const j = await res.json();
        setImg(j.dataUrl);
        setRemaining(j.expiresInSeconds ?? null);
      } catch {
        setError("Network error");
      }
    })();
  }, [token]);

  // Handle "download" button -> create a hidden link and trigger a file download
  function handleDownload() {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img;
    a.download = "photostrip.png";
    a.click();
  }

  // Handle "copy link" button -> copy the share URL to the clipboard
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1500);
    } catch {}
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Your Photostrip!</h1>

        {error ? (
          <p className={styles.error}>{error}</p>
        ) : img ? (
          <>
            <p className={styles.lede}>Download your photo strip below.</p>
            <img src={img} alt="Photostrip" className={styles.image} />
            <button onClick={handleDownload} className={styles.primaryBtn}>
              Download Photostrip
            </button>
          </>
        ) : (
          <p className={styles.loading}>Loading…</p>
        )}

        <div className={styles.meta}>
          {remaining != null ? `This link will expire in ~${remaining}s` : "Link active"}
        </div>

        <div className={styles.actions}>
          <button onClick={handleCopy} className={styles.secondaryBtn}>
            {copyOk ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </main>
  );
}
