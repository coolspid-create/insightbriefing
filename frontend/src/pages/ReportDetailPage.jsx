import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { SECTORS } from '../data/mockData';

const ReportDetailPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const mermaidRef = useRef(null);

  useEffect(() => {
    fetchReport();
  }, [id]);



  const fetchReport = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      const res = await fetch(`${API_BASE_URL}/api/reports/${id}`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ background: 'var(--cd-bg-main)', minHeight: '100vh' }}>
        <Header />
        <div style={{ paddingTop: '150px', textAlign: 'center', color: 'var(--cd-text-secondary)' }}>
          리포트를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="app-container" style={{ background: 'var(--cd-bg-main)', minHeight: '100vh' }}>
        <Header />
        <div style={{ paddingTop: '150px', textAlign: 'center', color: 'var(--cd-text-secondary)' }}>
          리포트를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const sector = SECTORS.find(s => s.id === report.sector_id);
  const sectorName = sector ? sector.name : report.sector_id;
  
  const formattedTitle = report.title.replace(/:\s*/, ' I ');

  const getSummary = (text) => {
    if (!text) return '';
    return text.split('\n\n')[0];
  };

  const getFullText = (text) => {
    if (!text) return '';
    const parts = text.split('\n\n');
    return parts.length > 1 ? parts.slice(1).join('\n\n') : text;
  };

  return (
    <div className="app-container" style={{ background: '#fcfcfc', minHeight: '100vh', color: '#1a1a1a', paddingBottom: '100px' }}>
      <Header />
      
      {/* Report Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #eaeaea', paddingTop: '100px', paddingBottom: '60px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
          <Link to="/reports" style={{ display: 'inline-block', marginBottom: '24px', color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
            ← 목록으로 돌아가기
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ background: '#f0f0f0', color: '#333', padding: '4px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' }}>
              {sectorName}
            </span>
            <span style={{ color: '#888', fontSize: '14px' }}>
              {new Date(report.period_start).toLocaleDateString()} ~ {new Date(report.period_end).toLocaleDateString()}
            </span>
          </div>
          
          <h1 style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1.3', marginBottom: '24px', letterSpacing: '-0.5px', wordBreak: 'keep-all' }}>
            {formattedTitle}
          </h1>
          
          <div style={{ background: '#f8f9fa', padding: '24px', borderLeft: '4px solid #1a1a1a', borderRadius: '0 8px 8px 0' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', lineHeight: '1.6', margin: 0 }}>
              "{report.one_line_summary}"
            </p>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <main style={{ maxWidth: '1100px', margin: '40px auto 0', padding: '0 20px' }}>
        
        {/* Key Issues */}
        <section style={{ maxWidth: '800px', margin: '0 auto 60px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#0056b3' }}>01.</span> 핵심 이슈
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {report.key_issues && report.key_issues.map((issue, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ background: '#f0f4f8', color: '#0056b3', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.6', color: '#333' }}>{issue}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Analysis Sections */}
        <section style={{ maxWidth: '800px', margin: '0 auto 60px', display: 'grid', gap: '40px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#0056b3' }}>02.</span> 트렌드 분석
            </h2>
            <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#444', whiteSpace: 'pre-wrap' }}>
              {getFullText(report.trend_analysis)}
            </p>
          </div>
          <div style={{ height: '1px', background: '#eaeaea' }}></div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#0056b3' }}>03.</span> 영향 분석 (Impact)
            </h2>
            <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#444', whiteSpace: 'pre-wrap' }}>
              {getFullText(report.impact_analysis)}
            </p>
          </div>
          <div style={{ height: '1px', background: '#eaeaea' }}></div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#0056b3' }}>04.</span> 향후 전망 (Outlook)
            </h2>
            <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#444', whiteSpace: 'pre-wrap' }}>
              {getFullText(report.future_outlook)}
            </p>
          </div>
        </section>

        {/* 05. Infographic Summary (Strategy Board) */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '800px', margin: '0 auto 24px' }}>
            <span style={{ color: '#0056b3' }}>05.</span> 주간 산업 동향 브리핑
          </h2>
          
          <div style={{ background: '#f8f9fa', padding: '50px', borderRadius: '16px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            
            {/* Grid lines background for technical feel */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.6, zIndex: 0 }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              
               {/* Dashboard Title Bar */}
               <div style={{ background: '#ffffff', border: '2px solid #0f172a', padding: '20px 30px', borderRadius: '8px', textAlign: 'center', marginBottom: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
                 <span style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>{formattedTitle}</span>
               </div>

              {/* 3 Columns */}
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '24px', position: 'relative' }}>
                
                {/* Column 1 */}
                <div style={{ flex: 1, background: '#ffffff', border: '1px solid #93c5fd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#eff6ff', padding: '20px', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '28px' }}>📊</div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '17px', color: '#1e3a8a' }}>01. 현상 파악 및 트렌드</div>
                      <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '500' }}>(Trend Analysis)</div>
                    </div>
                  </div>
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px', color: '#1e293b', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>주요 관측 이슈</div>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#475569', fontWeight: '500' }}>
                      <li style={{ marginBottom: '8px' }}>{report.key_issues[0]}</li>
                    </ul>
                    <div style={{ marginTop: '16px', paddingTop: '20px' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', wordBreak: 'keep-all' }}>
                        {getSummary(report.trend_analysis)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '16px', fontWeight: 'bold', zIndex: 2 }}>➔</div>
                </div>

                {/* Column 2 */}
                <div style={{ flex: 1, background: '#ffffff', border: '1px solid #86efac', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#f0fdf4', padding: '20px', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '28px' }}>⚡</div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '17px', color: '#14532d' }}>02. 시장 파급력 및 영향</div>
                      <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: '500' }}>(Impact Analysis)</div>
                    </div>
                  </div>
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px', color: '#1e293b', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>주요 관측 이슈</div>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#475569', fontWeight: '500' }}>
                      <li style={{ marginBottom: '8px' }}>{report.key_issues[1] || report.key_issues[0]}</li>
                    </ul>
                    <div style={{ marginTop: '16px', paddingTop: '20px' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', wordBreak: 'keep-all' }}>
                        {getSummary(report.impact_analysis)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '16px', fontWeight: 'bold', zIndex: 2 }}>➔</div>
                </div>

                {/* Column 3 */}
                <div style={{ flex: 1, background: '#ffffff', border: '1px solid #fcd34d', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#fffbeb', padding: '20px', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '28px' }}>🎯</div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '17px', color: '#78350f' }}>03. 향후 대응 및 전망</div>
                      <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500' }}>(Future Outlook)</div>
                    </div>
                  </div>
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px', color: '#1e293b', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>주요 관측 이슈</div>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#475569', fontWeight: '500' }}>
                      <li style={{ marginBottom: '8px' }}>{report.key_issues[2] || report.key_issues[0]}</li>
                    </ul>
                    <div style={{ marginTop: '16px', paddingTop: '20px' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', wordBreak: 'keep-all' }}>
                        {getSummary(report.future_outlook)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Summary Bar */}
              <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '30px', width: '3px', background: '#94a3b8', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '-6px', left: '-5.5px', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #94a3b8' }}></div>
                </div>
                <div style={{ marginTop: '25px', background: '#0f172a', color: '#f8fafc', padding: '18px 40px', borderRadius: '8px', fontWeight: '800', fontSize: '18px', letterSpacing: '0.5px', boxShadow: '0 6px 12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                  최종 시사점 : {report.one_line_summary}
                </div>
              </div>

            </div>
          </div>
        </section>



        {/* References */}
        {report.source_urls && report.source_urls.length > 0 && (
          <section style={{ maxWidth: '800px', margin: '0 auto 60px', background: '#f8f9fa', padding: '24px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#666' }}>참고 자료</h3>
            
            {/* Analysis Summary Message */}
            {report.source_urls.some(url => url.startsWith('RELEVANT_COUNT:')) && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📊</span>
                이 리포트는 총 {report.source_urls.find(url => url.startsWith('RELEVANT_COUNT:')).split(':')[1]}건의 연관 기사를 심층 분석하여 작성되었습니다.
              </div>
            )}

            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {report.source_urls
                .filter(url => !url.startsWith('RELEVANT_COUNT:'))
                .map((url, idx) => (
                <li key={idx} style={{ color: '#888' }}>
                  <a href={url} target="_blank" rel="noreferrer" style={{ color: '#0056b3', textDecoration: 'none', fontSize: '13px', wordBreak: 'break-all' }}>
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default ReportDetailPage;
