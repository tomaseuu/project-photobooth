"use client";

import styles from "./photobooth.module.css";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCanvas, { CameraHandle } from "../../components/camera";

export default function Page() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);     // ref to the hidden <input type ="file"
  const cameraRef = useRef<CameraHandle>(null);                   // ref to the camera child


  const [countdown, setCountdown] = useState<string>("");
  const [running, setRunning] = useState(false);

  
  const handleButtonClick = () => fileInputRef.current?.click();  // open file picker by clicking hidden input


  // helper to get a data URL for each file
  const fileToDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
  });

  // when a file is chosen, grab the first one
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length !== 4) {
      alert("Please select exactly 4 photos.");
      event.target.value = "";          // reset so user can re-pick the same files
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(fileToDataURL));
      sessionStorage.setItem("luma_photos", JSON.stringify(dataUrls));
      router.push("/photostrip");       // go build the strip
    } catch (e) {
      console.error(e);
      alert("Couldn't read one of the files. Please try again.");
    } finally {
      event.target.value = "";          // clean up input
    }
  };

  const handleStart = async () => {
    if (!countdown) {
      alert("Please select a countdown first.");
      return;
    }
    const api = cameraRef.current;
    if(!api) 
      return;
    
    setRunning(true);
    let shots: string[] =[];
    try{
      shots = countdown === "5" ? await api.start5() 
            :countdown === "10" ? await api.start10() 
            :await api.start3();
    } finally {
      setRunning(false);
    }
    if (shots.length === 4) {
      sessionStorage.setItem("luma_photos", JSON.stringify(shots));
      router.push("/photostrip");
    }
  };

  const handleCancel = () => {
    cameraRef.current?.cancel();
    setRunning(false);
  };


  return (
    
    <div className={styles.page}>
       {/* Tile Page */}
      <h1>LUMA LEAF</h1>

      <div className={styles.content}>
        {/* Top Controls */}
        <div className={styles.topBar}>
          <div className={styles.leftGroup}>
            <button className={styles.boxButton} disabled={running}>Camera</button>
            <button className={styles.boxButton} onClick={handleButtonClick} disabled={running}>
              Upload Images
            </button>
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          {/* Select Countdown Dropdown */}
          <select 
            className={styles.dropdown}
            value={countdown}
            onChange={(e) => setCountdown(e.target.value)}
            aria-label="Countdown"
            disabled={running}
          >
            <option value="">Select Countdown</option>
            <option value="3">3 seconds</option>
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
          </select>
        </div>

        {/* Main Camera Layout*/}
        <div className={styles.mainContent}>
          {/* Left: Filters */}
          <div className={styles.filters}>
            <p className={styles.chooseText}>choose a filter!</p>
            <div className={styles.filterBox}>
              <h2>Filters</h2>
              <p>Golden Hour</p>
              <p>Nostalgia</p>
              <p>Frosted</p>
              <p>Leafy Light</p>
              <p>Sepia Sage</p>
              <p>Polaroid Pop</p>
            </div>
          </div>

          {/* Right: Camera frame */}
          <div className={styles.boothCol}>
            <div className={styles.cameraFrame}>
              <CameraCanvas ref={cameraRef} />
            </div>
          {/* Start Button */}

          {!running ? (
            <button
              className={styles.start}
              onClick={handleStart}>
              START
            </button>
          ) : (
            <button
              className={styles.start}
              onClick={handleCancel}>
              CANCEL
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
