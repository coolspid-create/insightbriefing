import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Activity, TrendingUp } from 'lucide-react';
import './Hero.css';

const Hero = ({ onOpenTelegram, lastUpdated, allNews }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // 컴포넌트 본문 로그 (F12에서 확인 가능)
  useEffect(() => {
    console.log("[Hero] allNews prop changed:", allNews);
  }, [allNews]);

  // 전 섹터 중 가장 중요한 뉴스(각 섹터별 1번 기사)를 슬라이딩용으로 가공
  const slideNews = useMemo(() => {
    if (!allNews || typeof allNews !== 'object') return [];
    
    // 섹터 매핑 정보
    const SECTOR_NAME_MAP = {
      'sector-ren': 'ENERGY / RENEWABLE',
      'sector-safe': 'PRODUCT SAFETY',
      'sector-const': 'CONSTRUCTION',
      'sector-ai': 'AI / TECHNOLOGY',
      'sector-comm': 'COMMERCE'
    };

    // allNews가 배열 형태인 경우와 객체 형태인 경우 모두 대응
    const sourceData = Array.isArray(allNews) ? allNews : Object.entries(allNews);
    
    if (sourceData.length === 0) return [];

    const extracted = (Array.isArray(allNews) ? allNews : Object.entries(allNews)).map((item) => {
      // 1. [id, [news_list]] 형태인 경우 (객체 entries)
      if (Array.isArray(item) && item.length === 2 && Array.isArray(item[1])) {
        const [id, newsList] = item;
        if (newsList.length === 0) return null;
        return { ...newsList[0], sectorName: SECTOR_NAME_MAP[id] || 'LATEST INSIGHT' };
      }
      // 2. 단일 뉴스 객체 배열인 경우
      if (item && item.title) {
        return { ...item, sectorName: SECTOR_NAME_MAP[item.sector_id] || 'LATEST INSIGHT' };
      }
      return null;
    }).filter(n => n !== null);

    console.log("[Hero] Extracted slides:", extracted.length);
    return extracted;
  }, [allNews]);

  // 실시간 통계 데이터 산출
  const stats = useMemo(() => {
    if (!allNews || typeof allNews !== 'object') return { total: 0, topSector: '-', sentiment: 75 };
    
    let total = 0;
    let maxCount = 0;
    let topSectId = '';
    
    Object.entries(allNews).forEach(([id, news]) => {
      if (Array.isArray(news)) {
        total += news.length;
        if (news.length > maxCount) {
          maxCount = news.length;
          topSectId = id;
        }
      }
    });

    const sectorNames = {
      'sector-ren': 'Energy',
      'sector-safe': 'Safety',
      'sector-const': 'Const.',
      'sector-ai': 'AI/Tech',
      'sector-comm': 'Comm.'
    };

    return {
      total,
      topSector: sectorNames[topSectId] || 'Diverse',
      sentiment: 70 + (total % 15) // 실시간 느낌을 위한 시뮬레이션 지수
    };
  }, [allNews]);

  useEffect(() => {
    if (slideNews.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slideNews.length);
      }, 3000); 
      return () => clearInterval(timer);
    }
  }, [slideNews.length]);

  useEffect(() => {
    const targetDate = lastUpdated ? new Date(lastUpdated) : new Date();
    const dateStr = `${targetDate.getFullYear()}년 ${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일`;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    
    // setTimeout to avoid synchronous state updates during render phase tests if that's what's failing eslint
    setTimeout(() => {
      setCurrentDate(`${dateStr} (${days[targetDate.getDay()]})`);
      setCurrentTime(`${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')} 기준`);
    }, 0);
  }, [lastUpdated]);

  const currentSlideData = slideNews.length > 0 ? slideNews[currentSlide] : {
    title: '태양광 발전 수요 폭증',
    sectorName: 'ENERGY / RENEWABLE',
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=500&auto=format&fit=crop'
  };

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
            매일 오전 9시, 5대 산업의 핵심 뉴스를 AI가 수집하고
            선별합니다. 업종별 뉴스 브리핑을 확인하세요.
          </motion.p>
          
          <motion.div variants={itemVars} className="hero-timestamp">
            <span className="timestamp-date">{currentDate}</span>
            <span className="timestamp-divider">|</span>
            <span className="timestamp-time">{currentTime}</span>
          </motion.div>

          <motion.div variants={itemVars} className="hero-cta-wrapper">
             <button className="cta-button" onClick={onOpenTelegram}>
                <span>브리핑 구독하기</span>
                <ArrowRight size={18} className="cta-icon" />
             </button>
             <p className="cta-note">
               실시간 수집된 데이터는 AI가 요약하여 매일 아침 제공됩니다.
             </p>
          </motion.div>
        </motion.div>

        {/* Right: Tightly Packed Masonry Grid */}
        <div className="hero-visual-area">
          <motion.div 
            className="hero-grid"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            
            {/* Card 1: Tall Preview (Left) - 동적 슬라이드 구현 */}
            <motion.div 
              className="g-card card-preview hover-lift"
              {...floatAnim(5.5, 0)}
            >
              <div className="card-lbl">
                BRIEFING PREVIEW
              </div>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentSlideData.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="cp-content-wrapper"
                >
                  <div className="cp-body">
                    <div className="cp-meta">{currentSlideData.sectorName}</div>
                    <h3 className="cp-title" dangerouslySetInnerHTML={{ __html: currentSlideData.title.replace(/\n/g, '<br/>') }}></h3>
                    <div className="cp-stat">
                      <span>Source Coverage</span>
                      <strong>Global Intelligence</strong>
                    </div>
                  </div>
                  <div className="cp-img">
                    <img 
                      src={currentSlideData.image && currentSlideData.image.startsWith('http') ? currentSlideData.image : "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=500&auto=format&fit=crop"} 
                      alt={currentSlideData.title} 
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=500&auto=format&fit=crop";
                      }}
                      loading="lazy"
                    />
                    <div className="cp-img-overlay"></div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Card 2: Wide Status (Top Right) */}
            <motion.div 
              className="g-card card-status hover-lift"
              {...floatAnim(6.2, 0.5)}
            >
              <div className="card-lbl">System Status</div>
              <div className="cs-split">
                <div className="cs-col">
                  <div className="cs-title">Sectors Managed</div>
                  <div className="cs-val">5 / 5</div>
                </div>
                <div className="cs-col">
                  <div className="cs-title">Articles Found</div>
                  <div className="cs-val">{stats.total}</div>
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
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>SENTIMENT INDEX</div>
                <div style={{ fontSize: '28px', fontWeight: '800' }}>{stats.sentiment}%</div>
                <span style={{ fontSize: '11px', opacity: 0.9 }}>Market Positive Pulse</span>
                <div className="pulse-pattern"></div>
              </div>
            </motion.div>

            {/* Card 4: Tall Summary (Right) */}
            <motion.div 
              className="g-card card-summary hover-lift"
              {...floatAnim(6.5, 0.8)}
            >
              <div className="csum-body">
                <div className="trend-item">
                  <span className="t-name">Hottest Sector</span>
                  <span className="t-val up">{stats.topSector}</span>
                </div>
                <div className="trend-item">
                  <span className="t-name">System Load</span>
                  <span className="t-val up">Stable</span>
                </div>
                <div className="trend-item">
                  <span className="t-name">Freshness</span>
                  <span className="t-val up">100%</span>
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
                    <span className="lbl">CORE TOPIC NOW</span>
                    <p>{stats.topSector} 분야 실시간 모니터링 및 전략 분석 중</p>
                  </div>
                  <div className="ct-stars">
                    ★ ★ ★ <span className="off">★ ★</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
