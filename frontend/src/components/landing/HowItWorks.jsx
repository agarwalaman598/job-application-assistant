import { motion } from 'motion/react';
import { Upload, Search, Sparkles, Send, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload Your Resume',
    description: 'Upload your resume PDF or link from Google Drive. Set it as default for AI analysis.',
    step: '01'
  },
  {
    icon: Search,
    title: 'Analyze Job Descriptions',
    description: 'Paste any JD and get instant AI analysis: required skills, level, match score, and gaps.',
    step: '02'
  },
  {
    icon: Sparkles,
    title: 'Generate AI Answers',
    description: 'Get personalized, tailored answers to application questions based on your profile.',
    step: '03'
  },
  {
    icon: Send,
    title: 'Auto-Fill & Apply',
    description: 'Detect form fields, auto-map your data, and fill applications on major platforms.',
    step: '04'
  }
];

export function HowItWorks() {
  return (
    <section className="relative py-32 bg-black overflow-hidden">
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
          <h2 className="text-white mb-3 md:mb-4 tracking-tight uppercase text-[32px] md:text-[40px] font-bold">
            How It Works
          </h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto px-4">
            Four simple steps to transform your job application workflow
          </p>
        </motion.div>

        {/* Flowchart Steps */}
        <div className="relative max-w-6xl mx-auto">
          {/* Desktop Flow - Horizontal */}
          <div className="hidden lg:flex items-start justify-between gap-4">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-center flex-1">
                {/* Step Card */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative flex-1"
                >
                  {/* Animated Step Card */}
                  <motion.div
                    animate={{
                      borderColor: [
                        'rgba(255, 255, 255, 0.2)',
                        'rgba(255, 255, 255, 0.5)',
                        'rgba(255, 255, 255, 0.2)'
                      ]
                    }}
                    transition={{
                      duration: 3,
                      delay: index * 0.75,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: "easeInOut"
                    }}
                    className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center bg-neutral-950/50"
                  >
                    {/* Icon with pulse animation */}
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 3,
                        delay: index * 0.75,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                      className="w-10 h-10 mx-auto flex items-center justify-center mb-3"
                    >
                      <step.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-base text-white mb-2 uppercase tracking-wide">{step.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{step.description}</p>
                  </motion.div>
                </motion.div>

                {/* Animated Arrow Connector */}
                {index < steps.length - 1 && (
                  <div className="relative w-12 flex-shrink-0 flex items-center justify-center">
                    {/* Dashed line */}
                    <div className="absolute w-full h-0.5 border-t-2 border-dashed border-white/20" />
                    
                    {/* Animated flowing dots */}
                    <motion.div
                      animate={{
                        x: [-30, 30],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        delay: index * 0.75,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                      className="absolute w-1.5 h-1.5 bg-white rounded-full"
                    />
                    <motion.div
                      animate={{
                        x: [-30, 30],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        delay: index * 0.75 + 0.3,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                      className="absolute w-1.5 h-1.5 bg-white/60 rounded-full"
                    />
                    <ArrowRight className="w-4 h-4 text-white/40 relative z-10 bg-black px-1" strokeWidth={2} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile/Tablet Flow - Vertical */}
          <div className="lg:hidden space-y-6">
            {steps.map((step, index) => (
              <div key={step.title}>
                {/* Step Card */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  className="relative"
                >
                  <motion.div
                    animate={{
                      borderColor: [
                        'rgba(255, 255, 255, 0.2)',
                        'rgba(255, 255, 255, 0.5)',
                        'rgba(255, 255, 255, 0.2)'
                      ]
                    }}
                    transition={{
                      duration: 3,
                      delay: index * 0.75,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: "easeInOut"
                    }}
                    className="border-2 border-dashed border-white/20 rounded-lg p-4 bg-neutral-950/50"
                  >
                    {/* Icon */}
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 3,
                        delay: index * 0.75,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                      className="w-10 h-10 flex items-center justify-center mb-3"
                    >
                      <step.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-base text-white mb-2 uppercase tracking-wide">{step.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{step.description}</p>
                  </motion.div>
                </motion.div>

                {/* Animated Arrow Connector */}
                {index < steps.length - 1 && (
                  <div className="relative h-10 flex items-center justify-center">
                    {/* Dashed line */}
                    <div className="absolute h-full w-0.5 border-l-2 border-dashed border-white/20" />
                    
                    <motion.div
                      animate={{
                        y: [-20, 20],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        delay: index * 0.75,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                      className="absolute w-1.5 h-1.5 bg-white rounded-full"
                    />
                    <motion.div
                      animate={{
                        y: [-20, 20],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        delay: index * 0.75 + 0.3,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                      className="absolute w-1.5 h-1.5 bg-white/60 rounded-full"
                    />
                    <ArrowRight className="w-4 h-4 text-white/40 rotate-90 relative z-10 bg-black py-1" strokeWidth={2} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}