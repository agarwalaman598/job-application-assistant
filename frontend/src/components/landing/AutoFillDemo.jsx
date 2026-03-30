import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Zap, Sparkles, User, MousePointer2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const formFields = [
  { label: 'Full Name', value: 'John Doe' },
  { label: 'Email Address', value: 'john.doe@email.com' },
  { label: 'Phone Number', value: '+1 (555) 123-4567' },
  { label: 'LinkedIn Profile', value: 'linkedin.com/in/johndoe' },
  { label: 'Years of Experience', value: '5 years' }
];

const profileData = [
  { label: 'Name', value: 'John Doe' },
  { label: 'Email', value: 'john.doe@email.com' },
  { label: 'Phone', value: '+1 (555) 123-4567' },
  { label: 'LinkedIn', value: 'linkedin.com/in/johndoe' },
  { label: 'Experience', value: '5 years' }
];

const ANIMATION_CYCLE = 7000; // 7 seconds - instant loop restart

export function AutoFillDemo() {
  const [animationKey, setAnimationKey] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, ANIMATION_CYCLE);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="auto-fill" ref={sectionRef} className="relative py-20 md:py-32 bg-black overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 md:mb-20"
        >
          <h2 className="font-light text-white mb-4 md:mb-6 tracking-tight text-[32px] md:text-[40px] lg:text-[48px] font-bold">
            Smart Auto-Fill Technology
          </h2>
          <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto font-light px-4">
            Click once, fill everything instantly
          </p>
        </motion.div>

        {/* Demo Container */}
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Left - Profile Card with Click Animation */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Profile Data Card */}
            <div className="relative bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center relative">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg">Your Profile</h3>
                  <p className="text-gray-400 text-sm">Saved data ready to use</p>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="space-y-3">
                {profileData.map((field, index) => (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <span className="text-gray-400 text-sm">{field.label}</span>
                    <span className="text-white text-sm font-medium">{field.value}</span>
                  </motion.div>
                ))}
              </div>

              {/* Click to Auto-Fill Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.8 }}
                className="mt-6 flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg relative"
              >
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-sm font-medium">Click to auto-fill forms</span>

                {/* Animated Mouse Cursor - moves to badge and clicks */}
                <motion.div
                  key={`cursor-${animationKey}`}
                  initial={{ opacity: 0, x: -150, y: -80 }}
                  animate={{
                    opacity: [0, 1, 1, 1, 0],
                    x: [-150, 0, 0, 0, 0],
                    y: [-80, 0, 0, 0, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    times: [0, 0.3, 0.5, 0.6, 0.7],
                    ease: "easeInOut"
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                >
                  <MousePointer2 className="w-6 h-6 text-white drop-shadow-lg" fill="white" />
                </motion.div>

                {/* Click Ripple Effect on Badge */}
                <motion.div
                  key={`ripple-${animationKey}`}
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.5],
                    opacity: [0, 0.6, 0]
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 1.5,
                    ease: "easeOut"
                  }}
                  className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none"
                />
              </motion.div>
            </div>

            {/* Arrow Indicator */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 2.2, duration: 0.5 }}
              className="hidden lg:block absolute top-1/2 -right-16 -translate-y-1/2"
            >
              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
                  <path
                    d="M0 10H55M55 10L45 5M55 10L45 15"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="4 4"
                  />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right - Animated Form with Sequential Fill */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="space-y-3 md:space-y-4">
              {/* Form Fields with Typing Animation */}
              {formFields.map((field, index) => (
                <motion.div
                  key={field.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-lg p-3 md:p-4"
                >
                  <label className="text-gray-400 text-xs md:text-sm mb-2 block">{field.label} *</label>
                  <div className="relative">
                    {/* Input Field */}
                    <div className="h-9 md:h-10 bg-white/5 border border-white/20 rounded-lg px-3 md:px-4 flex items-center overflow-hidden">
                      {/* Typing Animation */}
                      <TypewriterText 
                        text={field.value} 
                        delay={2.2 + index * 0.6}
                        animationKey={animationKey}
                      />
                    </div>
                    
                    {/* Check Mark */}
                    <motion.div
                      key={`check-${animationKey}-${index}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 2.8 + index * 0.6, type: "spring" }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </motion.div>
                  </div>
                </motion.div>
              ))}

              {/* Success Badge */}
              <motion.div
                key={`success-${animationKey}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 6, type: "spring" }}
                className="flex items-center justify-center gap-2 p-3 md:p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
              >
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                <span className="text-green-400 font-medium text-xs md:text-base">All fields detected and auto-filled!</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Typewriter Component with Loop Support
function TypewriterText({ text, delay, animationKey }) {
  return (
    <motion.span
      key={`text-${animationKey}`}
      initial={{ width: 0 }}
      animate={{ width: "auto" }}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: "easeInOut"
      }}
      className="inline-block overflow-hidden whitespace-nowrap text-white text-xs md:text-sm"
    >
      {text}
    </motion.span>
  );
}