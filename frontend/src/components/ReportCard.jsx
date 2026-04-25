import React from 'react';
import { Link } from 'react-router-dom';
import { SECTORS } from '../data/mockData';

const ReportCard = ({ report }) => {
  const sector = SECTORS.find(s => s.id === report.sector_id);
  const sectorName = sector ? sector.name : report.sector_id;
  
  const sectorColors = {
    'sector-ren': '#10b981',
    'sector-safe': '#3b82f6',
    'sector-const': '#f59e0b',
    'sector-ai': '#8b5cf6',
    'sector-comm': '#ec4899'
  };
  const sectorColor = sectorColors[report.sector_id] || 'var(--cd-text-primary)';

  const startDateStr = new Date(report.period_start).toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric'
  });
  const endDateStr = new Date(report.period_end).toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric'
  });
  
  const formattedTitle = report.title.replace(/:\s*/, ' I ');

  return (
    <Link to={`/reports/${report.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div 
        style={{ 
          background: 'var(--cd-bg-card)', 
          borderRadius: '16px', 
          border: '1px solid var(--cd-border)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: sectorColor,
            background: `${sectorColor}15`,
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            {sectorName}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--cd-text-secondary)', fontWeight: '500' }}>
            {startDateStr} ~ {endDateStr}
          </span>
        </div>
        
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '700', 
          marginBottom: '12px', 
          color: 'var(--cd-text-primary)',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all'
        }}>
          {formattedTitle}
        </h3>
        
        <p style={{ 
          fontSize: '14px', 
          color: 'var(--cd-text-secondary)', 
          lineHeight: '1.6',
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {report.one_line_summary}
        </p>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--cd-border)', fontSize: '13px', color: 'var(--cd-text-primary)', fontWeight: '600', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
          리포트 읽기 <span style={{ fontSize: '16px' }}>→</span>
        </div>
      </div>
    </Link>
  );
};

export default ReportCard;
