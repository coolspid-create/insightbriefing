import React from 'react';
import { Link } from 'react-router-dom';
import { SECTORS } from '../data/mockData';

const CompactReportCard = ({ report }) => {
  if (!report) return null;

  const sector = SECTORS.find(s => s.id === report.sector_id) || { name: '기타', color: '#6B7280' };
  const sectorName = sector.name;
  const sectorColor = sector.color;
  const sectorBgColor = sector.bgColor || `${sectorColor}15`;

  const startDate = new Date(report.period_start);
  const endDate = new Date(report.period_end);
  const startDateStr = `${startDate.getMonth() + 1}.${startDate.getDate()}`;
  const endDateStr = `${endDate.getMonth() + 1}.${endDate.getDate()}`;

  const formattedTitle = report.title.replace(/:\s*/, ' I ');
  const keywords = report.keywords ? report.keywords.split(',') : [];

  return (
    <Link to={`/reports/${report.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      <div 
        style={{ 
          background: 'var(--cd-bg-card)', 
          borderRadius: '12px', 
          border: '1px solid var(--cd-border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ 
            fontSize: '11px', fontWeight: '800', color: sectorColor,
            background: sectorBgColor, padding: '4px 10px', borderRadius: '6px',
            display: 'inline-block'
          }}>
            {sectorName}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--cd-text-secondary)', fontWeight: '500' }}>
            {startDateStr} ~ {endDateStr}
          </span>
        </div>
        
        <h3 style={{ 
          fontSize: '15px', fontWeight: '700', marginBottom: '12px', 
          color: 'var(--cd-text-primary)', lineHeight: '1.4',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {formattedTitle}
        </h3>
        
        {keywords.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', flex: 1 }}>
            {keywords.map((kw, i) => (
              <span key={i} style={{ 
                fontSize: '11px', color: 'var(--cd-text-secondary)', background: 'var(--cd-bg-main)', 
                padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--cd-border)'
              }}>
                #{kw.substring(0, 10)}
              </span>
            ))}
          </div>
        )}

        <div style={{ 
          marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--cd-border)', 
          fontSize: '12px', color: 'var(--cd-text-primary)', fontWeight: '600', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>브리핑 보기</span>
          <span style={{ fontSize: '14px' }}>→</span>
        </div>
      </div>
    </Link>
  );
};

export default CompactReportCard;
