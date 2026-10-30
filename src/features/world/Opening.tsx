"use client";
import World from "./World";
import styles from "./Opening.module.css";

export default function Opening() {
  return (
    <div className={styles.home}>
      <p className={styles.connect} aria-hidden="true">
        CONNECT
      </p>
      <div className={styles.reveal}>
        <World />
      </div>
    </div>
  );
}
