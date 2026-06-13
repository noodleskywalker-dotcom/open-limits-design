"use client";

import { motion } from "framer-motion";
import BrandLogoLines from "@/components/home/intro/BrandLogoLines";

const line = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

type SignatureLogoMorphProps = {
  visible: boolean;
  logoImageUrl?: string | null;
  companyName?: string;
  premium?: boolean;
};

/** Logo constructed from architectural linework — villa lines collapse into wordmark frame. */
export default function SignatureLogoMorph({
  visible,
  logoImageUrl,
  companyName,
  premium = false
}: SignatureLogoMorphProps) {
  if (logoImageUrl && visible) {
    return (
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`sig-logo-image-wrap ${premium ? "sig-logo-image-wrap-premium" : ""}`}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandLogoLines companyName={companyName} logoImageUrl={logoImageUrl} visible={visible} />
      </motion.div>
    );
  }

  return (
    <div className={`sig-logo-morph ${premium ? "sig-logo-morph-premium" : ""}`}>
      <svg aria-hidden className="sig-logo-svg" viewBox="0 0 520 96">
        <defs>
          <filter id="sig-logo-glow">
            <feGaussianBlur result="blur" stdDeviation="2" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Converging architecture lines morph into frame */}
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-morph-line"
          custom={0}
          d="M260 88 L260 48"
          initial="hidden"
          variants={line}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-morph-line"
          custom={0.05}
          d="M180 88 L260 48"
          initial="hidden"
          variants={line}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-morph-line"
          custom={0.05}
          d="M340 88 L260 48"
          initial="hidden"
          variants={line}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-stroke sig-logo-stroke-frame"
          custom={0.15}
          d="M16 52 H504"
          filter="url(#sig-logo-glow)"
          initial="hidden"
          variants={line}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-stroke sig-logo-stroke-frame"
          custom={0.22}
          d="M16 52 V16 H260"
          initial="hidden"
          variants={line}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-stroke sig-logo-stroke-frame"
          custom={0.3}
          d="M260 16 H504"
          initial="hidden"
          variants={line}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-stroke sig-logo-stroke-frame"
          custom={0.38}
          d="M504 16 V80 H16"
          initial="hidden"
          variants={line}
        />
        <motion.path
          animate={visible ? "visible" : "hidden"}
          className="sig-logo-stroke sig-logo-stroke-frame"
          custom={0.46}
          d="M16 80 H360"
          initial="hidden"
          variants={line}
        />
        <motion.text
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          className="sig-logo-text"
          initial={{ opacity: 0, y: 6 }}
          transition={{ delay: 0.72, duration: 0.9 }}
          x="32"
          y="58"
        >
          OPEN LIMITS
        </motion.text>
        <motion.text
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          className="sig-logo-text sig-logo-text-accent"
          initial={{ opacity: 0, y: 6 }}
          transition={{ delay: 0.9, duration: 0.9 }}
          x="328"
          y="58"
        >
          DESIGN
        </motion.text>
      </svg>
    </div>
  );
}
