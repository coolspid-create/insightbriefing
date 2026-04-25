import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Activity } from 'lucide-react';
import './Hero.css';

const Hero = ({ onOpenTelegram, lastUpdated, allNews }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [latestReports, setLatestReports] = useState([]);

  // 날짜/시간 포맷팅
  useEffect(() => {
    const targetDate = lastUpdated ? new Date(lastUpdated) : new Date();
    const dateStr = `${targetDate.getFullYear()}년 ${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일`;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    
    setCurrentDate(`${dateStr} (${days[targetDate.getDay()]})`);
    setCurrentTime(`${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')} 기준`);
  }, [lastUpdated]);

  // 주간 리포트 데이터 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
        const res = await fetch(`${API_BASE_URL}/api/reports?limit=5`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setLatestReports(data);
      } catch (err) {
        console.error('Failed to fetch weekly reports for hero', err);
      }
    };
    fetchReports();
  }, []);

  const SECTOR_NAME_MAP = {
    'sector-ren': 'ENERGY / RENEWABLE',
    'sector-safe': 'PRODUCT SAFETY',
    'sector-const': 'CONSTRUCTION',
    'sector-ai': 'AI / TECHNOLOGY',
    'sector-comm': 'COMMERCE'
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

  return (
    <section className="hero-section">
      <div className="hero-bg-blobs">
        <div className="blob blob-main"></div>
        <div className="blob blob-aside"></div>
      </div>

      <div className="hero-container">
        {/* Left: Headline Area */}
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

        {/* Right: Latest Weekly Reports List */}
        <div className="hero-visual-area">
          <motion.div 
            className="hero-reports-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <div className="hero-reports-header">
              <div className="hero-reports-title">
                <Activity size={14} /> LATEST WEEKLY REPORTS
              </div>
              <Link to="/reports" className="hr-more-link-inline">
                전체보기 <ArrowRight size={12} />
              </Link>
            </div>

            {latestReports.map((report, idx) => {
              if (!report) return null;
              
              const start = new Date(report.period_start);
              const end = new Date(report.period_end);
              const dateStr = `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
              const sectorName = SECTOR_NAME_MAP[report.sector_id] || report.sector_id;

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (idx * 0.1) }}
                >
                  <Link to={`/reports/${report.id}`} className="hr-card">
                    <div className="hr-meta">
                      <span className="hr-sector">{sectorName}</span>
                      <span className="hr-date">{dateStr}</span>
                    </div>
                    <h4 className="hr-title">{report.title}</h4>
                    <p className="hr-summary">{report.one_line_summary}</p>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
