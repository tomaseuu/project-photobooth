"use client";

import Camera from "../../components/camera";
import styles from "./photobooth.module.css";
import Link from "next/link";
import { useEffect } from "react";

export default function Page() {
  return (
    <div className={styles.page}>
      <h1>LUMA LEAF</h1>

      <div className={styles.topBar}>
        <div className={styles.leftGroup}>
          <button className={styles.boxButton}>Camera</button>
          <button className={styles.boxButton}>Upload Images</button>
        </div>
        <select className={styles.dropdown}>
          <option>Select Countdown</option>
          <option value="3">3 seconds</option>
          <option value="5">5 seconds</option>
          <option value="10">10 seconds</option>
        </select>
      </div>

      <div className={styles.mainContent}>
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

        <div className={styles.cameraFrame}>
          <Camera />
        </div>
      </div>

      <Link href="/prebooth" className={styles.start}>
        <h1>START</h1>
      </Link>
    </div>
  );
}
