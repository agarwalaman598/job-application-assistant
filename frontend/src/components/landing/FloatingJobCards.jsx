import { motion as Motion } from 'motion/react';
import { Briefcase, MapPin, Building2, TrendingUp, Target, CheckCircle2 } from 'lucide-react';

const jobCards = [
  {
    company: 'Google',
    role: 'Senior Software Engineer',
    location: 'Mountain View, CA',
    status: 'Applied',
    matchScore: 92,
    delay: 0,
    x: '10%',
    y: '15%'
  },
  {
    company: 'Microsoft',
    role: 'Product Manager',
    location: 'Seattle, WA',
    status: 'Interview',
    matchScore: 88,
    delay: 0.3,
    x: '70%',
    y: '10%'
  },
  {
    company: 'Amazon',
    role: 'Full Stack Developer',
    location: 'Remote',
    status: 'Offer',
    matchScore: 95,
    delay: 0.6,
    x: '15%',
    y: '60%'
  },
  {
    company: 'Meta',
    role: 'Frontend Engineer',
    location: 'Menlo Park, CA',
    status: 'Applied',
    matchScore: 85,
    delay: 0.9,
    x: '65%',
    y: '65%'
  }
];

const resumeCard = {
  name: 'Resume_Final_v3.pdf',
  size: '245 KB',
  uploadDate: 'Mar 15, 2026',
  delay: 1.2,
  x: '70%',
  y: '75%'
};

export function FloatingJobCards() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Job Application Cards */}
      {jobCards.map((card, index) => (
        <Motion.div
          key={index}
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ 
            opacity: [0.15, 0.25, 0.15], 
            y: [0, -30, 0],
            scale: [0.85, 0.9, 0.85],
          }}
          transition={{
            duration: 8 + index * 0.5,
            delay: card.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-72 bg-neutral-900/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 shadow-2xl"
          style={{ left: card.x, top: card.y }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">{card.company}</h3>
                <p className="text-gray-400 text-xs">{card.role}</p>
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs ${
              card.status === 'Offer' ? 'bg-green-500/20 text-green-400' :
              card.status === 'Interview' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {card.status}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
            <MapPin className="w-3 h-3" />
            <span>{card.location}</span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-xs">Match Score</span>
            </div>
            <span className="text-white font-medium text-sm">{card.matchScore}%</span>
          </div>
        </Motion.div>
      ))}

      {/* Resume Card */}
      <Motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
        animate={{ 
          opacity: [0.6, 0.9, 0.6],
          y: [0, -20, 0],
          rotate: [-5, 0, -5],
          scale: [0.95, 1, 0.95],
        }}
        transition={{
          duration: 7,
          delay: resumeCard.delay,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-64 bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl"
        style={{ left: resumeCard.x, top: resumeCard.y }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm truncate">{resumeCard.name}</h3>
            <p className="text-gray-400 text-xs">{resumeCard.size}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Uploaded</span>
          <span className="text-gray-300">{resumeCard.uploadDate}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-xs">Default Resume</span>
        </div>
      </Motion.div>

      {/* Floating Stats Badges */}
      <Motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0.5, 0.9, 0.5],
          y: [0, -15, 0],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 5,
          delay: 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[25%] right-[20%] px-4 py-2 bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-full shadow-xl"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-white text-sm font-medium">12 Active Applications</span>
        </div>
      </Motion.div>

      <Motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0.5, 0.9, 0.5],
          y: [0, 20, 0],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 6,
          delay: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[20%] left-[25%] px-4 py-2 bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-full shadow-xl"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span className="text-white text-sm font-medium">AI Analysis Complete</span>
        </div>
      </Motion.div>
    </div>
  );
}