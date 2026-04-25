import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { SECTORS } from '../data/mockData';
import ReportCard from '../components/ReportCard';

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

  return (
    <div className="app-container" style={{ background: 'var(--cd-bg-main)', minHeight: '100vh', paddingBottom: '60px' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '100px auto 0', padding: '0 20px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px', color: 'var(--cd-text-primary)' }}>트렌드 리포트</h1>
          <p style={{ fontSize: '16px', color: 'var(--cd-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            산업별 주요 이슈와 시장 변화를 한눈에 파악하는 프리미엄 인사이트 브리핑
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px', background: 'var(--cd-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--cd-border)' }}>
          
          {/* Report Type Filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: 'var(--cd-text-primary)', width: '60px' }}>유형</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setFilterType('weekly')}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--cd-border)', cursor: 'pointer', transition: 'all 0.2s',
                  background: filterType === 'weekly' ? 'var(--cd-text-primary)' : 'transparent',
                  color: filterType === 'weekly' ? 'var(--cd-bg-main)' : 'var(--cd-text-primary)'
                }}
              >
                주간 (Weekly)
              </button>
            </div>
          </div>

          {/* Sector Filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600', color: 'var(--cd-text-primary)', width: '60px' }}>섹터</span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setFilterSector('all')}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--cd-border)', cursor: 'pointer', transition: 'all 0.2s',
                  background: filterSector === 'all' ? 'var(--cd-text-primary)' : 'transparent',
                  color: filterSector === 'all' ? 'var(--cd-bg-main)' : 'var(--cd-text-primary)'
                }}
              >
                전체
              </button>
              {SECTORS.map(sector => (
                <button 
                  key={sector.id}
                  onClick={() => setFilterSector(sector.id)}
                  style={{ 
                    padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--cd-border)', cursor: 'pointer', transition: 'all 0.2s',
                    background: filterSector === sector.id ? 'var(--cd-text-primary)' : 'transparent',
                    color: filterSector === sector.id ? 'var(--cd-bg-main)' : 'var(--cd-text-primary)'
                  }}
                >
                  {sector.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cd-text-secondary)' }}>
            리포트를 불러오는 중입니다...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cd-text-secondary)', background: 'var(--cd-bg-card)', borderRadius: '12px', border: '1px solid var(--cd-border)' }}>
            해당 조건의 리포트가 없습니다.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {reports.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportsPage;
