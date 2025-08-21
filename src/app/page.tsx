"use client";

import Image from "next/image";
import { useEffect } from "react";
import styles from "./home.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>LUMA LEAF</h1>
        <p>A personal photobooth for you and your favorite people</p>
      </div>
      
      <div className={styles.homepageImage}>
        <Image
          src="/vines.PNG"
          alt="Vines"
          width={310}
          height={310}
          className={styles.vineImage} />
      </div>
      
      <div className={styles.centerContent}>
        <div className={styles.logoImage}>
          <Image
            src="/leaf.PNG"
            alt="Leaf Logo"
            width={300}
            height={300}
            className={styles.leafImage} />
        </div>

        <Link href="/prebooth" className={styles.start}>
          <h1>START</h1>
        </Link>
      </div>
      
      <div className={styles.threeImages}>
        <a
          href="https://www.instagram.com/tomaseuu/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/instagram.PNG"
            alt="Instagram Logo"
            width={50}
            height={50}
            className={styles.instaImages} />
        </a>
        <a
          href="https://www.linkedin.com/in/thomasle998/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/linkedin.PNG"
            alt="LinkedIn Logo"
            width={60}
            height={60}
            className={styles.linkedinImages} />
        </a>
        <a
          href="https://www.youtube.com/@tomaseuu"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/Youtube.PNG"
            alt="Youtube Logo"
            width={50}
            height={50}
            className={styles.youtubeImages} 
          />
        </a>
      </div>
    </div>
  );
}
