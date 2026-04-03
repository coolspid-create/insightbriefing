import React from 'react';
import { SECTORS } from '../data/mockData';
import './Header.css';

const Header = () => {
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
        <div className="logo-area">
          <div className="logo thin-border">IB</div>
          <div className="title-area">
            <div className="title-subtitle">STRATEGY NEWS DESK</div>
            <h1 className="title serif-title">INSIGHT BRIEFING</h1>
          </div>
        </div>
        
        <nav className="nav-tabs">
          {SECTORS.map(sector => (
            <button 
              key={sector.id} 
              className="tab-button"
              onClick={() => scrollToSector(sector.id)}
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
