import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Smart Auto-Fill', href: '#auto-fill' },
  { label: 'AI Matching', href: '#ai-matching' }
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="#232323"/>
              <path d="M14 16V14.8C14 13.53 15.03 12.5 16.3 12.5H23.7C24.97 12.5 26 13.53 26 14.8V16"
                    stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <rect x="9" y="16" width="22" height="14" rx="3.5"
                    stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span className="text-xl font-normal text-white">JobAssist AI</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item, index) => (
              <motion.a
                key={item.label}
                href={item.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="text-gray-300 hover:text-white transition-colors duration-300 font-light"
              >
                {item.label}
              </motion.a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-gray-300 hover:text-white transition-colors duration-300 font-light"
              onClick={() => navigate('/login')}
            >
              Sign In
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              className="px-6 py-2.5 bg-white hover:bg-gray-100 text-black rounded-lg font-normal transition-all duration-300"
              onClick={() => navigate('/register')}
            >
              Get Started
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white p-2 hover:bg-white/5 rounded-lg transition-colors duration-300"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden pb-6 border-t border-white/10"
          >
            {/* Quick Actions */}
            <div className="flex gap-3 pt-6 pb-4">
              <button onClick={() => navigate('/register')} className="flex-1 px-4 py-3 bg-white hover:bg-gray-100 text-black rounded-lg font-normal transition-all duration-300 text-center">
                Get Started
              </button>
              <button onClick={() => navigate('/login')} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-light transition-all duration-300 border border-white/10 text-center">
                Sign In
              </button>
            </div>
            
            {/* Navigation Links */}
            <div className="flex flex-col gap-1 pt-4 border-t border-white/10">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300 py-3 px-4 rounded-lg font-light"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}