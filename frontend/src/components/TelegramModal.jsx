import React from 'react';
import { SECTORS } from '../data/mockData';
import './TelegramModal.css';

const TelegramModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content thin-border">
        <div className="modal-header">
          <h3 className="modal-title serif-title">섹터별 텔레그램 채널</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="modal-desc">원하는 산업 섹터를 선택하여 구독하시면 매일 오전 9시 핵심 뉴스를 보내드립니다.</p>
          <ul className="modal-list">
            {SECTORS.map(sector => (
              <li key={sector.id} className="modal-list-item thin-border-bottom">
                <span className="modal-sector-name">{sector.name}</span>
                <a 
                  href="https://t.me/insight_briefing_main" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="modal-sub-btn"
                >
                  구독하기
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TelegramModal;
