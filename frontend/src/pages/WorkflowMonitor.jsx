import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './WorkflowMonitor.css';

// ===== WORKFLOW NODE DEFINITION =====
// 실제 IB 시스템 아키텍처를 기반으로 정의한 노드 목록
const WORKFLOW_NODES = [
  {
    id: 'scheduler',
    title: 'Cron Scheduler',
    type: 'schedule',
    icon: '⏰',
    summary: '매일 오전 9시(KST) 자동 트리거',
    description: '매일 오전 9:00 한국 시간에 자동으로 전체 파이프라인을 실행합니다. node-cron 라이브러리를 사용하며, Render 서버의 Asia/Seoul 타임존 설정으로 정확한 시간에 발동합니다. 수동으로 Admin Dashboard에서도 트리거할 수 있습니다.',
    reason: '뉴스 브리핑의 핵심은 "아침에 출근하면 바로 볼 수 있는" 타이밍입니다. 오전 9시는 직장인들의 업무 시작 시간에 맞추어 최적의 전달 타이밍을 확보하기 위한 설계입니다.',
    config: {
      'Cron 표현식': '0 9 * * *',
      '타임존': 'Asia/Seoul',
      '라이브러리': 'node-cron',
      '실행 방식': 'server.js 내 내장 스케줄러',
      '수동 트리거': 'Admin Dashboard → 일괄 수집 버튼'
    },
    statusKey: 'all',
    phase: 'trigger'
  },
  {
    id: 'config-loader',
    title: '섹터 설정 로드',
    type: 'data',
    icon: '⚙️',
    summary: 'Supabase에서 sector_config 조회',
    description: 'Supabase의 sector_config 테이블에서 등록된 모든 섹터 정보를 로드합니다. 각 섹터의 이름, 리서치 가이드라인(research_specs), 가중치(weight), 긴급 여부(is_urgent) 등을 읽어옵니다.',
    reason: '설정을 DB에서 동적으로 로드하는 이유는 서버 재배포 없이도 Admin Dashboard에서 실시간으로 섹터 설정을 변경할 수 있기 위함입니다. 하드코딩 대신 DB 기반 설정을 채택했습니다.',
    config: {
      '데이터 소스': 'Supabase → sector_config 테이블',
      '주요 필드': 'id, name, research_specs, weight, is_urgent',
      '정렬 기준': 'weight DESC (높은 가중치 우선)',
      '현재 섹터 수': '5개 (신재생에너지, 제품안전, 인테리어·건설, AI·테크, 커머스)'
    },
    statusKey: null,
    phase: 'prepare'
  },
  {
    id: 'keyword-extract',
    title: '키워드 추출',
    type: 'filter',
    icon: '🔍',
    summary: '가이드라인에서 검색 키워드 파싱',
    description: '각 섹터의 리서치 가이드라인(research_specs)에서 "주요 검색 키워드" 섹션을 정규식으로 추출합니다. 추출된 키워드들은 섹터명과 조합하여 다중 검색 쿼리를 생성합니다.',
    reason: 'AND 기반 단일 쿼리로는 검색 결과가 부족한 문제가 있었습니다. 키워드를 분리하여 개별 쿼리로 전송하는 OR 전략을 채택함으로써, "인테리어·건설" 같은 복합 섹터에서도 충분한 기사를 확보할 수 있게 되었습니다.',
    config: {
      '추출 정규식': '/주요 검색 키워드\\s*:\\s*([^\\r\\n]*)/i',
      '쿼리 생성 전략': '섹터명, 섹터명+키워드, 키워드 단독 (3단계)',
      '최대 수집량': '150건 도달 시 조기 중단',
      '중복 대응': 'Map(link) 기반 URL 중복 제거'
    },
    statusKey: null,
    phase: 'research'
  },
  {
    id: 'naver-api',
    title: '네이버 뉴스 API',
    type: 'data',
    icon: '📰',
    summary: '다중 쿼리로 최신 뉴스 100건씩 수집',
    description: '네이버 Open API(Search/News)를 통해 각 쿼리당 최신순 100건의 뉴스를 수집합니다. 48시간 이내 기사만 필터링하며, 주식/프로모션 관련 부정 키워드 기사를 1차 제거합니다.',
    reason: '네이버 뉴스 API가 한국 뉴스 검색에서 가장 포괄적인 커버리지를 제공합니다. 48시간 필터는 주말/공휴일에도 기사가 확보되도록 여유를 준 설계입니다.',
    config: {
      'API 엔드포인트': 'openapi.naver.com/v1/search/news.json',
      '인증': 'X-Naver-Client-Id / Secret',
      '정렬': 'date (최신순)',
      '건수': '쿼리당 100건',
      '시간 필터': '48시간 이내',
      '부정 키워드': '특징주, 급등, 상한가, 프로모션, 이벤트 등 17개'
    },
    statusKey: null,
    phase: 'research'
  },
  {
    id: 'dedup-filter',
    title: '중복 제거 엔진',
    type: 'filter',
    icon: '🧹',
    summary: '제목 유사도 + 이미지 URL 기반 필터링',
    description: '수집된 원시 기사에서 3단계 중복 제거를 수행합니다: (1) URL 기반 완전 중복 제거, (2) 제목 정규화 후 15자 앞부분 비교, (3) og:image URL 동일성 비교로 동일 보도의 다른 언론사 기사를 걸러냅니다.',
    reason: '같은 보도자료를 여러 언론사가 거의 동일하게 보도하는 경우가 많습니다. 이미지까지 대조하는 이유는, 제목만 살짝 바꾸고 동일 이미지를 쓰는 "복붙 기사"를 잡아내기 위함입니다.',
    config: {
      '제목 정규화': '특수문자 제거 → 앞 15자 비교',
      '이미지 추출 전략': 'og:image → twitter:image → 본문 img → 일반 img (4단계 폴백)',
      '최종 후보 상한': '30건',
      '청크 처리': '10건씩 병렬 이미지 추출',
      '이미지 중복 시': '해당 기사 제외 → 타이틀 슬롯 반환'
    },
    statusKey: null,
    phase: 'research'
  },
  {
    id: 'gpt-analysis',
    title: 'GPT-4o 분석 엔진',
    type: 'ai',
    icon: '🤖',
    summary: '8건 엄선 + 비즈니스 임팩트 요약',
    description: 'OpenAI GPT-4o 모델에 후보 기사 30건과 섹터별 리서치 가이드라인을 전달하여, 비즈니스 가치가 높은 8개 기사를 엄선합니다. 각 기사에 대해 경영진 수준의 요약과 [언론사명] 접두어를 생성합니다.',
    reason: 'C-Level 경영진을 위한 브리핑이므로, 단순 뉴스 나열이 아닌 "산업 전략적 의미"를 도출해야 합니다. GPT-4o의 추론 능력으로 단순 보도 vs 전략적 인사이트를 구분합니다.',
    config: {
      '모델': 'gpt-4o',
      '출력 형식': 'JSON (response_format: json_object)',
      '목표 기사 수': '8건',
      '배제 원칙': '주식 분석, 프로모션, 기업 홍보 보도자료',
      '다양성 규칙': '동일 기업 기사 최대 2개',
      '보정 로직': 'AI 결과 < 8건 시 후보군에서 자동 보충',
      '언론사 강제 적용': 'publisher 필드 → [언론사명] 접두어'
    },
    statusKey: null,
    phase: 'analysis'
  },
  {
    id: 'image-match',
    title: '이미지 매칭',
    type: 'filter',
    icon: '🖼️',
    summary: '기사별 썸네일 이미지 추출 및 보정',
    description: 'GPT가 선별한 최종 기사에 원본 후보군의 이미지를 link 기반으로 매칭합니다. 이미지 누락 기사에 대해서는 개별 재추출을 시도하고, 그래도 없으면 섹터별 기본 이미지(Unsplash)를 적용합니다.',
    reason: '뉴스 카드의 시각적 품질은 사용자 참여도에 직결됩니다. "이미지 없는 기사"를 허용하면 UI가 불균질해지므로, 다단계 폴백으로 100% 이미지 커버리지를 보장합니다.',
    config: {
      '1차': 'link 기반 후보군 매칭',
      '2차': 'original_link 기반 매칭',
      '3차': '개별 URL 재추출 (axios GET)',
      '최종 폴백': '섹터별 Unsplash 플레이스홀더',
      '이미지 URL 보정': '상대경로 → 절대경로 자동 변환'
    },
    statusKey: null,
    phase: 'analysis'
  },
  {
    id: 'supabase-save',
    title: 'Supabase 저장',
    type: 'storage',
    icon: '💾',
    summary: 'news_items + news_history 테이블 영속화',
    description: '최종 완성된 뉴스 데이터를 Supabase에 저장합니다. news_items 테이블에는 현재 활성 데이터(기존 삭제 후 INSERT), news_history에는 이력 데이터(이미지 제외 INSERT)를 적재합니다.',
    reason: '현재 데이터(news_items)와 과거 기록(news_history)을 분리하는 이유는 히스토리 분석과 롤백을 위해서입니다. 이미지를 히스토리에서 제외하는 이유는 외부 URL 이미지가 시간이 지나면 만료되기 때문입니다.',
    config: {
      '활성 데이터': 'news_items (sector_id, content)',
      '이력 데이터': 'news_history (sector_id, content)',
      '저장 방식': 'DELETE → INSERT (교체)',
      '이력 저장': 'image 필드 제외 후 INSERT',
      '안전 장치': '수집 0건 시 기존 데이터 유지 (삭제 안 함)'
    },
    statusKey: null,
    phase: 'storage'
  },
  {
    id: 'cache-clear',
    title: '캐시 무효화',
    type: 'cache',
    icon: '🔄',
    summary: 'In-Memory 뉴스 캐시 즉시 클리어',
    description: 'Express 서버의 메모리 캐시를 무효화합니다. 웹 프론트엔드에서 /api/news를 호출할 때, 캐시가 있으면 Supabase 조회를 생략하고 메모리에서 즉시 응답합니다. 새 데이터 저장 시 캐시를 즉시 클리어하여 다음 조회에서 최신 데이터를 제공합니다.',
    reason: '프론트엔드가 수십 명의 사용자에 의해 동시에 조회되더라도 Supabase에 과도한 부하를 주지 않기 위한 설계입니다. TTL은 60분으로 설정되어 있지만, 파이프라인 완료 시 즉시 갱신됩니다.',
    config: {
      '캐시 TTL': '60분 (3,600,000ms)',
      '저장 위치': 'Express 서버 메모리 (전역 변수)',
      '무효화 시점': '뉴스 저장, 벌크 수집, 정기 작업 완료 시',
      'Cache Hit': 'Supabase 조회 생략 → 즉시 응답',
      'Cache Miss': 'Supabase 전체 조회 → 캐시에 저장'
    },
    statusKey: null,
    phase: 'storage'
  },
  {
    id: 'render-backend',
    title: 'Render 백엔드',
    type: 'data',
    icon: '🖥️',
    summary: 'Express API 서버 + 자동화 엔진 호스팅',
    description: 'Render는 백엔드 인프라를 호스팅하는 클라우드 플랫폼입니다. Express 기반의 API 서버(server.js), Cron 스케줄러, 뉴스 수집 파이프라인(pipeline.js), 텔레그램 발송 모듈(telegram.js) 등 IB 시스템의 모든 서버 사이드 로직이 Render 위에서 24시간 상시 구동됩니다. GitHub 리포지토리와 연동되어 코드 push 시 자동으로 재배포됩니다.',
    reason: 'Render는 무료 티어에서도 Web Service를 제공하며, GitHub 연동 자동 배포(CI/CD)를 지원합니다. 별도의 서버 관리(OS 업데이트, 보안 패치 등) 없이 코드만 push하면 자동으로 빌드 및 배포되므로, 1인 운영 체제에 최적화된 선택입니다. Vercel이 프론트엔드를 담당하고, Render가 백엔드를 담당하는 분리 구조입니다.',
    config: {
      '서비스 유형': 'Web Service (Node.js)',
      '실행 파일': 'automation/server.js',
      '포트': '3002 (process.env.PORT)',
      '배포 방식': 'GitHub 연동 자동 배포 (main 브랜치)',
      '환경변수': 'OPENAI_API_KEY, NAVER_CLIENT_*, SUPABASE_*, TELEGRAM_* 등',
      '호스팅 구성요소': 'Express API + Cron 스케줄러 + Pipeline + Telegram',
      'CORS 허용': 'ibrief.kr, insightbriefing.vercel.app, localhost:5173'
    },
    statusKey: 'all',
    phase: 'infra'
  },
  {
    id: 'telegram-broadcast',
    title: '텔레그램 발송',
    type: 'output',
    icon: '✈️',
    summary: '섹터별 전용 봇으로 채널 푸시',
    description: '각 섹터에 매핑된 텔레그램 봇을 통해 해당 채널로 브리핑 메시지를 HTML 형식으로 발송합니다. 긴급 섹터(isUrgent)의 경우 🚨 마크와 함께 강조 알림으로 발송됩니다. 봇 간 2초 딜레이로 텔레그램 Rate Limit을 방어합니다.',
    reason: '텔레그램 채널은 "구독형 푸시"의 최적 수단입니다. 기존 카카오톡, 이메일과 달리 별도 앱 설치 없이 채널 링크만으로 구독이 가능하며, HTML 포맷 지원으로 리치 메시지를 전달할 수 있습니다.',
    config: {
      '발송 채널': '섹터당 1개 전용 채널 (5개)',
      '봇 인증': '환경변수 (TELEGRAM_BOT_TOKEN_* / TELEGRAM_CHAT_ID_*)',
      '메시지 포맷': 'HTML (parse_mode: HTML)',
      'Rate Limit 방어': '채널 간 2초 딜레이',
      '미리보기': 'disable_web_page_preview: true'
    },
    statusKey: null,
    phase: 'output'
  },
  {
    id: 'vercel-frontend',
    title: 'Vercel 프론트엔드',
    type: 'output',
    icon: '🌐',
    summary: 'React SPA → ibrief.kr 자동 반영',
    description: '프론트엔드(React + Vite)는 Vercel에 배포되어 있으며, /api/news를 호출하여 캐시된 뉴스 데이터를 렌더링합니다. 파이프라인 완료 후 캐시가 갱신되므로, 사용자가 새로고침하면 최신 브리핑을 확인할 수 있습니다.',
    reason: 'Vercel의 CDN 배포는 한국 사용자에게 빠른 로딩 속도를 제공합니다. CSR(Client-Side Rendering) 기반으로, 별도의 서버 재시작 없이도 API 데이터 변경만으로 콘텐츠가 갱신됩니다.',
    config: {
      '프레임워크': 'React + Vite',
      '배포': 'Vercel (GitHub 연동 자동 배포)',
      '도메인': 'ibrief.kr / insightbriefing.vercel.app',
      'API 호출': '/api/news (캐시 응답)',
      '업데이트': '사용자 새로고침 시 최신 데이터 반영'
    },
    statusKey: null,
    phase: 'output'
  }
];

// 섹터 노드 정의 (한 번에 병렬 처리되는 섹터들)
const SECTOR_NODES = [
  { id: 'sector-ren', title: '신재생에너지', icon: '☀️', weight: 1.0, isUrgent: false },
  { id: 'sector-safe', title: '제품안전', icon: '🛡️', weight: 2.0, isUrgent: true },
  { id: 'sector-const', title: '인테리어·건설', icon: '🏗️', weight: 1.0, isUrgent: false },
  { id: 'sector-ai', title: 'AI·테크', icon: '🧠', weight: 1.0, isUrgent: false },
  { id: 'sector-comm', title: '커머스', icon: '🛒', weight: 1.0, isUrgent: false },
];

// 파이프라인 실행 순서 정의 (화면에 보여줄 흐름)
const PIPELINE_FLOW = [
  { type: 'node', id: 'scheduler' },
  { type: 'arrow' },
  { type: 'node', id: 'config-loader' },
  { type: 'arrow' },
  { type: 'sectors' },  // 섹터별 병렬 분기
  { type: 'arrow' },
  { type: 'node', id: 'keyword-extract' },
  { type: 'harrow-group', nodes: ['keyword-extract', 'naver-api'] },
  { type: 'node', id: 'naver-api' },
  { type: 'arrow' },
  { type: 'node', id: 'dedup-filter' },
  { type: 'arrow' },
  { type: 'node', id: 'gpt-analysis' },
  { type: 'harrow-group', nodes: ['gpt-analysis', 'image-match'] },
  { type: 'node', id: 'image-match' },
  { type: 'arrow' },
  { type: 'node', id: 'supabase-save' },
  { type: 'harrow-group', nodes: ['supabase-save', 'cache-clear'] },
  { type: 'node', id: 'cache-clear' },
  { type: 'arrow' },
  { type: 'row', nodes: ['telegram-broadcast', 'vercel-frontend'] },
];

const WorkflowMonitor = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
  const [liveStatus, setLiveStatus] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isAnyWorking, setIsAnyWorking] = useState(false);

  // 실시간 상태 폴링
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/status`);
      const data = await res.json();
      setLiveStatus(data);

      // 작업 중인 노드가 있는지 체크
      const working = Object.values(data).some(s => s.status === 'working');
      setIsAnyWorking(working);
    } catch (e) {
      console.error("상태 로드 실패:", e);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const getNodeStatus = (nodeId) => {
    const node = WORKFLOW_NODES.find(n => n.id === nodeId);
    if (!node) return 'idle';

    // 특수 노드(scheduler 등) → 'all' 키를 참조
    if (node.statusKey === 'all') {
      return liveStatus['all']?.status || 'idle';
    }

    // 섹터 관련 노드 → 어떤 섹터든 working이면 해당 노드도 working 표시
    if (['keyword-extract', 'naver-api', 'dedup-filter', 'gpt-analysis', 'image-match'].includes(nodeId)) {
      const anyWorking = SECTOR_NODES.some(s => liveStatus[s.id]?.status === 'working');
      return anyWorking ? 'working' : 'idle';
    }

    // Render 백엔드 → 'all' 키 참조 (서버 전체 상태)
    if (nodeId === 'render-backend') {
      return liveStatus['all']?.status || 'idle';
    }

    // 저장/발송 단계
    if (['supabase-save', 'cache-clear'].includes(nodeId)) {
      // working 중인 로그에 "저장" 또는 "완료"가 있으면 해당 노드 표시
      const anyWorkingLog = Object.values(liveStatus).some(s => 
        s.status === 'working' && s.logs?.[0]?.includes('완료')
      );
      return anyWorkingLog ? 'working' : 'idle';
    }

    if (nodeId === 'telegram-broadcast') {
      const anyTelegram = Object.values(liveStatus).some(s => 
        s.status === 'working' && s.logs?.[0]?.includes('발송')
      );
      return anyTelegram ? 'working' : 'idle';
    }

    return 'idle';
  };

  const getSectorStatus = (sectorId) => {
    return liveStatus[sectorId]?.status || 'idle';
  };

  const selectedNode = WORKFLOW_NODES.find(n => n.id === selectedNodeId);
  const selectedSector = SECTOR_NODES.find(s => s.id === selectedNodeId);

  const renderNodeCard = (nodeId, extraClass = '') => {
    const node = WORKFLOW_NODES.find(n => n.id === nodeId);
    if (!node) return null;
    const status = getNodeStatus(nodeId);

    return (
      <div
        key={nodeId}
        className={`wf-node ${extraClass} status-${status} ${selectedNodeId === nodeId ? 'selected' : ''}`}
        onClick={() => setSelectedNodeId(nodeId)}
        id={`workflow-node-${nodeId}`}
      >
        <div className="wf-node-header">
          <div className={`wf-node-icon ${node.type}`}>{node.icon}</div>
          <div className="wf-node-title-group">
            <div className="wf-node-title">{node.title}</div>
            <div className="wf-node-type">{node.type}</div>
          </div>
          <div className={`wf-node-status-dot ${status}`}></div>
        </div>
        <div className="wf-node-body">{node.summary}</div>
      </div>
    );
  };

  const renderSectorNode = (sector) => {
    const status = getSectorStatus(sector.id);
    return (
      <div
        key={sector.id}
        className={`wf-node sector-node status-${status} ${selectedNodeId === sector.id ? 'selected' : ''}`}
        onClick={() => setSelectedNodeId(sector.id)}
        id={`workflow-node-${sector.id}`}
      >
        <div className="wf-node-header">
          <div className="wf-node-icon data">{sector.icon}</div>
          <div className="wf-node-title-group">
            <div className="wf-node-title">{sector.title}</div>
            <div className="wf-node-type">{sector.isUrgent ? '🚨 URGENT' : `W: ${sector.weight}`}</div>
          </div>
          <div className={`wf-node-status-dot ${status}`}></div>
        </div>
        <div className="wf-node-body">
          {status === 'working' 
            ? liveStatus[sector.id]?.logs?.[0]?.split('] ').pop() || '처리 중...'
            : `가중치 ${sector.weight} | ${sector.isUrgent ? '긴급 모드' : '일반 모드'}`
          }
        </div>
      </div>
    );
  };

  const renderArrow = (active = false) => {
    const isActive = active || isAnyWorking;
    return (
      <div className="workflow-arrow">
        <div className={`arrow-line ${isActive ? 'active' : ''}`}></div>
        <div className={`arrow-head ${isActive ? 'active' : ''}`}>▼</div>
      </div>
    );
  };

  const renderHArrow = (active = false) => {
    const isActive = active || isAnyWorking;
    return (
      <div className="workflow-harrow">
        <div className={`harrow-line ${isActive ? 'active' : ''}`}></div>
        <div className={`harrow-head ${isActive ? 'active' : ''}`}>▶</div>
      </div>
    );
  };

  // Detail panel render helper for a selected sector
  const renderSectorDetail = () => {
    if (!selectedSector) return null;
    const status = getSectorStatus(selectedSector.id);
    const logs = liveStatus[selectedSector.id]?.logs || [];

    return (
      <div className="detail-panel-inner">
        <button className="detail-close-btn" onClick={() => setSelectedNodeId(null)}>✕</button>

        <div className="detail-header">
          <div className="detail-icon data">{selectedSector.icon}</div>
          <div className="detail-title">{selectedSector.title}</div>
          <div className="detail-type">SECTOR · 뉴스 수집 대상</div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">현재 상태</div>
          <div className={`detail-status-card ${status}`}>
            <div className="detail-status-label">
              <span className={`status-indicator ${status}`}></span>
              {status === 'working' ? 'RUNNING' : status === 'error' ? 'ERROR' : 'IDLE'}
            </div>
            <div className="detail-status-text">
              {logs[0] || '대기 중입니다.'}
            </div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">섹터 설정</div>
          <table className="detail-config-table">
            <tbody>
              <tr><td>섹터 ID</td><td>{selectedSector.id}</td></tr>
              <tr><td>가중치</td><td>{selectedSector.weight}</td></tr>
              <tr><td>긴급 모드</td><td>{selectedSector.isUrgent ? '✅ 활성' : '⬜ 비활성'}</td></tr>
              <tr><td>텔레그램</td><td>전용 봇 + 채널 연동</td></tr>
            </tbody>
          </table>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">실시간 로그</div>
          <div className="detail-live-logs">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} className="detail-log-entry">{log}</div>
            )) : (
              <div className="detail-logs-empty">로그 없음</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="workflow-page">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <span className="logo-ib">IB</span> Admin
        </div>
        <nav className="sidebar-nav">
          <p className="nav-header">NAVIGATION</p>
          <Link to="/admin" className="nav-item">
            📊 대시보드
          </Link>
          <Link to="/workflow" className="nav-item active">
            🔀 워크플로우
          </Link>
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="logout-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            ← 메인으로
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <div className="workflow-main">
        {/* Top Bar */}
        <div className="workflow-topbar">
          <div className="workflow-topbar-left">
            <h1>🔀 시스템 워크플로우</h1>
            <span className={`workflow-badge ${isAnyWorking ? 'running' : 'idle'}`}>
              {isAnyWorking ? '● RUNNING' : '○ IDLE'}
            </span>
            <span className="readonly-badge">READ-ONLY 모니터링</span>
          </div>
          <div className="workflow-topbar-right">
            <div className="workflow-legend">
              <div className="legend-item">
                <span className="legend-dot idle"></span> 대기
              </div>
              <div className="legend-item">
                <span className="legend-dot working"></span> 실행 중
              </div>
              <div className="legend-item">
                <span className="legend-dot error"></span> 오류
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Canvas */}
          <div className="workflow-canvas-wrapper">
            <div className="workflow-canvas">
              <div className="workflow-flow">
                {/* Phase 1: Trigger */}
                <div className="workflow-section-label">TRIGGER · 파이프라인 시작점</div>
                {renderNodeCard('scheduler')}

                {renderArrow()}

                {/* Phase 2: Prepare */}
                <div className="workflow-section-label">PREPARE · 설정 로드</div>
                {renderNodeCard('config-loader')}

                {renderArrow()}

                {/* Phase 3: Sectors (Parallel) */}
                <div className="workflow-section-label">SECTORS · 병렬 처리 대상 (순차 실행)</div>
                <div className="parallel-bracket">
                  <span className="parallel-label">FOR EACH SECTOR (sequential)</span>
                  <div className="sector-parallel-group">
                    {SECTOR_NODES.map(sector => renderSectorNode(sector))}
                  </div>
                </div>

                {renderArrow()}

                {/* Phase 4: Research */}
                <div className="workflow-section-label">RESEARCH · 뉴스 수집 파이프라인 (섹터당 실행)</div>
                <div className="workflow-row">
                  {renderNodeCard('keyword-extract')}
                  {renderHArrow()}
                  {renderNodeCard('naver-api')}
                  {renderHArrow()}
                  {renderNodeCard('dedup-filter')}
                </div>

                {renderArrow()}

                {/* Phase 5: Analysis */}
                <div className="workflow-section-label">ANALYSIS · AI 분석 및 이미지 보정</div>
                <div className="workflow-row">
                  {renderNodeCard('gpt-analysis')}
                  {renderHArrow()}
                  {renderNodeCard('image-match')}
                </div>

                {renderArrow()}

                {/* Phase 6: Storage */}
                <div className="workflow-section-label">STORAGE · 데이터 영속화</div>
                <div className="workflow-row">
                  {renderNodeCard('supabase-save')}
                  {renderHArrow()}
                  {renderNodeCard('cache-clear')}
                </div>

                {renderArrow()}

                {/* Phase 7: Infrastructure */}
                <div className="workflow-section-label">INFRA · 백엔드 인프라</div>
                {renderNodeCard('render-backend')}

                {renderArrow()}

                {/* Phase 8: Output */}
                <div className="workflow-section-label">OUTPUT · 최종 결과 전달</div>
                <div className="workflow-row">
                  {renderNodeCard('telegram-broadcast')}
                  {renderNodeCard('vercel-frontend')}
                </div>
              </div>
            </div>
          </div>

          {/* Detail Panel (Right Drawer) */}
          <div className={`workflow-detail-panel ${(selectedNode || selectedSector) ? 'open' : ''}`}>
            {selectedNode && (
              <div className="detail-panel-inner">
                <button className="detail-close-btn" onClick={() => setSelectedNodeId(null)}>✕</button>

                <div className="detail-header">
                  <div className={`detail-icon ${selectedNode.type}`}>{selectedNode.icon}</div>
                  <div className="detail-title">{selectedNode.title}</div>
                  <div className="detail-type">{selectedNode.type} · {selectedNode.phase}</div>
                </div>

                {/* 역할 설명 */}
                <div className="detail-section">
                  <div className="detail-section-title">역할 및 동작</div>
                  <div className="detail-description">{selectedNode.description}</div>
                </div>

                {/* 설계 사유 */}
                <div className="detail-section">
                  <div className="detail-section-title">설계 사유 (Why?)</div>
                  <div className="detail-description" style={{ borderLeft: '3px solid #8b6b3f', paddingLeft: '20px' }}>
                    {selectedNode.reason}
                  </div>
                </div>

                {/* 상세 설정 */}
                <div className="detail-section">
                  <div className="detail-section-title">설정 상세</div>
                  <table className="detail-config-table">
                    <tbody>
                      {Object.entries(selectedNode.config).map(([key, val]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 현재 상태 */}
                <div className="detail-section">
                  <div className="detail-section-title">현재 상태</div>
                  {(() => {
                    const status = getNodeStatus(selectedNode.id);
                    // 연관 로그 찾기
                    let relatedLogs = [];
                    if (selectedNode.statusKey === 'all') {
                      relatedLogs = liveStatus['all']?.logs || [];
                    } else {
                      // 모든 섹터의 로그를 모아서 표시
                      SECTOR_NODES.forEach(s => {
                        const sLogs = liveStatus[s.id]?.logs || [];
                        relatedLogs.push(...sLogs.slice(0, 3));
                      });
                    }

                    return (
                      <>
                        <div className={`detail-status-card ${status}`}>
                          <div className="detail-status-label">
                            <span className={`status-indicator ${status}`}></span>
                            {status === 'working' ? 'RUNNING' : status === 'error' ? 'ERROR' : 'IDLE'}
                          </div>
                          <div className="detail-status-text">
                            {status === 'working' ? '파이프라인이 현재 이 단계를 실행 중입니다.' : '대기 상태입니다.'}
                          </div>
                        </div>
                        {relatedLogs.length > 0 && (
                          <div className="detail-live-logs" style={{ marginTop: '12px' }}>
                            {relatedLogs.slice(0, 10).map((log, i) => (
                              <div key={i} className="detail-log-entry">{log}</div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            {selectedSector && renderSectorDetail()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowMonitor;
