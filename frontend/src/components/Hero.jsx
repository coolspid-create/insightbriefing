import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Activity, TrendingUp } from 'lucide-react';
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

  const containerVars = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 90 } }
  };

  // Floating animation helper
  const floatAnim = (duration, delay) => ({
    animate: { y: [0, -12, 0] },
    transition: {
      duration: duration,
      repeat: Infinity,
      ease: "easeInOut",
      delay: delay
    }
  });

  return (
    <section className="hero-section">
      <div className="hero-bg-blobs">
        <div className="blob blob-main"></div>
        <div className="blob blob-aside"></div>
      </div>

      <div className="hero-container">
        {/* Left: Text Area */}
        <motion.div 
          className="hero-text-area"
          variants={containerVars}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVars} className="hero-eyebrow">
            <Sparkles size={14} className="eyebrow-icon" />
            DAILY INDUSTRY INTELLIGENCE
          </motion.div>
          
          <motion.h1 variants={itemVars} className="hero-headline">
            지난 24시간,<br />
            <span className="text-highlight">산업의 결정적 시그널</span>만<br />
            담았습니다
          </motion.h1>
          
          <motion.p variants={itemVars} className="hero-subheadline">
            매일 오전, 5대 핵심 산업에서 벌어지는 핵심 뉴스를 AI가 수집하고 전문가가 선별합니다. 
            업종별 핵심 뉴스 브리핑을 확인하세요.
          </motion.p>
          
          <motion.div variants={itemVars} className="hero-timestamp">
            <span className="timestamp-date">{currentDate}</span>
            <span className="timestamp-divider">|</span>
            <span className="timestamp-time">{currentTime}</span>
          </motion.div>

          <motion.div variants={itemVars} className="hero-cta-wrapper">
             <button className="cta-button" onClick={onOpenTelegram}>
                <span>3분 브리핑 구독하기</span>
                <ArrowRight size={18} className="cta-icon" />
             </button>
             <p className="cta-note">
               실시간 수집된 데이터는 AI가 요약하여 매일 아침 제공됩니다.
             </p>
          </motion.div>
        </motion.div>

        {/* Right: Tightly Packed Masonry Grid */}
        <div className="hero-visual-area">
          <AnimatePresence>
            <motion.div 
              className="hero-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              
              {/* Card 1: Tall Preview (Left) */}
              <motion.div 
                className="g-card card-preview hover-lift"
                {...floatAnim(5.5, 0)}
              >
                <div className="card-lbl">BRIEFING PREVIEW</div>
                <div className="cp-body">
                  <div className="cp-meta">ENERGY / RENEWABLE</div>
                  <h3 className="cp-title">태양광 발전<br/>수요 폭증</h3>
                  <div className="cp-stat">
                    <span>Impact</span>
                    <strong>High</strong>
                  </div>
                </div>
                <div className="cp-img">
                  <img src="https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=500&auto=format&fit=crop" alt="Solar Farm" />
                </div>
              </motion.div>

              {/* Card 2: Wide Status (Top Right) */}
              <motion.div 
                className="g-card card-status hover-lift"
                {...floatAnim(6.2, 0.5)}
              >
                <div className="card-lbl">System Status</div>
                <div className="cs-split">
                  <div className="cs-col">
                    <div className="cs-title">Sectors Analyzed</div>
                    <div className="cs-val">5 / 5</div>
                  </div>
                  <div className="cs-col">
                    <div className="cs-title">Pipelines</div>
                    <div className="cs-val">12</div>
                  </div>
                </div>
                <div className="cs-pattern"></div>
              </motion.div>

              {/* Card 3: Square Solid (Center) */}
              <motion.div 
                className="g-card card-pulse hover-lift"
                {...floatAnim(5.8, 1.2)}
              >
                <div className="pulse-inner">
                  <div className="pulse-pattern"></div>
                  <Activity color="rgba(255,255,255,0.9)" size={32} />
                  <span>Real-time<br/>AI Sync</span>
                </div>
              </motion.div>

              {/* Card 4: Tall Summary (Right) */}
              <motion.div 
                className="g-card card-summary hover-lift"
                {...floatAnim(6.5, 0.8)}
              >
                <div className="card-lbl">SECTOR TREND</div>
                <div className="csum-body">
                  <div className="trend-item">
                    <div className="t-name">Tech</div>
                    <div className="t-val up">+5.2%</div>
                  </div>
                  <div className="trend-item">
                    <div className="t-name">Logistics</div>
                    <div className="t-val down">-1.4%</div>
                  </div>
                  <div className="trend-item">
                    <div className="t-name">Energy</div>
                    <div className="t-val up">+3.1%</div>
                  </div>
                </div>
                <div className="csum-img">
                  <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=400&auto=format&fit=crop" alt="Lab" />
                </div>
              </motion.div>

              {/* Card 5: Wide Tracking (Bottom Left) */}
              <motion.div 
                className="g-card card-tracking hover-lift"
                {...floatAnim(6, 0.2)}
              >
                <div className="ct-body">
                  <div className="ct-head">
                    <div className="ct-badge"><TrendingUp size={12}/> Live tracking</div>
                    <div className="ct-progress"><div className="bar"></div></div>
                  </div>
                  <div className="ct-content">
                    <div className="ct-text">
                      <span className="lbl">TOPIC</span>
                      <p>AI 반도체 수요 및 주요 기업 대응 전략</p>
                    </div>
                    <div className="ct-stars">
                      ★ ★ ★ <span className="off">★ ★</span>
                    </div>
                  </div>
                </div>
              </motion.div>

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Hero;
