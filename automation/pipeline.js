require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchNaverNews(query) {
  try {
    const url = 'https://openapi.naver.com/v1/search/news.json';
    const response = await axios.get(url, {
      params: { query: query, display: 30, sort: 'sim' },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    return response.data.items.map(item => {
      // 제목에서 언론사 추출 시도 (예: "삼성전자 - [파이낸셜뉴스]")
      const title = item.title.replace(/<[^>]*>?/g, '').replace(/&quot;/g, '"');
      const description = item.description.replace(/<[^>]*>?/g, '').replace(/&quot;/g, '"');
      
      // 네이버 뉴스 검색 결과의 link 주소에서 언론사를 식별할 수 있는 정보를 AI에게 전달하기 위해 포함
      return {
        title,
        description,
        link: item.link,
        original_link: item.originallink || item.link
      };
    });
  } catch (error) {
    console.error(`❌ 네이버 뉴스 API 조회 오류 (${query}):`, error.message);
    return [];
  }
}

async function fetchAndProcessNews(targetSectorId = null) {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  console.log("===================================================================");
  console.log(`[${new Date().toLocaleString()}] 통합 AI 파이프라인 엔진 가동 (target: ${targetSectorId || 'ALL'})`);
  console.log("===================================================================");
  
  const results = {};

  for (const sector of config.sectors) {
    if (targetSectorId && sector.id !== targetSectorId) continue;

    if (global.updateStatus) global.updateStatus(sector.id, 'working', `리서치 엔진 가동: ${sector.name}`);
    console.log(`\n▶ [${sector.name}] 통합 리서치 가이드 기반 분석 시작`);
    
    // 섹터 이름을 메인 키워드로 사용하여 네이버에서 우선 광범위하게 수집 후, AI가 상세 조건에 맞춰 필터링
    const combinedQuery = sector.name;
    if (global.updateStatus) global.updateStatus(sector.id, 'working', `네이버 뉴스 탐색 시작 (키워드: ${combinedQuery})`);
    console.log(`   - 검색 엔진 쿼리 전송: "${combinedQuery}"`);
    
    // 1. 네이버에서 실제 뉴스 수집
    let rawNewsData = await fetchNaverNews(combinedQuery);
    
    if (rawNewsData.length === 0) {
      if (global.updateStatus) global.updateStatus(sector.id, 'idle', `검색 결과 없음 (스킵)`);
      console.log(`   ⚠️ 검색 결과가 없습니다. 스킵합니다.`);
      results[sector.id] = [];
      continue;
    }

    if (global.updateStatus) global.updateStatus(sector.id, 'working', `중복 대조를 위한 썸네일 분석 중...`);
    
    // [중복 정밀 진단] 제목(유사도) + 이미지(URL) 복합 필터링
    const finalCandidates = [];
    const seenTitles = new Set();
    const seenImages = new Set();

    for (const item of rawNewsData.slice(0, 30)) { // 상위 30개 정밀 검사
      const cleanTitle = item.title.replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣]/g, '').substring(0, 15);
      if (seenTitles.has(cleanTitle)) continue;

      // 실시간 이미지 추출 (중복 판단용)
      let currentImage = null;
      try {
        const imgRes = await axios.get(item.link, { timeout: 2000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const match = imgRes.data.match(/<meta[^>]*property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i);
        if (match && match[1]) currentImage = match[1];
      } catch (e) { /* ignore */ }

      // 동일 이미지를 사용하는 기사(동일 보도자료) 걸러내기
      if (currentImage && seenImages.has(currentImage)) {
        console.log(`   - [중복 제외] 이미지가 겹침: ${item.title.substring(0,20)}...`);
        continue;
      }

      item.image = currentImage; // 수집한 김에 데이터에 박아둠
      seenTitles.add(cleanTitle);
      if (currentImage) seenImages.add(currentImage);
      finalCandidates.push(item);
      
      if (finalCandidates.length >= 15) break; // 충분히 추려졌으면 중단
    }

    if (global.updateStatus) global.updateStatus(sector.id, 'working', `중복 제거 완료 (${finalCandidates.length}건 유효). AI 최종 브리핑 생성 중...`);

    let priorityContext = `산업분야(${sector.name})의 전문 컨설팅 브리핑을 작성하십시오. 중복된 내용의 기사(다른 언론사의 동일 보도)는 배제하고, 다양한 관점의 소식을 포함하십시오.`;
    if (sector.isUrgent) {
      priorityContext = `[긴급 대응 전략 적용] ${sector.name} 관련 비즈니스 리프크 및 안전 위협 동향을 최우선 스캔하십시오. 중복 기사는 배제합니다.`;
    }

    const researchGuide = `\n\n[현재 섹터 리서치 가이드라인]\n${sector.researchSpecs}`;

    // 2. 수집된 네이버 뉴스를 OpenAI (GPT)로 요약/재가공
    try {
      console.log(`   └ [AI] 실제 기사 ${finalCandidates.length}건 분석 및 비즈니스 임팩트 도출 중...`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `당신은 탁월한 통찰력을 지닌 C-Level 산업 전략가입니다. 제공된 뉴스 목록과 다음의 리서치 가이드를 바탕으로 경영진 브리핑을 작성합니다.\n${priorityContext}${researchGuide}
**절대적인 규칙:**
1. **언론사명 날조 금지**: 각 기사의 '원본 언론사 이름'을 정확히 식별하십시오. 만약 제목이나 본문에 언론사명이 명시되지 않았다면, 도메인 주소(link) 등을 분석하여 실제 언론사명만 기재하십시오. 확신이 없다면 [뉴스] 와 같이 일반적인 명칭을 사용하되, 절대 가상의 이름을 지어내지 마십시오.
2. **중복 금지**: 서로 다른 주제 8개를 선정하고, 타 언론사의 동일 보도(중복 기사)는 배제하십시오.
3. **JSON 출력 형식**: 반드시 다음의 객체 형태로만 응답하십시오.
{
  "news": [
    {
      "title": "[언론사명] 실제 제목을 가공한 전문적인 헤드라인",
      "summary": "1~2문장의 비즈니스 임팩트 요약",
      "link": "기사 원본 URL"
    }
  ]
}`
          },
          {
            role: "user",
            content: `다음 뉴스 데이터(제목, 내용, 링크) 중 가장 가치 있는 8개를 엄선하십시오:\n${JSON.stringify(finalCandidates)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      const selectedNews = parsed.news || [];
      
      // 이미 위에서 이미지를 가져왔으므로, 선택된 뉴스에 매칭만 해줌
      for (const item of selectedNews) {
        const matched = finalCandidates.find(f => f.link === item.link);
        if (matched) item.image = matched.image;
      }

      results[sector.id] = selectedNews;
      if (global.updateStatus) global.updateStatus(sector.id, 'working', `GPT-4o 브리핑 및 영상 대조 중복제거 완료!`);
      console.log(`   ✅ [${sector.name}] 이미지 기반 중복제거 및 분석 완료!`);
    } catch (err) {
      console.error(`   ❌ [${sector.name}] AI 분석 오류:`, err.message);
      if (global.updateStatus) global.updateStatus(sector.id, 'idle', `AI 분석 오류 발생: ${err.message}`);
      results[sector.id] = [];
    }
  }

  if (global.updateStatus && targetSectorId) global.updateStatus(targetSectorId, 'idle', `전체 파이프라인 작업 완료 및 대기 중`);
  return results;
}

module.exports = { fetchAndProcessNews };
