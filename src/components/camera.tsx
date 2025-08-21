"use client";

// ===== Imports ===== (trying to understand these imports more)
import React, {
  useEffect,              // after-render effect
  useRef,                 // refs to DOM / handles
  useState,               // local state
  forwardRef,             // allow parent ref
  useImperativeHandle,    // choose what parent can call
} from "react";
import styles from "./camera.module.css";

{/* Type: what the parent can call in photobooth page */}
export type CameraHandle = {
  startSession: () => Promise<void>;  
};

{/* Components */}
const CameraCanvas = forwardRef<CameraHandle>((_, ref) => {
  const [photos, setPhotos] = useState<string[]>([]);         // list of captured images (data URLs)
  const videoRef = useRef<HTMLVideoElement>(null);            // <video> DOM node
  const canvasRef = useRef<HTMLCanvasElement>(null);          // <canvas> DOM node

  {/* Helper: take one photo */}
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas)
      return;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (!ctx)
        return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);    // copy current frame
      const png = canvas.toDataURL("image/png");                  // canvas -> PNG string
      setPhotos((prev) => [...prev, png]);                        // save in list
  };
  
  {/* Start Session */}
  const startSession = async () => {
    setPhotos([]);                                                
    for (let i = 0; i < 4; i++) {                                 
      await new Promise((r) => setTimeout(r, 3000));              // wait 3 seconds for now and then capture ( FOR NOW )
      takePhoto();
    }
  };

  // API to parent
  useImperativeHandle(ref, () => ({ startSession }));
  {/* Camera Stream  - show live camera*/}
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    })();
  }, []);


  {/* Camera Canvas */}
  return (
    <div className={styles.container}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className={styles.video} 
      />
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Thumbnails of captured photos */}
      <div className={styles.photoStrip}>
        {photos.map((p, i) => (
          <img key={i} src={p} alt={`Photo ${i + 1}`} className={styles.photo} />
        ))}
      </div>
    </div>
  );
});

export default CameraCanvas;
