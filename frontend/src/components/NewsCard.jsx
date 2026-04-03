import React from 'react';
import './NewsCard.css';

const NewsCard = ({ news }) => {
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
        <img 
          src={news.image || `https://picsum.photos/seed/${encodeURIComponent(news.title || 'news')}/400/300`} 
          alt={news.title} 
          className="news-image" 
          loading="lazy" 
        />
      </div>
    </article>
  );
};

export default NewsCard;
