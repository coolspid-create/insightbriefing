import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';
import './VisitorStatsPage.css';

const VisitorStatsPage = () => {
  const [token, setToken] = useState(sessionStorage.getItem('adminToken') || '');
  
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

  // Mock data for visitor stats
  const todayStats = {
    totalVisitors: 1245,
    uniqueVisitors: 890,
    pageViews: 3450,
    avgDuration: '4m 20s'
  };

  const dailyVisitors = [
    { date: '04-22', count: 950 },
    { date: '04-23', count: 1100 },
    { date: '04-24', count: 1050 },
    { date: '04-25', count: 1300 },
    { date: '04-26', count: 1250 },
    { date: '04-27', count: 1400 },
    { date: '04-28', count: 1245 }
  ];

  const browserStats = [
    { name: 'Chrome', percent: 65 },
    { name: 'Safari', percent: 20 },
    { name: 'Edge', percent: 10 },
    { name: 'Others', percent: 5 }
  ];

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
            <p className="header-subtitle">플랫폼 방문자 및 트래픽 분석 (샘플 데이터)</p>
          </div>
        </header>

        <div className="stats-content">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>오늘 총 방문자수</h3>
              <div className="stat-value">{todayStats.totalVisitors.toLocaleString()}</div>
              <div className="stat-trend positive">↑ 12% vs 어제</div>
            </div>
            <div className="stat-card">
              <h3>순 방문자수 (UV)</h3>
              <div className="stat-value">{todayStats.uniqueVisitors.toLocaleString()}</div>
              <div className="stat-trend positive">↑ 8% vs 어제</div>
            </div>
            <div className="stat-card">
              <h3>페이지 뷰 (PV)</h3>
              <div className="stat-value">{todayStats.pageViews.toLocaleString()}</div>
              <div className="stat-trend positive">↑ 15% vs 어제</div>
            </div>
            <div className="stat-card">
              <h3>평균 체류 시간</h3>
              <div className="stat-value">{todayStats.avgDuration}</div>
              <div className="stat-trend negative">↓ 2% vs 어제</div>
            </div>
          </div>

          <div className="charts-container">
            <div className="chart-card">
              <div className="panel-header">
                <h3>최근 7일 방문자 추이</h3>
              </div>
              <div className="bar-chart">
                {dailyVisitors.map((item, idx) => {
                  const maxCount = Math.max(...dailyVisitors.map(d => d.count));
                  const heightPercent = (item.count / maxCount) * 100;
                  return (
                    <div key={idx} className="bar-column">
                      <div className="bar-value">{item.count}</div>
                      <div className="bar-fill" style={{ height: `${heightPercent}%` }}></div>
                      <div className="bar-label">{item.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="chart-card">
              <div className="panel-header">
                <h3>브라우저 점유율</h3>
              </div>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VisitorStatsPage;
