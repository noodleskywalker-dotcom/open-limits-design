"use client";

import { motion } from "framer-motion";

const line = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

type SignatureLogoMorphProps = {
  visible: boolean;
};

/** Logo constructed from architectural linework — villa lines collapse into wordmark frame. */
export default function SignatureLogoMorph({ visible }: SignatureLogoMorphProps) {
  return (
    <svg aria-hidden className="sig-logo-svg" viewBox="0 0 480 80">
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="sig-logo-stroke"
        custom={0}
        d="M12 40 H96"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="sig-logo-stroke"
        custom={0.1}
        d="M12 40 V14 H220"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="sig-logo-stroke"
        custom={0.2}
        d="M220 14 H468"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="sig-logo-stroke"
        custom={0.3}
        d="M468 14 V66 H12"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="sig-logo-stroke"
        custom={0.38}
        d="M12 66 H320"
        initial="hidden"
        variants={line}
      />
      <motion.text
        animate={visible ? { opacity: 1 } : { opacity: 0 }}
        className="sig-logo-text"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.65, duration: 0.8 }}
        x="28"
        y="48"
      >
        OPEN LIMITS
      </motion.text>
      <motion.text
        animate={visible ? { opacity: 1 } : { opacity: 0 }}
        className="sig-logo-text sig-logo-text-accent"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.82, duration: 0.8 }}
        x="292"
        y="48"
      >
        DESIGN
      </motion.text>
    </svg>
  );
}
