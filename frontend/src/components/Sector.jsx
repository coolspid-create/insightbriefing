import React from 'react';
import NewsCard from './NewsCard';
import './Sector.css';

const Sector = ({ sectorInfo, newsList }) => {
  return (
    <section id={sectorInfo.id} className="sector fade-in-section">
      <div className="container">
        <div className="sector-header">
          <div>
            <div className="sector-label">SECTOR</div>
            <h2 className="sector-title">{sectorInfo.name}</h2>
          </div>
          <div className="sector-actions">
              <a 
                href={sectorInfo.telegramUrl || "https://t.me/insight_briefing_main"} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="sector-telegram-btn thin-border"
              >
                섹터 구독하기
              </a>
          </div>
        </div>
        
        <div className="news-grid">
          {newsList.map(news => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Sector;
