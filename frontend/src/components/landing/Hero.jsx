import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FloatingJobCards } from './FloatingJobCards';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <FloatingJobCards />

      <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-8 py-32">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-6 md:mb-8 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            
            <span className="text-xs md:text-sm text-gray-300 font-light tracking-wide">AI-Powered Job Application Assistant</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-light mb-6 md:mb-8 text-white tracking-tight leading-[1.1] text-[48px] sm:text-[64px] md:text-[80px] lg:text-[96px]"
          >
            Land Your Dream Job
            <br />
            <span className="font-medium">10x Faster</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base md:text-xl lg:text-2xl text-gray-400 mb-12 md:mb-16 max-w-4xl mx-auto font-light leading-relaxed px-4"
          >
            Track applications · Match resumes · Analyze job descriptions · Generate answers · Auto-fill forms
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group px-8 py-4 bg-white hover:bg-gray-100 text-black rounded-lg font-normal transition-all duration-300 flex items-center gap-2 text-lg w-full sm:w-auto justify-center"
              onClick={() => navigate('/register')}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-lg font-light transition-all duration-300 border border-white/10 text-lg w-full sm:w-auto"
              onClick={() => navigate('/login')}
            >
              Sign In
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-white rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}