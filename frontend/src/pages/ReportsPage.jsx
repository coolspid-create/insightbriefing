import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { SECTORS } from '../data/mockData';
import WeeklySummaryBox from '../components/WeeklySummaryBox';
import HeroReportCard from '../components/HeroReportCard';
import CompactReportCard from '../components/CompactReportCard';
import ArchiveAccordion from '../components/ArchiveAccordion';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('weekly'); // daily, weekly, monthly
  const [filterSector, setFilterSector] = useState('all');

  useEffect(() => {
    fetchReports();
  }, [filterType, filterSector]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      let url = `${API_BASE_URL}/api/reports?limit=50`;
      if (filterType !== 'all') url += `&reportType=${filterType}`;
      if (filterSector !== 'all') url += `&sectorId=${filterSector}`;

      const res = await fetch(url);
      const data = await res.json();
      setReports(data || []);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  // Group reports by period_end to separate 'This week' from 'Archives'
  const groupedReports = reports.reduce((acc, report) => {
    // Grouping key: we use period_end as the grouping identifier
    const date = new Date(report.period_end);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(report);
    return acc;
  }, {});

  // Sort groups by date descending
  const sortedKeys = Object.keys(groupedReports).sort((a, b) => new Date(b) - new Date(a));
  
  let currentWeekReports = [];
  let pastWeeks = [];

  if (sortedKeys.length > 0) {
    const currentWeekKey = sortedKeys[0];
    currentWeekReports = groupedReports[currentWeekKey];
    
    // Remaining keys are past weeks
    pastWeeks = sortedKeys.slice(1).map(key => {
      const start = new Date(groupedReports[key][0].period_start);
      const end = new Date(groupedReports[key][0].period_end);
      const label = `${start.getMonth() + 1}.${start.getDate()} ~ ${end.getMonth() + 1}.${end.getDate()}`;
      return { label, reports: groupedReports[key] };
    });
  }

  // Determine Hero and Latest 5 from currentWeekReports
  const heroReport = currentWeekReports.length > 0 ? currentWeekReports[0] : null;
  
  // Pick up to 5 unique sector reports if possible, otherwise just the next 5
  let latest5 = [];
  if (currentWeekReports.length > 1) {
    const seenSectors = new Set();
    // first pass: unique sectors
    for (let i = 1; i < currentWeekReports.length; i++) {
      const r = currentWeekReports[i];
      if (!seenSectors.has(r.sector_id)) {
        latest5.push(r);
        seenSectors.add(r.sector_id);
      }
      if (latest5.length >= 5) break;
    }
    // second pass: fill up to 5 if needed
    if (latest5.length < 5) {
      for (let i = 1; i < currentWeekReports.length; i++) {
        const r = currentWeekReports[i];
        if (!latest5.some(item => item.id === r.id)) {
          latest5.push(r);
        }
        if (latest5.length >= 5) break;
      }
    }
  }

  // Filter button styles
  const getFilterStyle = (isActive) => ({
    padding: '10px 20px',
    borderRadius: '30px',
    border: 'none',
    background: isActive ? 'var(--cd-text-primary)' : 'transparent',
    color: isActive ? 'var(--cd-bg-main)' : 'var(--cd-text-primary)',
    fontWeight: isActive ? '700' : '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  return (
    <div className="app-container" style={{ background: 'var(--cd-bg-main)', minHeight: '100vh', paddingBottom: '60px' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '100px auto 0', padding: '0 20px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px', color: 'var(--cd-text-primary)' }}>트렌드 리포트</h1>
          <p style={{ fontSize: '16px', color: 'var(--cd-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            산업별 주요 이슈와 시장 변화를 한눈에 파악하는 프리미엄 인사이트 브리핑
          </p>
        </div>

        {/* Simplified Filters */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px', 
          marginBottom: '48px',
          padding: '24px',
          background: 'var(--cd-bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--cd-border)'
        }}>
          {/* Sector Filter */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <span style={{ 
              fontWeight: '700', 
              color: 'var(--cd-text-secondary)', 
              width: '50px', 
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '10px'
            }}>섹터</span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                style={getFilterStyle(filterSector === 'all')} 
                onClick={() => setFilterSector('all')}
                onMouseEnter={(e) => ! (filterSector === 'all') && (e.currentTarget.style.background = 'var(--cd-bg-main)')}
                onMouseLeave={(e) => ! (filterSector === 'all') && (e.currentTarget.style.background = 'transparent')}
              >전체</button>
              {SECTORS.map(sector => (
                <button 
                  key={sector.id} 
                  style={getFilterStyle(filterSector === sector.id)} 
                  onClick={() => setFilterSector(sector.id)}
                  onMouseEnter={(e) => ! (filterSector === sector.id) && (e.currentTarget.style.background = 'var(--cd-bg-main)')}
                  onMouseLeave={(e) => ! (filterSector === sector.id) && (e.currentTarget.style.background = 'transparent')}
                >
                  {sector.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cd-text-secondary)' }}>
            리포트를 불러오는 중입니다...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cd-text-secondary)', background: 'var(--cd-bg-card)', borderRadius: '16px', border: '1px solid var(--cd-border)' }}>
            해당 조건의 리포트가 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            
            {/* 1. This Week Key Summary Box */}
            <section>
              <WeeklySummaryBox />
            </section>

            {/* 2. Hero Report Card */}
            {heroReport && (
              <section>
                <HeroReportCard report={heroReport} />
              </section>
            )}

            {/* 3. Latest 5 Weekly Reports */}
            {latest5.length > 0 && (
              <section>
                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--cd-text-primary)' }}>
                  이번 주 섹터별 주요 리포트
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                  {latest5.map(report => (
                    <CompactReportCard key={report.id} report={report} />
                  ))}
                </div>
              </section>
            )}

            {/* 4. Past Reports Archives */}
            {pastWeeks.length > 0 && (
              <section style={{ marginTop: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--cd-text-primary)' }}>
                  지난 리포트 아카이브
                </h2>
                {pastWeeks.map((week, idx) => (
                  <ArchiveAccordion key={idx} weekLabel={week.label} reports={week.reports} />
                ))}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportsPage;

