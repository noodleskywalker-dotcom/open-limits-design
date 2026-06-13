"use client";

import { motion } from "framer-motion";

const line = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

type BrandLogoLinesProps = {
  visible: boolean;
  logoImageUrl?: string | null;
  companyName?: string;
};

export default function BrandLogoLines({ visible, logoImageUrl, companyName }: BrandLogoLinesProps) {
  if (logoImageUrl && visible) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="ols-brand-logo-image-wrap"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={companyName ?? "Open Limits Design"} className="ols-brand-logo-image" src={logoImageUrl} />
      </motion.div>
    );
  }

  return (
    <svg
      aria-hidden
      className="ols-brand-logo-svg"
      viewBox="0 0 420 72"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="ols-brand-line"
        custom={0}
        d="M8 36 H88"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="ols-brand-line"
        custom={0.08}
        d="M8 36 V12 H200"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="ols-brand-line"
        custom={0.16}
        d="M200 12 H412"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="ols-brand-line"
        custom={0.24}
        d="M412 12 V60 H8"
        initial="hidden"
        variants={line}
      />
      <motion.path
        animate={visible ? "visible" : "hidden"}
        className="ols-brand-line"
        custom={0.32}
        d="M8 60 H280"
        initial="hidden"
        variants={line}
      />
      <motion.text
        animate={visible ? { opacity: 1 } : { opacity: 0 }}
        className="ols-brand-wordmark"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.55, duration: 0.7 }}
        x="24"
        y="44"
      >
        OPEN LIMITS
      </motion.text>
      <motion.text
        animate={visible ? { opacity: 1 } : { opacity: 0 }}
        className="ols-brand-wordmark ols-brand-wordmark-sub"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.72, duration: 0.7 }}
        x="268"
        y="44"
      >
        DESIGN
      </motion.text>
    </svg>
  );
}
