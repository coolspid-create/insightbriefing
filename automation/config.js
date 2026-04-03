module.exports = {
  sectors: [
    {
      id: 'sector-ren',
      name: '신재생에너지(태양광)',
      queries: ['태양광 보조금', '태양광 정책', '태양광 공급망', 'ESS 연계'],
      weight: 1.0
    },
    {
      id: 'sector-safe',
      name: '제품안전',
      queries: ['제품 결함', '배터리 리콜', '화재 발화', '유해물질 검출', '안전 규제 확인', '보안 취약점'],
      weight: 2.0, // 특별히 안전 이슈 가중치 상향 조정
      isUrgent: true // 긴급 키워드로 분류하여 텔레그램 발송 시 알림 강화 강제
    },
    {
      id: 'sector-const',
      name: '인테리어·건설',
      queries: ['건설 자재 단가', '친환경 인테리어', '숙련공 부족', '스마트홈'],
      weight: 1.0
    },
    {
      id: 'sector-ai',
      name: 'AI·테크',
      queries: ['AI 에이전트 도입', 'sLLM 보안', 'AI 저작권 논란', 'AI 인프라'],
      weight: 1.0
    },
    {
      id: 'sector-comm',
      name: '커머스',
      queries: ['이커머스 전환율', '당일 콜드체인 배송', '플랫폼 입점 수수료', '구독 경제 모델'],
      weight: 1.0
    }
  ]
};
