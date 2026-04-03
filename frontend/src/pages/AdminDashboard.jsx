import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [token, setToken] = useState(sessionStorage.getItem('adminToken') || ''); 
  const [password, setPassword] = useState('');
  const [config, setConfig] = useState(null);
  const [newsDb, setNewsDb] = useState({});
  const [selectedSectorId, setSelectedSectorId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [sendingTelegramId, setSendingTelegramId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [liveStatus, setLiveStatus] = useState({});

  useEffect(() => {
    if (token) {
      fetchData();
      const statusInterval = setInterval(fetchStatus, 3000);
      return () => clearInterval(statusInterval);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3002/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        sessionStorage.setItem('adminToken', data.token);
      } else {
        alert('비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      alert('로그인 처리 중 오류 발생');
    }
  };

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3002/api/status');
      const data = await res.json();
      setLiveStatus(data);
    } catch (e) {
      console.error("실시간 상태 로드 실패:", e);
    }
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const cfgRes = await fetch('http://localhost:3002/api/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (cfgRes.status === 401) { logout(); return; }
      const cfg = await cfgRes.json();
      setConfig(cfg);
      if (cfg.sectors.length > 0 && !selectedSectorId) {
        setSelectedSectorId(cfg.sectors[0].id);
      }

      const dbRes = await fetch('http://localhost:3002/api/news', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const db = await dbRes.json();
      setNewsDb(db);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    setToken('');
    sessionStorage.removeItem('adminToken');
    setConfig(null);
  };

  const researchSector = async (sectorId) => {
    if (!window.confirm('이 섹터의 최신 뉴스를 실시간으로 다시 수집하고 AI 분석 파이프라인을 가동하시겠습니까?')) return;
    setUpdatingId(sectorId);
    try {
      const res = await fetch(`http://localhost:3002/api/research/${sectorId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { logout(); return; }
      alert('AI 리서치 완료 및 웹 갱신 성공!');
      fetchData();
    } catch (e) {
      alert('오류 발생: ' + e.message);
    }
    setUpdatingId(null);
  };

  const sendTelegramSector = async (sectorId) => {
    if (!window.confirm('현재 저장된 뉴스를 바탕으로 텔레그램 발송을 진행하시겠습니까?')) return;
    setSendingTelegramId(sectorId);
    try {
      const res = await fetch(`http://localhost:3002/api/telegram/${sectorId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Server error');
      }
      alert('텔레그램 발송 완료!');
    } catch (e) {
      alert('오류 발생: ' + e.message);
    }
    setSendingTelegramId(null);
  };

  const saveSectorConfig = async () => {
    const sectorId = selectedSectorId;
    setSavingId(sectorId);
    try {
      const response = await fetch('http://localhost:3002/api/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(config)
      });
      
      if (response.status === 401) { logout(); return; }
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      alert('설정이 저장되었습니다.');
    } catch (e) {
      alert('오류 발생: ' + e.message);
    }
    setSavingId(null);
  };

  const saveNews = async () => {
    try {
       const res = await fetch('http://localhost:3002/api/news', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newsDb)
      });
      if (res.status === 401) { logout(); return; }
      alert('기사 내용이 저장되었습니다.');
    } catch (e) {
      alert('에러: ' + e.message);
    }
  };

  if (!token) {
    return (
      <div className="admin-login-screen">
        <div className="login-card">
          <div className="login-logo">
            <span className="logo-ib">IB</span> Strategic Desk
          </div>
          <h2>관리자 로그인</h2>
          <p>전략 인사이트 브리핑 시스템에 접속하려면 관리자 암호를 입력하세요.</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="login-btn">접속하기</button>
          </form>
        </div>
      </div>
    );
  }

  if (!config) return <div className="admin-loading">데이터 불러오는 중...</div>;

  const currentSector = config.sectors.find(s => s.id === selectedSectorId);
  const currentNews = newsDb[selectedSectorId] || [];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <span className="logo-ib">IB</span> Admin
        </div>
        <nav className="sidebar-nav">
          <p className="nav-header">INDUSTRY SECTORS</p>
          {config.sectors.map(sec => (
            <button 
              key={sec.id}
              className={`nav-item ${selectedSectorId === sec.id ? 'active' : ''}`}
              onClick={() => setSelectedSectorId(sec.id)}
            >
              {sec.name}
              {liveStatus[sec.id]?.status === 'working' && <span className="running-dot"></span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => { setToken(''); sessionStorage.removeItem('adminToken'); }}>로그아웃</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="main-header">
          <div className="header-title">
            <h2>{currentSector?.name}</h2>
            <p className="header-subtitle">파이프라인 관리 및 기사 큐레이션</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-research" 
              onClick={() => researchSector(selectedSectorId)}
              disabled={updatingId === selectedSectorId}
            >
              {updatingId === selectedSectorId ? '⏳ 리서치 중' : '🔄 뉴스 리서치'}
            </button>
            <button 
              className="btn btn-telegram" 
              onClick={() => sendTelegramSector(selectedSectorId)}
              disabled={sendingTelegramId === selectedSectorId}
            >
              {sendingTelegramId === selectedSectorId ? '⏳ 발송 중' : '✈️ 텔레그램 발송'}
            </button>
          </div>
        </header>

        <div className="admin-grid">
          {/* Left Column: Config & Logs */}
          <div className="grid-left">
            <section className="admin-panel card">
              <div className="panel-header">
                <h3>리서치 가이드라인</h3>
                <button 
                  className="btn-text" 
                  onClick={saveSectorConfig}
                  disabled={savingId === selectedSectorId}
                >
                  {savingId === selectedSectorId ? '저장 중...' : '💾 가이드 저장'}
                </button>
              </div>
              <textarea 
                className="specs-textarea"
                value={currentSector?.researchSpecs || ''} 
                onChange={e => {
                  const newConfig = {...config};
                  const idx = newConfig.sectors.findIndex(s => s.id === selectedSectorId);
                  newConfig.sectors[idx].researchSpecs = e.target.value;
                  setConfig(newConfig);
                }}
                placeholder="AI 리서치 시 참고할 구체적인 조건을 입력하세요."
              />
            </section>

            <section className="admin-panel status-panel">
              <div className="status-header">
                <h3>LIVE LOGS</h3>
                <span className={`status-badge ${liveStatus[selectedSectorId]?.status === 'working' ? 'active' : ''}`}>
                  {liveStatus[selectedSectorId]?.status === 'working' ? 'RUNNING' : 'IDLE'}
                </span>
              </div>
              <div className="log-console">
                {liveStatus[selectedSectorId]?.logs?.length > 0 ? (
                  liveStatus[selectedSectorId].logs.map((log, i) => (
                    <div key={i} className="log-entry">{log}</div>
                  ))
                ) : (
                  <div className="log-empty">대기 중입니다. 뉴스 리서치를 시작하면 로그가 여기에 표시됩니다.</div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: News Editor */}
          <div className="grid-right">
            <section className="admin-panel item-editor">
              <div className="panel-header">
                <h3>기사 큐레이션 에디터</h3>
                <button className="btn btn-save" onClick={saveNews}>저장</button>
              </div>
              <div className="news-list-edit">
                {currentNews.map((news, idx) => (
                  <div key={idx} className="edit-card">
                    <span className="news-num">기사 {idx + 1}</span>
                    <input 
                      className="edit-title"
                      type="text" 
                      value={news.title}
                      onChange={e => {
                        const newDb = {...newsDb};
                        newDb[selectedSectorId][idx].title = e.target.value;
                        setNewsDb(newDb);
                      }}
                    />
                    <textarea 
                      className="edit-summary"
                      value={news.summary}
                      onChange={e => {
                        const newDb = {...newsDb};
                        newDb[selectedSectorId][idx].summary = e.target.value;
                        setNewsDb(newDb);
                      }}
                    />
                  </div>
                ))}
                {currentNews.length === 0 && (
                  <div className="no-news">현재 게재된 기사가 없습니다. 먼저 뉴스 리서치를 진행해주세요.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
