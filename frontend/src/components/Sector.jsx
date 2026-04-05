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
          {newsList && newsList.length > 0 ? (
            newsList.map((news, idx) => (
              <NewsCard key={news.id || idx} news={news} />
            ))
          ) : (
            // Skeleton Placeholders
            [1, 2, 3].map(i => (
              <div key={i} className="skeleton-card thin-border">
                <div className="skeleton-image"></div>
                <div className="skeleton-body">
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line text"></div>
                  <div className="skeleton-line text short"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Sector;
