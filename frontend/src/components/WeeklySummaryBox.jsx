import React from 'react';
import { SECTORS } from '../data/mockData';

const WeeklySummaryBox = () => {
  const summaries = [
    { id: 'sector-ai', text: '글로벌 표준화 경쟁 심화와 보안 규제 강화로 인한 시장 재편 움직임' },
    { id: 'sector-comm', text: '초개인화 AI 기술 도입으로 인한 소비자 경험 혁신 및 거래 구조 변화 가속' },
    { id: 'sector-ren', text: '긍정적인 정책 지원 기대감과 단기적 수익성 불확실성이 공존하는 상황' },
    { id: 'sector-safe', text: 'KC 인증 기준 강화에 따른 제조사들의 인증 대응 비용 증가 및 품질 강화 요구' },
    { id: 'sector-const', text: '친환경 프리미엄 자재 수요 확대와 스마트 홈 기술 결합을 통한 주거 가치 재정의' }
  ];

  return (
    <div style={{
      background: 'var(--cd-bg-card)',
      borderRadius: '16px',
      border: '1px solid var(--cd-border)',
      padding: '32px',
      marginBottom: '40px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '28px',
        color: 'var(--cd-text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '24px' }}>💡</span> 이번 주 산업 트렌드 핵심
      </h2>
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {summaries.map(item => {
          const sector = SECTORS.find(s => s.id === item.id) || { name: item.id, color: '#6B7280' };
          return (
            <li key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '11px', fontWeight: '800', color: sector.color,
                background: sector.bgColor, padding: '4px 12px', borderRadius: '6px',
                minWidth: '90px', textAlign: 'center', flexShrink: 0,
                display: 'inline-block'
              }}>
                {sector.name}
              </span>
              <p style={{ fontSize: '15px', color: 'var(--cd-text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {item.text}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WeeklySummaryBox;
