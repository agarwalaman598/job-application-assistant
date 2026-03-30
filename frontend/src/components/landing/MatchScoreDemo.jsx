import { motion as Motion, useInView } from 'motion/react';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRef } from 'react';

const matchData = {
  overall: 87,
  dimensions: [
    { name: 'Keywords Match', score: 92, status: 'excellent' },
    { name: 'Skills Alignment', score: 85, status: 'good' },
    { name: 'Experience Level', score: 78, status: 'good' },
    { name: 'Education Match', score: 95, status: 'excellent' }
  ],
  gaps: [
    { skill: 'Kubernetes', severity: 'high' },
    { skill: 'System Design', severity: 'medium' },
    { skill: 'GraphQL', severity: 'low' }
  ]
};

export function MatchScoreDemo() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { 
    once: true,
    margin: "-150px",
    amount: 0.2
  });

  return (
    <section id="ai-matching" ref={sectionRef} className="relative py-20 md:py-32 bg-black overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

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
            AI Match Scoring
          </h2>
          <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto font-light px-4">
            Instant compatibility analysis for every job application
          </p>
        </Motion.div>

        {/* Dynamic Results Display */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Main Score Card - Always animating */}
            <div className="lg:col-span-1">
              <Motion.div
                key={`score-card-${isInView}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-neutral-950/50 border border-white/[0.08] rounded-xl p-6 md:p-10"
              >
                <div className="flex items-start justify-between mb-8 md:mb-10">
                  <div>
                    <Motion.h3
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-white text-xs md:text-sm mb-2 uppercase tracking-widest"
                    >
                      Overall Match Score
                    </Motion.h3>
                    <Motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-600 text-[10px] md:text-xs"
                    >
                      Senior Software Engineer - Google
                    </Motion.p>
                  </div>
                  <Motion.div
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-gray-700" strokeWidth={1.5} />
                  </Motion.div>
                </div>

                {/* Circular Progress */}
                <div className="flex items-center justify-center mb-10 md:mb-12">
                  <div className="relative w-44 h-44 md:w-52 md:h-52">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="88"
                        cy="88"
                        r="80"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="6"
                        fill="none"
                        className="md:hidden"
                      />
                      <circle
                        cx="104"
                        cy="104"
                        r="95"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="8"
                        fill="none"
                        className="hidden md:block"
                      />
                      <Motion.circle
                        key={`circle-mobile-${isInView}`}
                        cx="88"
                        cy="88"
                        r="80"
                        stroke="white"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: 503 }}
                        animate={{ strokeDashoffset: 503 - (503 * matchData.overall) / 100 }}
                        transition={{ duration: 2, delay: 0.4, ease: "easeOut" }}
                        style={{
                          strokeDasharray: 503,
                        }}
                        className="md:hidden"
                      />
                      <Motion.circle
                        key={`circle-desktop-${isInView}`}
                        cx="104"
                        cy="104"
                        r="95"
                        stroke="white"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: 597 }}
                        animate={{ strokeDashoffset: 597 - (597 * matchData.overall) / 100 }}
                        transition={{ duration: 2, delay: 0.4, ease: "easeOut" }}
                        style={{
                          strokeDasharray: 597,
                        }}
                        className="hidden md:block"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <Motion.div
                        key={`score-${isInView}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="text-5xl md:text-6xl text-white/90 tracking-wide"
                        style={{ fontWeight: 200 }}
                      >
                        {matchData.overall}
                      </Motion.div>
                      <Motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ delay: 1 }}
                        className="text-gray-600 text-[8px] md:text-[9px] mt-2 uppercase tracking-[0.3em]"
                        style={{ fontWeight: 300 }}
                      >
                        out of 100
                      </Motion.span>
                    </div>
                  </div>
                </div>

                {/* Dimension Scores */}
                <div className="space-y-4 md:space-y-5">
                  {matchData.dimensions.map((dim, index) => (
                    <Motion.div
                      key={`${dim.name}-${isInView}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-[10px] md:text-xs">{dim.name}</span>
                        <Motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.4 + index * 0.1 }}
                          className="text-white text-xs md:text-sm"
                        >
                          {dim.score}%
                        </Motion.span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <Motion.div
                          key={`bar-${isInView}-${index}`}
                          initial={{ width: '0%' }}
                          animate={{ width: `${dim.score}%` }}
                          transition={{ duration: 1.2, delay: 1.5 + index * 0.1, ease: "easeOut" }}
                          className="h-full bg-white rounded-full"
                        />
                      </div>
                    </Motion.div>
                  ))}
                </div>
              </Motion.div>
            </div>

            {/* Right Side - Gap Analysis */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Skills to Improve */}
              <Motion.div
                key={`skills-${isInView}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-neutral-950/50 border border-white/[0.08] rounded-xl p-6 md:p-8"
              >
                <Motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 md:gap-3 mb-5 md:mb-6"
                >
                  <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-gray-600" strokeWidth={1.5} />
                  <h4 className="text-white uppercase tracking-widest text-[10px] md:text-xs">Skills to Improve</h4>
                </Motion.div>

                <div className="grid sm:grid-cols-3 gap-3 md:gap-4">
                  {matchData.gaps.map((gap, index) => (
                    <Motion.div
                      key={`${gap.skill}-${isInView}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.15, duration: 0.4 }}
                      className="bg-neutral-900/50 border border-white/[0.06] rounded-lg p-4 md:p-5"
                    >
                      <div className="flex items-start justify-between mb-2 md:mb-3">
                        <span className="text-gray-300 text-xs md:text-sm">{gap.skill}</span>
                        <Motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1 + index * 0.15 }}
                          className={`px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] uppercase tracking-wider ${
                            gap.severity === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                            gap.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                            'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          }`}
                        >
                          {gap.severity}
                        </Motion.span>
                      </div>
                      <p className="text-gray-600 text-[10px] md:text-xs leading-relaxed">
                        {gap.severity === 'high' ? 'Critical for role' : gap.severity === 'medium' ? 'Recommended skill' : 'Nice to have'}
                      </p>
                    </Motion.div>
                  ))}
                </div>
              </Motion.div>

              {/* Your Strengths */}
              <Motion.div
                key={`strengths-${isInView}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="bg-neutral-950/50 border border-white/[0.08] rounded-xl p-6 md:p-8"
              >
                <Motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center gap-2 md:gap-3 mb-5 md:mb-6"
                >
                  <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-gray-600" strokeWidth={1.5} />
                  <h4 className="text-white uppercase tracking-widest text-[10px] md:text-xs">Your Strengths</h4>
                </Motion.div>

                <div className="grid sm:grid-cols-2 gap-2 md:gap-3">
                  {['React & TypeScript', 'System Architecture', 'Cloud Infrastructure', 'Team Leadership'].map((strength, index) => (
                    <Motion.div
                      key={`${strength}-${isInView}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                      className="flex items-center gap-2 md:gap-3 py-2.5 md:py-3 px-3 md:px-4 bg-neutral-900/30 border border-white/[0.06] rounded-lg"
                    >
                      <Motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.3 + index * 0.1 }}
                        className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-500"
                      />
                      <span className="text-gray-400 text-xs md:text-sm">{strength}</span>
                    </Motion.div>
                  ))}
                </div>
              </Motion.div>

              {/* Recommendation */}
              <Motion.div
                key={`recommendation-${isInView}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="bg-blue-500/[0.03] border border-blue-500/20 rounded-xl p-5 md:p-6"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <Motion.div
                    initial={{ opacity: 0, rotate: -45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 1.1 }}
                  >
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-500 flex-shrink-0 mt-1" strokeWidth={1.5} />
                  </Motion.div>
                  <div>
                    <Motion.h5
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 }}
                      className="text-white uppercase tracking-widest text-[10px] md:text-xs mb-2 md:mb-3"
                    >
                      AI Recommendation
                    </Motion.h5>
                    <Motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.4 }}
                      className="text-gray-500 text-xs md:text-sm leading-relaxed"
                    >
                      Focus on Kubernetes and System Design to increase your match score to 95%+. Consider taking online courses or building relevant projects.
                    </Motion.p>
                  </div>
                </div>
              </Motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}