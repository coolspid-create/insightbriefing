import React, { useState } from 'react';
import CompactReportCard from './CompactReportCard';

const ArchiveAccordion = ({ weekLabel, reports }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ 
      marginBottom: '16px', 
      border: '1px solid var(--cd-border)', 
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'var(--cd-bg-card)'
    }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--cd-text-primary)' }}>
          {weekLabel} 주차 리포트 <span style={{ color: 'var(--cd-text-secondary)', fontWeight: '400', fontSize: '14px', marginLeft: '8px' }}>({reports.length}개)</span>
        </span>
        <span style={{ 
          fontSize: '12px', color: 'var(--cd-text-secondary)', transition: 'transform 0.3s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 24px 24px 24px', borderTop: '1px solid var(--cd-border)', paddingTop: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {reports.map(report => (
              <CompactReportCard key={report.id} report={report} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveAccordion;
