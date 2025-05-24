"use client";

import React from "react";
import { useEffect, useRef } from "react";
import styles from "./camera.module.css";

export default function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function getCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }

    getCamera();
  }, []);

  return (
    <div className={styles.container}>
      <video ref={videoRef} autoPlay playsInline className={styles.camera} />
    </div>
  );
}
