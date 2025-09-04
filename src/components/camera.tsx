"use client";


// DOM (Document Object Model): is the browser's live, tree-like representation of
//                              your web page that JavaScript can read and change.
// Wrapper: A wrapper is something that surrounds other code or UI to add layout or behavior.
// ===== Imports ===== (trying to understand these imports more)
import React, {
  useEffect,              // run code after component mounts
  useRef,                 // hold references to DOM nodes (video/canvas)
  useState,               // local state (list of photos)
  forwardRef,             // let the parent attach a ref to this component
  useImperativeHandle,    // choose what functions the parent can call
} from "react";
import styles from "./camera.module.css";

{/* Type: what the parent can call in photobooth page */}
export type CameraHandle = {
  start3: () => Promise<string[]>;      // takes 4 photos, 3 secs apart, return photos
  start5: () => Promise<string[]>;      // same, 5s apart
  start10: () => Promise<string[]>;     // same, 10s apart
  cancel: () => void;
  isRunning: () => boolean;
};


{/* Components */}
const CameraCanvas = forwardRef<CameraHandle>((_, ref) => {
  const [photos, setPhotos] = useState<string[]>([]);         // list of captured images (data URLs)
  const [count, setCount] = useState<number | null>(null); 
  const [flash, setFlash] = useState(false);
  
  
  const videoRef = useRef<HTMLVideoElement>(null);            // <video> DOM node
  const canvasRef = useRef<HTMLCanvasElement>(null);          // <canvas> DOM node
  const shutterRef = useRef<HTMLAudioElement | null>(null);

  // prepare shutter sounds
  useEffect(() => {
    shutterRef.current = new Audio("/shutter.mp3");
    shutterRef.current.preload = "auto"
  }, []);

  const runningRef = useRef(false);

  {/* Helper: Show numbers each second */}
  const doCountdown = async (seconds: number) => {
    for (let n = seconds; n >= 1; n--) {
      if (!runningRef.current)
        break;
      setCount(n);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCount(null); // hide number right before snapping
  };
  

  {/* Helper: take one photo and return a PNG data URL */}
  const takePhoto = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas)
      return null;

    setFlash(true);
    shutterRef.current && (shutterRef.current.currentTime = 0);
    shutterRef.current?.play().catch(() => {});
    setTimeout(() => setFlash(false), 180);

    canvas.width = video.videoWidth || 1280;                // match canvas pixel size to video stream
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");                    // get drawing context and copy the current video frame into the canvas
    if (!ctx)
      return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);    // copy current frame
    const png = canvas.toDataURL("image/png");                  // canvas -> PNG string
    setPhotos((prev) => [...prev, png]);                        // save in list
    return png;
  };

  {/* Start Session - run a full session: 4 photos, wait N seconds between each */}
  const runSession = async (seconds: number): Promise<string[]> => {
    if (runningRef.current)
      return[];
    runningRef.current = true;
    
    setPhotos([]);                                                // clear old photos from the UI
    const shots: string[] =[]; 
    
    try{
      for (let i = 0; i < 4; i++) {                                 
        await doCountdown(seconds);       // show 5... 4.... 3... 2... 1.. etc
        if(!runningRef.current)
          break;
        const png = takePhoto();          // then snap
        if(png) shots.push(png);
      }
      return shots;   
    } finally {
      runningRef.current = false;
      setCount(null);
      setFlash(false);
    }                                     
  };
  
  const cancel = () => {
    runningRef.current = false;
    setCount(null);
    setFlash(false);
  };
  
  // API to parent
  useImperativeHandle(ref, () => ({
    start3: () => runSession(3),
    start5: () => runSession(5),
    start10: () => runSession(10),
    cancel,
    isRunning: () => runningRef.current,
  }));

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
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className={styles.video} 
      />
      <canvas 
        ref={canvasRef} 
        className={styles.canvas} 
      />

      {/* Countdown Number */}
      <div className={styles.overlay}>
        {count != null && <div className={styles.countText}>{count}</div>}
      </div>

      {/* Flash overlay */}
      <div className={`${styles.flashCover} ${flash ? styles.showFlash : ""}`} />

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
