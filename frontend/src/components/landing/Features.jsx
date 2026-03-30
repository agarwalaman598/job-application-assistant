import { motion as Motion } from 'motion/react';
import { 
  Target, 
  Brain, 
  FileText, 
  Zap, 
  TrendingUp, 
  BarChart3 
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'AI Match Scoring',
    description: '4-dimension weighted analysis with actionable gap analysis. Keywords, skills, experience, and education matching.',
  },
  {
    icon: Brain,
    title: 'JD Analyzer',
    description: 'Extract role title, required skills, nice-to-haves, level, and responsibilities in seconds using advanced AI.',
  },
  {
    icon: FileText,
    title: 'Resume Manager',
    description: 'Upload PDFs or link Google Drive. Cloud storage with secure access and version control.',
  },
  {
    icon: Zap,
    title: 'Smart Auto-Fill',
    description: 'Detect fields on Google Forms, Microsoft Forms, Typeform & JotForm. Auto-map to your profile instantly.',
  },
  {
    icon: TrendingUp,
    title: 'Application Tracker',
    description: 'Full CRUD with status tracking from draft to offer. Never lose track of any application.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analytics',
    description: 'Stats overview with recent applications at a glance. Track your progress and optimize your strategy.',
  }
];

export function Features() {
  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0">
        <Motion.div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '80px 80px']
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 md:mb-20"
        >
          <h2 className="font-light text-white mb-4 md:mb-6 tracking-tight text-[32px] md:text-[40px] lg:text-[48px] font-bold">
            Everything You Need
          </h2>
          <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto font-light px-4">
            Powered by cutting-edge AI to automate your entire job application workflow
          </p>
        </Motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {features.map((feature, index) => (
            <Motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="relative p-5 md:p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm group cursor-pointer overflow-hidden"
            >
              {/* Hover Effect */}
              <Motion.div
                className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />

              {/* Icon */}
              <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-lg bg-white/10 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-5 h-5 md:w-5.5 md:h-5.5 text-white" />
              </div>

              {/* Content */}
              <h3 className="relative text-lg md:text-xl font-normal text-white mb-2">{feature.title}</h3>
              <p className="relative text-xs md:text-sm text-gray-400 leading-relaxed font-light">{feature.description}</p>
            </Motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}