"use client";

import styles from "./photobooth.module.css";
import { useRef, useState } from "react";
import CameraCanvas, { CameraHandle } from "../../components/camera";

export default function Page() {


  const fileInputRef = useRef<HTMLInputElement | null>(null);     // ref to the hidden <input type ="file"
  const cameraRef = useRef<CameraHandle>(null);                   // ref to the camera child


  const [countdown, setCountdown] = useState<string>("");
  
  const handleButtonClick = () => fileInputRef.current?.click();  // open file picker by clicking hidden input

  // when a file is chosen, grab the first one
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {    
    const file = event.target.files?.[0];
    if (file) console.log("Selected file:", file);
    event.target.value = "";
  };


  const handleStart = () => {
    if (!countdown) {
      alert("Please select a countdown first.");
      return;
    }
    if (countdown === "5") cameraRef.current?.start5();
    else if (countdown === "10") cameraRef.current?.start10();
    else cameraRef.current?.start3();
  }

  return (
    
    <div className={styles.page}>
       {/* Tile Page */}
      <h1>LUMA LEAF</h1>

      <div className={styles.content}>
        {/* Top Controls */}
        <div className={styles.topBar}>
          <div className={styles.leftGroup}>
            <button className={styles.boxButton}>Camera</button>
            <button className={styles.boxButton} onClick={handleButtonClick}>
              Upload Images
            </button>
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
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
            <button
              className={styles.start}
              onClick={handleStart}>
              START
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
