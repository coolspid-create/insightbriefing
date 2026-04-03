import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Activity, Zap, BarChart3, TrendingUp, Globe, ShieldCheck } from 'lucide-react';
import './Hero.css';

const Hero = ({ onOpenTelegram }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    setCurrentDate(`${dateStr} (${days[now.getDay()]})`);
    setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 기준`);
  }, []);

  // Framer Motion Variants
  const containerVars = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 90 } }
  };

  const floatingTransition = (duration, delay = 0) => ({
    y: {
      repeat: Infinity,
      duration: duration,
      ease: "easeInOut",
      repeatType: "reverse",
      delay: delay
    },
    opacity: { duration: 0.7, delay: delay * 0.5 + 0.3 }
  });

  return (
    <section className="hero thin-border-bottom relative overflow-hidden">
      {/* Background decoration */}
      <div className="hero-glow-blob blob-1"></div>
      <div className="hero-glow-blob blob-2"></div>

      <div className="container hero-layout">
        
        {/* LEFT: Text Content */}
        <motion.div 
          className="hero-content"
          variants={containerVars}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVars} className="hero-badge">
            <span className="badge-icon"><Sparkles size={14} /></span>
            <span>DAILY INDUSTRY INTELLIGENCE</span>
          </motion.div>
          
          <motion.h1 variants={itemVars} className="hero-title">
            지난 24시간,<br />
            <span className="title-highlight">산업의 결정적 시그널</span>만<br />
            담았습니다
          </motion.h1>
          
          <motion.p variants={itemVars} className="hero-desc">
            매일 오전, 5대 핵심 산업에서 벌어지는 핵심 뉴스를 AI가 수집하고<br className="desktop-only" />
            전문가가 선별합니다. 업종별 핵심 뉴스 브리핑을<br className="desktop-only" /> 
            3분 안에 파악하세요.
          </motion.p>
          
          <motion.div variants={itemVars} className="hero-meta">
            <span className="hero-date">{currentDate}</span>
            <span className="hero-divider">|</span>
            <span className="hero-time">{currentTime}</span>
          </motion.div>

          <motion.div variants={itemVars} className="hero-actions">
             <button className="subscribe-btn" onClick={onOpenTelegram}>
                <span>3분 브리핑 구독하기</span>
                <ArrowRight size={18} className="btn-icon" />
             </button>
             <p className="hero-disclaimer">
               실시간 수집된 데이터는 AI가 요약하여 매일 아침 제공됩니다.
             </p>
          </motion.div>
        </motion.div>

        {/* RIGHT: Floating Visuals */}
        <div className="hero-visual">
          <AnimatePresence>
            {/* Card 1: Top Right - Sector Status */}
            <motion.div 
              className="floating-card card-sectors"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, 8, 0], opacity: 1 }}
              transition={floatingTransition(5, 0.2)}
              whileHover={{ scale: 1.05, zIndex: 10, transition: { duration: 0.2 } }}
            >
              <div className="card-top-label">System Status</div>
              <div className="card-padding">
                <span className="stat-label">SECTORS ANALYZED</span>
                <div className="stat-value" style={{marginBottom: '12px', fontSize: '20px'}}>5 / 5</div>
                <div className="status-bars">
                  <div className="status-bar active"></div>
                  <div className="status-bar active"></div>
                  <div className="status-bar active"></div>
                  <div className="status-bar active"></div>
                  <div className="status-bar active"></div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Center Left - Report Preview (Solar Focus) */}
            <motion.div 
              className="floating-card card-insight"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, -6, 0], opacity: 1 }}
              transition={floatingTransition(6, 0.6)}
              whileHover={{ scale: 1.05, zIndex: 10, transition: { duration: 0.2 } }}
            >
              <div className="card-top-label">Briefing Preview</div>
              <div className="card-split-content">
                <div className="card-left-content">
                  <div className="card-sub-label">ENERGY / RENEWABLE</div>
                  <h3 className="card-main-title">태양광 발전<br/>수요 폭증</h3>
                </div>
                <div className="card-right-stats">
                  <div className="stat-block">
                    <span className="stat-label">Impact</span>
                    <span className="stat-value">High</span>
                  </div>
                  <div className="stat-block">
                    <span className="stat-label">Growth</span>
                    <span className="stat-value">+15%</span>
                  </div>
                </div>
              </div>
              <div className="card-visual-area no-dot">
                <img src="/assets/solar-briefing.png" alt="Solar Farm Preview" className="preview-image" />
              </div>
            </motion.div>

            {/* Card 3: Bottom Right - Real-time tracking */}
            <motion.div 
              className="floating-card card-tracking"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, -10, 0], opacity: 1 }}
              transition={floatingTransition(5.5, 0.4)}
              whileHover={{ scale: 1.05, zIndex: 10, transition: { duration: 0.2 } }}
            >
              <div className="card-header-icon">
                <div className="icon-box"><Activity size={12} color="#fff" /></div>
                <span>Live tracking</span>
              </div>
              <div className="tracking-progress">
                <div className="tracking-fill"></div>
              </div>
              <div className="tracking-details">
                <span className="stat-label">KEY FOCUS</span>
                <p className="tracking-text">AI 반도체 수요 증가와<br/>주요 기업 대응 전략</p>
                <div className="tracking-stars">
                  <span className="star active">★</span>
                  <span className="star active">★</span>
                  <span className="star active">★</span>
                  <span className="star">★</span>
                  <span className="star">★</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
      </div>
    </section>
  );
};

export default Hero;
