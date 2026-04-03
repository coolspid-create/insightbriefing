# Insight Briefing 관리자 페이지 구현 계획

사용자 요청에 따라 수동 업데이트, 검색어/금칙어 설정, 기사 내용 실시간 수정 기능 등을 포함한 **관리자(Admin) 대시보드**를 구축합니다. 

현재 시스템은 스크립트 기반 파일 쓰기로 동작하고 있으므로, 관리자 페이지 연동을 위해 **Express 기반의 가벼운 백엔드 API 서버 구축**이 필요합니다.

## User Review Required

> [!IMPORTANT]  
> 관리자 페이지를 구현하려면 기존 정적 파일(`mockData.js`, `config.js`) 방식을 **API 기반의 동적 데이터베이스(JSON 파일 기반 API 통신) 구조**로 변경해야 합니다. 이에 대해 동의하시는지 검토 부탁드립니다.

## Proposed Changes

### 백엔드 (API Server)
기존 `automation` 폴더를 발전시켜 **Node.js Express API 서버** 역할을 하도록 구성합니다.
*   **[NEW] `automation/server.js`**: 프론트엔드와 통신하는 API 서버 (포트 3001 예상)
*   **[NEW] `automation/database.json`**: 기존 `mockData.js`를 대체하는 실제 JSON 데이터 저장소
*   **[NEW] `automation/config.json`**: 기존 `config.js`를 대체하여 검색어, 금칙어(새로 추가), 우선순위(가중치)를 저장·수정할 수 있도록 하는 설정 파일
*   **[MODIFY] `automation/pipeline.js`**: `config.json`과 `database.json`을 사용하여 데이터를 읽고 쓰도록 수정. (명시된 금칙어가 프롬프트나 결과에서 배제되도록 AI 프롬프트 개선)

#### API 엔드포인트 구성 (예정)
*   `GET /api/config`, `POST /api/config` : 설정(검색어, 금칙어 등) 불러오기 및 수정
*   `GET /api/news`, `POST /api/news` : 현재 반영된 웹 페이지 뉴스 내용(수정 기능 포함) 연동
*   `POST /api/trigger/:sectorId` : 특정 섹터에 대해 **수동으로 뉴스 수집 파이프라인 트리거** 실행

---

### 프론트엔드 (Admin UI)
리액트 라우터를 도입하여 일반 웹 브라우저(`localhost:5173`)와 관리자 페이지(`localhost:5173/admin`)를 분리합니다.
*   **[NEW] `frontend/src/pages/AdminDashboard.jsx`**: 
    *   **섹터별 수동 업데이트 패널**: "지금 업데이트" 버튼 클릭 시 `/api/trigger` 호출 후 텔레그램 및 웹 동시에 최신화
    *   **설정 에디터**: 텍스트 입력창으로 섹터별 쿼리, 금칙어, 긴급 모드 (Urgent) 즉각 수정 가능
    *   **메인 콘텐츠 에디터**: 각 기사의 Title, Impact, Summary 내용을 웹상에서 직접 수정할 수 있는 어드민 테이블 (수정 시 바로 웹/DB에 반영)
*   **[MODIFY] `frontend/vite.config.js`**: `/api` 요청을 Express 서버로 넘기기 위한 Proxy 설정 추가
*   **[MODIFY] `frontend/src/App.jsx`**: `react-router-dom`을 적용해 라우팅 구조 구성.
*   **[MODIFY] `frontend/src/components/Sector.jsx`**: 기존의 `mockData.js` 직접 `import` 대신 `useEffect` 내에서 `fetch('/api/news')`를 통해 실시간 데이터를 렌더링하도록 변경.

## Open Questions

> [!TIP]  
> 관리자 페이지에는 비밀번호 등 별도의 로그인(권한 제어) 기능이 바로 필요하신가요, 아니면 현재 MVP 단계이므로 로그인 없이 숨겨진 URL(`localhost:5173/admin`)로 직접 접속하는 형태로 빠르게 구성해 드릴까요?

## Verification Plan

### Automated Tests
1. API 서버 구동 테스트 (설정 수정 API 정상 작동 여부)
2. `POST /api/trigger` 호출 시 지정된 섹터만 텔레그램으로 메세지가 발송되는지 검증
3. 텍스트 에디터에서 기사 제목(Title) 수정 시 새로고침 없이 메인 웹 페이지에 반영되는지 검증

### Manual Verification
*   관리자 페이지 UI(설정 및 기사 내용 수정 폼)가 정상적으로 표시되는지 브라우저를 통해 확인.
*   금칙어를 설정하고 실제로 수동 업데이트를 돌렸을 때 해당 키워드가 배제되는지 확인.
