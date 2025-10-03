"use client";

/*
  Photobooth Page
   - Shows a live camera using <CameraCanvas>
   - Lets the user pick a countdown (3/5/10s) and a visual filter
   - On START: asks CameraCanvas to take 4 photos with that countdown
               or lets the user upload exactly 4 photos instead of using
               the camera
   - Stores the 4 photos in sessionStorage, then goes to photostrip page
*/

import styles from "./photobooth.module.css";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCanvas, { CameraHandle, FilterKey } from "../../components/camera";
import Image from "next/image";

export default function Page() {
  /* hooks: routers + refs */
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null); // ref to the hidden <input type="file">
  const cameraRef = useRef<CameraHandle>(null);               // ref to the camera child

  /* local states */
  const [countdown, setCountdown] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("none");

  /* helpers */

  // open file picker by clicking hidden input
  const handleButtonClick = () => fileInputRef.current?.click();

  // read a file -> data URL string so we can store it
  const fileToDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // File upload flow
  // - users must pick exactly 4 images
  // - convert all 4 to data URLs
  // - Save array of data URLs in sessionStorage under "luma_photos"
  // - Go to photostrip to render the strip from those 4 photos
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length !== 4) {
      alert("Please select exactly 4 photos.");
      event.target.value = ""; // reset so user can re-pick the same files
      return;
    }

    /* 
    - turn 4 pictures into long text strings at the same time, so we can save them
    - save them in sessionStorage under "luma_photos" -> photostrip
    - if something goes wrong, show an error. 
    - always reset the file input at the end
    */

    try {
      const dataUrls = await Promise.all(files.map(fileToDataURL));
      sessionStorage.removeItem("luma_preroll_all");
      sessionStorage.setItem("luma_photos", JSON.stringify(dataUrls));
      router.push("/photostrip"); 
    } catch (e) {
      console.error(e);
      alert("Couldn't read one of the files. Please try again.");
    } finally {
      event.target.value = ""; // clean up input
    }
  };

  /* Camera flow */
  // - requires a countdown to start
  // - ask CameraCanvas to run start3/start5/start10
  // - while running, disable certain buttons
  // - if we get exactly 4 photos, save to sessionStorage and navigate
  // - Cancel: Tells CameraCanvas to cancel and reset running state
  const handleStart = async () => {
    if (!countdown) {
      alert("Please select a countdown first.");
      return;
    }
    const api = cameraRef.current;
    if (!api) return;

    setRunning(true);
    let shots: string[] = [];
    try {
      shots =
        countdown === "5"
          ? await api.start5()
          : countdown === "10"
          ? await api.start10()
          : await api.start3();
    } finally {
      setRunning(false);
    }
    if (shots.length === 4) {
      sessionStorage.setItem("luma_photos", JSON.stringify(shots));
      const preroll = sessionStorage.getItem("luma_preroll_all");
      if (!preroll) {
        console.warn("No preroll found after live session.");
      }
      router.push("/photostrip");
    }
  };

  const handleCancel = () => {
    cameraRef.current?.cancel();
    setRunning(false);
  };

  return (
    <div className={styles.page}>
      {/* Decorative Images */}
      <Image
        src="/butterflies.png"
        alt=""
        width={150}
        height={150}
        className={styles.butterflies}
        priority
      />
      <Image
        src="/butterflies.png"
        alt=""
        width={150}
        height={150}
        className={`${styles.butterflies2} ${styles.flipX}`}
        priority
      />
      <Image
        src="/leaf2.png"
        alt=""
        width={240}
        height={240}
        className={styles.leafBR}
        priority
      />
      <Image
        src="/flowerpot.png"
        alt=""
        width={350}
        height={350}
        className={styles.flowerBL}
        priority
      />

      {/* Title Page */}
      <h1>LUMA LEAF</h1>

      <div className={styles.content}>
        {/* Top Controls */}
        <div className={styles.topBar}>
          <div className={styles.leftGroup}>
            <button
              className={styles.boxButton}
              onClick={handleButtonClick}
              disabled={running}
            >
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

        {/* Main Camera Layout */}
        <div className={styles.mainContent}>
          {/* Left: Filters */}
          <div className={styles.filters}>
            <p className={styles.chooseText}>choose a filter!</p>
            <div className={styles.filterBox}>
              <h2>Filters</h2>
              <p
                onClick={() => !running && setFilter("none")}
                className={filter === "none" ? styles.active : ""}
              >
                Normal
              </p>
              <p
                onClick={() => setFilter("goldenHour")}
                className={filter === "goldenHour" ? styles.active : ""}
              >
                Golden Hour
              </p>
              <p
                onClick={() => setFilter("nostalgia")}
                className={filter === "nostalgia" ? styles.active : ""}
              >
                Nostalgia
              </p>
              <p
                onClick={() => setFilter("frosted")}
                className={filter === "frosted" ? styles.active : ""}
              >
                Frosted
              </p>
              <p
                onClick={() => setFilter("leafyLight")}
                className={filter === "leafyLight" ? styles.active : ""}
              >
                Leafy Light
              </p>
              <p
                onClick={() => setFilter("sepiaSage")}
                className={filter === "sepiaSage" ? styles.active : ""}
              >
                Sepia Sage
              </p>
              <p
                onClick={() => setFilter("polaroidPop")}
                className={filter === "polaroidPop" ? styles.active : ""}
              >
                Polaroid Pop
              </p>
            </div>
          </div>

          {/* Right: Camera frame */}
          <div className={styles.boothCol}>
            <div className={styles.cameraFrame}>
              <CameraCanvas ref={cameraRef} filter={filter} />
            </div>

            {/* Start Button + Cancel Button */}
            {!running ? (
              <button className={styles.start} onClick={handleStart}>
                START
              </button>
            ) : (
              <button className={styles.start} onClick={handleCancel}>
                CANCEL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
