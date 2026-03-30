import { motion } from 'motion/react';

export function SectionDivider() {
  return (
    <section className="relative py-12 md:py-20 bg-black overflow-hidden">
      {/* Animated Line with Pulse */}
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Horizontal flowing line */}
        <div className="relative h-px bg-white/10">
          {/* Flowing pulse effect */}
          <motion.div
            className="absolute top-0 left-0 h-full w-20 md:w-32 bg-gradient-to-r from-transparent via-white to-transparent"
            animate={{
              x: ['-100%', '100vw'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 1,
            }}
            style={{
              filter: 'blur(2px)',
            }}
          />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-0.5 md:w-1 md:h-1 bg-white/40 rounded-full"
              style={{
                left: `${(i / 10) * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Central Glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-24 md:h-24 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      </div>
    </section>
  );
}