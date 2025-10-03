"use client";


// DOM (Document Object Model): is the browser's live, tree-like representation of
//                              your web page that JavaScript can read and change.
// Wrapper: A wrapper is something that surrounds other code or UI to add layout or behavior
// ===== Imports ===== (trying to understand these imports more)
import React, {
  useEffect,              // run code after component mounts
  useRef,                 // hold references to DOM nodes (video/canvas)
  useState,               // local state (list of photos)
  forwardRef,             // let the parent attach a ref to this component
  useImperativeHandle,    // choose what functions the parent can call
} from "react";
import styles from "./camera.module.css";


/** Filter keys */
export type FilterKey =
  | "none"
  | "goldenHour"
  | "nostalgia"
  | "frosted"
  | "leafyLight"
  | "sepiaSage"
  | "polaroidPop";

{/* what the parent can call in photobooth page */}
export type CameraHandle = {
  start3: () => Promise<string[]>;      // takes 4 photos, 3 secs apart, return photos
  start5: () => Promise<string[]>;      // same, 5s apart
  start10: () => Promise<string[]>;     // same, 10s apart
  cancel: () => void;
};

type Props = {
  filter: FilterKey;
};

// filters
const cssFor = (f: FilterKey): string => {
  switch (f) {
    case "goldenHour": 
      return "brightness(1.05) contrast(1.05) saturate(1.25) sepia(0.25) hue-rotate(10deg)";
    case "nostalgia":  
      return "sepia(0.85) contrast(0.95) brightness(1.05)";
    case "frosted":    
      return "brightness(1.1) contrast(0.9) saturate(0.8) hue-rotate(180deg)";
    case "leafyLight": 
      return "saturate(1.1) hue-rotate(60deg)";
    case "sepiaSage":  
      return "sepia(0.6) hue-rotate(25deg) saturate(1.1)";
    case "polaroidPop":
      return "contrast(1.2) brightness(1.05) saturate(1.25)";
    default:           
      return "none";
  }
};

{/* Components */}
const CameraCanvas = forwardRef<CameraHandle, Props>(({ filter }, ref) => {
  const [photos, setPhotos] = useState<string[]>([]);         // list of captured images (data URLs)
  const [count, setCount] = useState<number | null>(null); 
  const [flash, setFlash] = useState(false);
  
  
  const videoRef = useRef<HTMLVideoElement>(null);            // <video> DOM node
  const canvasRef = useRef<HTMLCanvasElement>(null);          // <canvas> DOM node
  const shutterRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef(false);

  // prepare shutter sounds
  useEffect(() => {
    shutterRef.current = new Audio("/shutter.mp3");
    shutterRef.current.preload = "auto"
  }, []);

  const runningRef = useRef(false);

  {/* Helper: Show numbers each second */}
  const doCountdown = async (seconds: number) => {
    for (let n = seconds; n >= 1; n--) {
      if (cancelRef.current)
        return false;
      setCount(n);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCount(null); // hide number right before snapping
    return true;
  };
  

  {/* Helper: take one photo and return a PNG data URL */}
  const takePhoto = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas)
      return null;

    // flash + click
    setFlash(true);
    shutterRef.current && (shutterRef.current.currentTime = 0);
    shutterRef.current?.play().catch(() => {});
    setTimeout(() => setFlash(false), 180);

    canvas.width = video.videoWidth || 1280;                // match canvas pixel size to video stream
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");                    // get drawing context and copy the current video frame into the canvas
    if (!ctx)
      return null;

    ctx.filter = cssFor(filter);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";

    const png = canvas.toDataURL("image/png");                  // canvas -> PNG string
    setPhotos((prev) => [...prev, png]);                        // save in list
    return png;
  };

    /** capture preroll frames during the countdown and stash in sessionStorage */
  async function capturePrerollFrames(
    videoEl: HTMLVideoElement,
    seconds = 3,
    fps = 8
  ): Promise<string[]> {
  if (!videoEl.videoWidth || !videoEl.videoHeight) {
    await new Promise<void>((resolve) => {
      const onReady = () => { videoEl.removeEventListener("loadedmetadata", onReady); resolve(); };
      videoEl.addEventListener("loadedmetadata", onReady, { once: true });
      if (videoEl.readyState >= 1) resolve();
    });
  }

  // smaller than the strip 
  const frame_w = 360;  
  const frame_h = 270;  
  const quality_jpeg = 0.6; 

  const canvas = document.createElement("canvas");
  canvas.width = frame_w;
  canvas.height = frame_h;
  const ctx = canvas.getContext("2d")!;

  const total = Math.max(1, Math.round(seconds * fps));
  const delay = 1000 / fps;

  // cap how many frames we keep per slot
  const MAX_KEEP = 16;
  const step = Math.max(1, Math.floor(total / MAX_KEEP));

  const frames: string[] = [];
  for (let i = 0; i < total; i++) {
    if (cancelRef.current) break;

    // mirror to match UI
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, -frame_w, 0, frame_w, frame_h);
    ctx.restore();

    if (i % step === 0) {
      frames.push(canvas.toDataURL("image/jpeg", quality_jpeg));
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delay));
  }
  return frames;
}

    /** Start Session - run a full session: capture preroll + 4 photos */
    const runSession = async (seconds: number): Promise<string[]> => {
      cancelRef.current = false;
      setPhotos([]); // clear old photos from UI
      const shots: string[] = [];
      const prerollAll: string[][] = []; // holds 4 arrays (one per shot)

      // clear any old preroll bundle
      sessionStorage.removeItem("luma_preroll_all");

      for (let i = 0; i < 4; i++) {
        const video = videoRef.current;

        // start capturing preroll DURING the countdown (no extra pause)
        const capPromise = video
          ? capturePrerollFrames(video, Math.min(seconds, 8), 8) // 8 fps, max 8s
          : Promise.resolve<string[]>([]);

        const ok = await doCountdown(seconds);
        if (!ok || cancelRef.current) break;

        // collect the preroll frames for this slot
        const frames = await capPromise;
        prerollAll.push(frames);

        // snap the still for this slot
        const png = takePhoto();
        if (png) shots.push(png);
      }

      // stash all 4 preroll sets for the photostrip page
      try {
        sessionStorage.setItem("luma_preroll_all", JSON.stringify(prerollAll));
        console.log("[preroll debug] saved lengths:", prerollAll.map(g => g.length));
      } catch {}

      return shots;
    };

    const start3 = () => runSession(3);
    const start5 = () => runSession(5);
    const start10 = () => runSession(10);

    const cancel = () => {
      cancelRef.current = true;
      setCount(null);
      setFlash(false);
  };

  
  // API to parent
  useImperativeHandle(ref, () => ({ start3, start5, start10, cancel }));

  {/* Camera Stream  - show live camera */}
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play?.();
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    })();
  }, []);


  {/* Camera Canvas */}
  return (
  <div className={styles.container}>
    {/* NEW: stage only for the camera area */}
    <div className={styles.stage}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={styles.video}
        style={{ transform: "scaleX(-1)", filter: cssFor(filter) }}
      />
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Countdown Number */}
      <div className={styles.overlay}>
        {count != null && <div className={styles.countText}>{count}</div>}
      </div>

      {/* Flash overlay */}
      <div className={`${styles.flashCover} ${flash ? styles.showFlash : ""}`} />
    </div>

    {/* Thumbnails of captured photos (sibling, not inside stage) */}
    <div className={styles.photoStrip}>
      {photos.map((p, i) => (
        <img key={i} src={p} alt={`Photo ${i + 1}`} className={styles.photo} />
      ))}
    </div>
  </div>
);

});

export default CameraCanvas;
