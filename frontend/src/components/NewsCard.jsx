import React, { useState } from 'react';
import './NewsCard.css';

const NewsCard = ({ news }) => {
  const [imgError, setImgError] = useState(false);

  const hasImage = news.image && !imgError;

  return (
    <article className="news-card thin-border-top">
      <div className="news-content">
        <div className="news-impact">
          {news.impact}
        </div>
        <h4 className="news-title serif-title">
          {news.title}
        </h4>
        <p className="news-summary">
          {news.summary}
        </p>
        <a href={news.link} target="_blank" rel="noopener noreferrer" className="news-link">
          기사 보기 &rarr;
        </a>
      </div>
      <div className="news-image-wrapper">
        {hasImage ? (
          <img 
            src={news.image} 
            alt={news.title} 
            className="news-image" 
            loading="lazy" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="news-image-fallback-container">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="news-fallback-icon">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
            </svg>
          </div>
        )}
      </div>
    </article>
  );
};

export default NewsCard;
