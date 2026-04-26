import React from 'react';
import { Link } from 'react-router-dom';
import { SECTORS } from '../data/mockData';

const HeroReportCard = ({ report }) => {
  if (!report) return null;

  const sector = SECTORS.find(s => s.id === report.sector_id) || { name: '기타', color: '#6B7280' };
  const sectorName = sector.name;
  const sectorColor = sector.color;
  const sectorBgColor = sector.bgColor || `${sectorColor}15`;

  const startDate = new Date(report.period_start);
  const endDate = new Date(report.period_end);
  const startDateStr = `${startDate.getFullYear()}.${startDate.getMonth() + 1}.${startDate.getDate()}`;
  const endDateStr = `${endDate.getMonth() + 1}.${endDate.getDate()}`;

  // Clean title: remove "주간 트렌드 리포트: " if it exists
  const formattedTitle = report.title.replace(/:\s*/, ' I ');

  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: 'var(--cd-text-primary)' }}>
        주목해야 할 핵심 리포트
      </h2>
      <Link to={`/reports/${report.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div 
          style={{ 
            background: 'var(--cd-bg-card)', 
            borderRadius: '16px', 
            border: `2px solid ${sectorBgColor}`,
            padding: '40px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = `0 16px 32px ${sectorBgColor}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {/* subtle background accent */}
          <div style={{
            position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px',
            background: `radial-gradient(circle, ${sectorBgColor} 0%, transparent 70%)`,
            zIndex: 0, borderRadius: '50%'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ 
                fontSize: '13px', fontWeight: '800', color: sectorColor,
                background: sectorBgColor, padding: '6px 14px', borderRadius: '8px',
              }}>
                {sectorName}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--cd-text-secondary)', fontWeight: '500' }}>
                {startDateStr} ~ {endDateStr}
              </span>
            </div>
            
            <h3 style={{ 
              fontSize: '28px', fontWeight: '800', marginBottom: '16px', 
              color: 'var(--cd-text-primary)', lineHeight: '1.4', wordBreak: 'keep-all'
            }}>
              {formattedTitle}
            </h3>
            
            <p style={{ 
              fontSize: '16px', color: 'var(--cd-text-secondary)', 
              lineHeight: '1.6', marginBottom: '32px', maxWidth: '800px'
            }}>
              {report.one_line_summary}
            </p>

            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              background: 'var(--cd-text-primary)', color: 'var(--cd-bg-main)',
              padding: '12px 24px', borderRadius: '30px', fontSize: '15px', fontWeight: '600'
            }}>
              리포트 전문 보기 <span>→</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default HeroReportCard;
