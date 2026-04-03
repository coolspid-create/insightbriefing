# Insight Briefing 자동화/백엔드 명세 (개발 전달용)

## 1. 전체 흐름

수집 → 정제 → 분류 → 점수화 → 요약 → 저장 → 발송

---

## 2. 스케줄

- 매일 오전 9시 발송
- 기준: 최근 24시간 기사

---

## 3. 데이터 구조

### NewsItem
```
{
  title,
  impact,
  summary,
  image,
  link
}
```

---

## 4. DB 핵심 테이블

### sectors
- id
- name
- telegram_url

### articles
- id
- title
- content
- published_at

### briefing_items
- sector_id
- title
- impact
- summary
- image
- link

---

## 5. 처리 로직

### 수집
- RSS/API 기반

### 정제
- 중복 제거
- 24시간 필터

### 점수화
- 관련성
- 영향도
- 신뢰도

### 선별
- 섹터별 상위 6개

---

## 6. 텔레그램 구조

### 채널
- 섹터별 분리

### 메시지
```
1) 제목
- 영향
- 요약
- 링크
```

---

## 7. 아키텍처 구성

- Scheduler
- Collector
- Processor
- AI Summary
- Publisher

---

## 8. MVP 범위

필수:
- 뉴스 수집
- 6개 선별
- 요약
- 텔레그램 발송

---

## 9. 전달 문장

"섹터별 뉴스 6개를 매일 오전 9시에 자동 생성하고 텔레그램으로 발송하는 구조로 구현해주세요."

