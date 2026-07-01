import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';
import './VisitorStatsPage.css';

const VisitorStatsPage = () => {
  const [token, setToken] = useState(sessionStorage.getItem('adminToken') || '');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
        const response = await fetch(`${API_BASE_URL}/api/admin/visitor-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('통계 데이터를 불러오지 못했습니다. 서버 상태나 토큰을 확인해 주세요.');
        }
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load visitor stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (!token) {
    return (
      <div className="admin-login-screen">
        <div className="login-card">
          <h2>접근 권한 없음</h2>
          <p>관리자 로그인이 필요합니다.</p>
          <Link to="/admin" className="login-btn" style={{display: 'inline-block', textDecoration: 'none'}}>관리자 로그인으로 이동</Link>
        </div>
      </div>
    );
  }

  const todayStats = stats?.todayStats || {
    totalVisitors: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    avgDuration: '0 PV/UV',
    pvTrend: 0,
    uvTrend: 0
  };

  const dailyVisitors = stats?.dailyVisitors || [];
  const browserStats = stats?.browserStats || [];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <span className="logo-ib">IB</span> Admin
        </div>
        <nav className="sidebar-nav">
          <p className="nav-header">SYSTEM</p>
          <Link to="/admin" className="nav-item" style={{textDecoration: 'none'}}>대시보드 홈</Link>
          <Link to="/workflow" className="nav-item" style={{textDecoration: 'none'}}>🔀 워크플로우</Link>
          <div className="nav-item active">📊 접속자 통계</div>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => { setToken(''); sessionStorage.removeItem('adminToken'); window.location.href = '/admin'; }}>로그아웃</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="main-header">
          <div className="header-title">
            <h2>접속자 현황 및 통계</h2>
            <p className="header-subtitle">플랫폼 방문자 및 트래픽 분석 (실시간 수집)</p>
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--cd-text-light)', opacity: 0.8 }}>
            <div className="loading-spinner" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #00E676', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', marginBottom: '15px' }}></div>
            <h3>실시간 통계 데이터를 불러오는 중...</h3>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : error ? (
          <div style={{ padding: '24px', backgroundColor: 'rgba(239, 83, 80, 0.1)', border: '1px solid rgba(239, 83, 80, 0.3)', borderRadius: '12px', color: '#ff7c79', margin: '20px', maxWidth: '600px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>⚠️ 데이터 로딩 실패</h4>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{error}</p>
          </div>
        ) : (
          <div className="stats-content">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>오늘 총 방문자수</h3>
                <div className="stat-value">{todayStats.totalVisitors.toLocaleString()}</div>
                <div className={`stat-trend ${todayStats.pvTrend >= 0 ? 'positive' : 'negative'}`}>
                  {todayStats.pvTrend >= 0 ? '↑' : '↓'} {Math.abs(todayStats.pvTrend)}% vs 어제
                </div>
              </div>
              <div className="stat-card">
                <h3>순 방문자수 (UV)</h3>
                <div className="stat-value">{todayStats.uniqueVisitors.toLocaleString()}</div>
                <div className={`stat-trend ${todayStats.uvTrend >= 0 ? 'positive' : 'negative'}`}>
                  {todayStats.uvTrend >= 0 ? '↑' : '↓'} {Math.abs(todayStats.uvTrend)}% vs 어제
                </div>
              </div>
              <div className="stat-card">
                <h3>페이지 뷰 (PV)</h3>
                <div className="stat-value">{todayStats.pageViews.toLocaleString()}</div>
                <div className={`stat-trend ${todayStats.pvTrend >= 0 ? 'positive' : 'negative'}`}>
                  {todayStats.pvTrend >= 0 ? '↑' : '↓'} {Math.abs(todayStats.pvTrend)}% vs 어제
                </div>
              </div>
              <div className="stat-card">
                <h3>방문당 페이지수 (Depth)</h3>
                <div className="stat-value">{todayStats.avgDuration}</div>
                <div className="stat-trend positive" style={{ color: '#00E676' }}>활동성 지표</div>
              </div>
            </div>

            <div className="charts-container">
              <div className="chart-card">
                <div className="panel-header">
                  <h3>최근 7일 방문자 추이</h3>
                </div>
                {dailyVisitors.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--cd-text-light)', opacity: 0.5 }}>
                    표시할 통계 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="bar-chart">
                    {dailyVisitors.map((item, idx) => {
                      const maxCount = Math.max(...dailyVisitors.map(d => d.count));
                      const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      return (
                        <div key={idx} className="bar-column">
                          <div className="bar-value">{item.count}</div>
                          <div className="bar-fill" style={{ height: `${heightPercent}%` }}></div>
                          <div className="bar-label">{item.date}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="chart-card">
                <div className="panel-header">
                  <h3>브라우저 점유율 (최근 30일)</h3>
                </div>
                {browserStats.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--cd-text-light)', opacity: 0.5 }}>
                    기록된 브라우저 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="browser-stats-list">
                    {browserStats.map((item, idx) => (
                      <div key={idx} className="browser-stat-item">
                        <div className="browser-info">
                          <span className="browser-name">{item.name}</span>
                          <span className="browser-percent">{item.percent}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${item.percent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VisitorStatsPage;
