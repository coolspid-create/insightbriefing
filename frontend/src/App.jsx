import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Sector from './components/Sector';
import TelegramModal from './components/TelegramModal';
import AdminDashboard from './pages/AdminDashboard';
import WorkflowMonitor from './pages/WorkflowMonitor';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import { SECTORS } from './data/mockData';
import './App.css';

// 페이지 전환 시 항상 최상단으로 스크롤을 리셋하는 컴포넌트
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const MainLayout = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newsData, setNewsData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Intersection Observer for fade-in effect
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });

    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach(section => observer.observe(section));

    // Fetch news from API (Backend Database)
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
    fetch(`${API_BASE_URL}/api/news`)
      .then(res => res.json())
      .then(data => {
        if (data.news) {
          setNewsData(data.news);
          setLastUpdated(data.lastUpdated);
        } else {
          // 폴백: 이전 형식의 데이터인 경우
          setNewsData(data);
        }
      })
      .catch(err => console.error("데이터 로드 실패:", err));

    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, []);

  return (
    <div className="app-container">
      <Header />
      
      <main>
        <Hero 
          onOpenTelegram={() => setIsModalOpen(true)} 
          lastUpdated={lastUpdated} 
          allNews={newsData} 
        />
        
        <div className="sectors-container">
          {SECTORS.map(sector => (
            <Sector 
              key={sector.id} 
              sectorInfo={sector} 
              newsList={newsData ? (newsData[sector.id] || []) : []} 
            />
          ))}
        </div>
      </main>

      <footer className="footer thin-border-top" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--cd-text-light)', fontSize: '13px' }}>
        <p style={{ marginBottom: '12px', opacity: 0.7, fontSize: '11px', maxWidth: '600px', margin: '0 auto 16px', lineHeight: '1.6' }}>
          본 서비스의 브리핑 자료는 AI 기술을 활용하여 실시간 뉴스 데이터를 자동 수집 및 요약한 결과물입니다.<br />
          요약 과정에서 일부 오역이나 기술적 오류가 포함될 수 있으니 참고용으로 활용해 주시기 바랍니다.
        </p>
        <p>&copy; 2026 Insight Briefing. All Rights Reserved.</p>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ marginTop: '16px', fontSize: '13px', textDecoration: 'underline' }}
        >
          섹터별 텔레그램 채널 구독 안내
        </button>
        {/* 미세하게 눈에 띄는 관리자 페이지 이동 버튼 */}
        <div style={{ marginTop: '30px' }}>
           <Link to="/admin" style={{ color: '#e0e0e0', textDecoration: 'none', userSelect: 'none', display: 'inline-block', padding: '5px' }}>Admin</Link>
        </div>
      </footer>

      <TelegramModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/workflow" element={<WorkflowMonitor />} />
      </Routes>
    </Router>
  );
}

export default App;
