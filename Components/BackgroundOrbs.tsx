"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function BackgroundOrbs() {
  const { scrollY } = useScroll();
  
  // Parallax effects
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 100]);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-[-10] overflow-hidden">
      {/* Indigo Orb */}
      <motion.div
        style={{ y: y1 }}
        animate={{
          x: [0, 50, 0, -50, 0],
          scale: [1, 1.1, 1, 0.9, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-500/[0.12] blur-[120px]"
      />
      
      {/* Purple Orb */}
      <motion.div
        style={{ y: y2 }}
        animate={{
          x: [0, -40, 0, 40, 0],
          scale: [1, 0.9, 1, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
          delay: 2
        }}
        className="absolute top-[40%] right-[10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-purple-500/[0.12] blur-[120px]"
      />
      
      {/* Cyan Orb */}
      <motion.div
        style={{ y: y3 }}
        animate={{
          x: [0, 30, 0, -30, 0],
          scale: [1, 1.05, 1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
          delay: 5
        }}
        className="absolute bottom-[10%] left-[40%] w-[30vw] h-[30vw] max-w-[500px] max-h-[500px] rounded-full bg-cyan-500/[0.1] blur-[100px]"
      />
    </div>
  );
}
