import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SECTORS } from '../data/mockData';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // 다른 페이지에서 이동할 때는 이동 즉시 최상단으로 가도록 처리
      navigate('/');
      window.scrollTo(0, 0);
    }
  };

  const handleTabClick = (id) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
    } else {
      scrollToSector(id);
    }
  };

  const scrollToSector = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80, // account for sticky header
        behavior: 'smooth'
      });
    }
  };


  return (
    <header className="header thin-border-bottom">
      <div className="container header-content">
        <div 
          className="logo-area" 
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
        >
          <div className="logo thin-border">IB</div>
          <div className="title-area">
            <div className="title-subtitle">STRATEGY NEWS DESK</div>
            <h1 className="title serif-title">INSIGHT BRIEFING</h1>
          </div>
        </div>
        
        <nav className="nav-tabs">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', paddingRight: '16px', borderRight: '1px solid var(--cd-border)' }}>
            <button 
              className="tab-button"
              style={{ 
                fontWeight: location.pathname.startsWith('/reports') ? '700' : '500', 
                color: location.pathname.startsWith('/reports') ? 'var(--cd-text-primary)' : 'var(--cd-text-secondary)',
                background: location.pathname.startsWith('/reports') ? 'var(--cd-bg-hover)' : 'transparent',
                borderRadius: '6px',
                padding: '6px 12px'
              }}
              onClick={() => navigate('/reports')}
            >
              📈 트렌드 리포트
            </button>
          </div>
          {SECTORS.map(sector => (
            <button 
              key={sector.id} 
              className="tab-button"
              onClick={() => handleTabClick(sector.id)}
            >
              {sector.tabText}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
