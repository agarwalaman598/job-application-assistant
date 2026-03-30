import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CTA() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-32 bg-black overflow-hidden">
      {/* Subtle grid background - same as other sections */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 tracking-tight px-4">
            Stop Manually Filling Applications
          </h2>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-400 mb-10 md:mb-12 max-w-2xl mx-auto font-light leading-relaxed px-4">
            Let AI do the work. Start free today.
          </p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button onClick={() => navigate('/register')} className="group relative px-8 md:px-12 py-4 md:py-5 bg-white hover:bg-gray-100 text-black text-base md:text-lg font-medium rounded-lg transition-all duration-300 flex items-center gap-2 md:gap-3 mx-auto shadow-2xl shadow-white/10 overflow-hidden">
              <span className="relative z-10">Get Started Free</span>
              <ArrowRight className="relative z-10 w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}