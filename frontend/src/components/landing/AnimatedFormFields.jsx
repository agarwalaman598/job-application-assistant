import { motion } from 'motion/react';
import { Sparkles, Wand2 } from 'lucide-react';

export function AnimatedFormFields() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      {/* Form Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-[500px] space-y-4"
      >
        {/* Form Field 1 - Auto-filling */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-lg p-4"
        >
          <label className="text-gray-400 text-sm mb-2 block">Full Name *</label>
          <div className="relative">
            <motion.input
              type="text"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
              initial={{ value: '' }}
              animate={{ value: 'John Doe' }}
              transition={{ duration: 2, delay: 1 }}
              readOnly
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Sparkles className="w-4 h-4 text-green-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Form Field 2 - Auto-filling */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-lg p-4"
        >
          <label className="text-gray-400 text-sm mb-2 block">Email Address *</label>
          <div className="relative">
            <motion.input
              type="text"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
              initial={{ value: '' }}
              animate={{ value: 'john.doe@email.com' }}
              transition={{ duration: 2, delay: 1.8 }}
              readOnly
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.3 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Sparkles className="w-4 h-4 text-green-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Form Field 3 - Auto-filling */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-lg p-4"
        >
          <label className="text-gray-400 text-sm mb-2 block">Phone Number *</label>
          <div className="relative">
            <motion.input
              type="text"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
              initial={{ value: '' }}
              animate={{ value: '+1 (555) 123-4567' }}
              transition={{ duration: 2, delay: 2.6 }}
              readOnly
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 3.1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Sparkles className="w-4 h-4 text-green-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* AI Fill Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-end"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-medium text-sm shadow-lg"
          >
            <Wand2 className="w-4 h-4" />
            Auto-Fill with AI
          </motion.button>
        </motion.div>

        {/* Success Indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 3.5 }}
          className="absolute -top-6 right-0 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Form auto-filled successfully!
        </motion.div>
      </motion.div>
    </div>
  );
}
