require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const SECTOR_PLACEHOLDERS = {
  'sector-ren': 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=800',
  'sector-safe': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=800',
  'sector-const': 'https://images.unsplash.com/photo-1503387762-592dea58ef21?auto=format&fit=crop&q=80&w=800',
  'sector-ai': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
  'sector-comm': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800',
  'default': 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800'
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchNaverNews(query) {
  try {
    const url = 'https://openapi.naver.com/v1/search/news.json';
    const response = await axios.get(url, {
      params: { query: query, display: 50, sort: 'date' }, // 최신순(date)으로 50개 수집
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    const now = new Date();
    const limit = 24 * 60 * 60 * 1000; // 24시간 기준

    // 수집된 기사 중 24시간 이내의 기사만 필터링
    return response.data.items.filter(item => {
      const pubDate = new Date(item.pubDate);
      return (now - pubDate) < limit;
    }).map(item => {
      const title = item.title.replace(/<[^>]*>?/g, '').replace(/&quot;/g, '"');
      const description = item.description.replace(/<[^>]*>?/g, '').replace(/&quot;/g, '"');
      
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

    if (global.updateStatus) global.updateStatus(sector.id, 'working', `리서치 엔진 가동: ${sector.name}`, 'info');
    console.log(`\n▶ [${sector.name}] 통합 리서치 가이드 기반 분석 시작`);
    
    // 가이드라인에서 '주요 검색 키워드' 섹션만 정밀 추출
    const keywordMatch = sector.researchSpecs.match(/# 주요 검색 키워드\s*:\s*([^\r\n]*)/i);
    const keywords = keywordMatch ? keywordMatch[1].split(',').map(k => k.trim()).filter(k => k) : [];
    
    if (keywords.length > 0) {
      console.log(`   💡 가이드라인 키워드 감지: [${keywords.join(', ')}]`);
    }

    // 검색 시도 루프 (키워드 기반 -> 실패 시 섹터명 폴백)
    let rawNewsData = [];
    const searchAttempts = keywords.length > 0 ? [keywords.join(' '), sector.name] : [sector.name];

    for (const query of searchAttempts) {
      if (global.updateStatus) global.updateStatus(sector.id, 'working', `네이버 뉴스 탐색 시작 (쿼리: ${query})`, 'info');
      console.log(`   - 검색 엔진 쿼리 전송: "${query}"`);
      
      const newsItems = await fetchNaverNews(query);
      if (newsItems && newsItems.length > 0) {
        rawNewsData = newsItems;
        break; // 검색 결과 확보 시 다음으로 진행
      }
    }
    
    if (rawNewsData.length === 0) {
      if (global.updateStatus) global.updateStatus(sector.id, 'idle', `검색 결과 없음 (스킵)`, 'info');
      console.log(`   ⚠️ 모든 시도에도 불구하고 검색 결과가 없습니다. 스킵합니다.`);
      results[sector.id] = [];
      continue;
    }

    if (global.updateStatus) global.updateStatus(sector.id, 'working', `중복 대조를 위한 썸네일 분석 중...`, 'info');
    
    // URL에서 이미지 및 메타 추출 시도하는 헬퍼 함수
    const extractFromUrl = async (url) => {
      if (!url) return { image: null, publisher: null };
      try {
        const pageRes = await axios.get(url, { 
          timeout: 5000,
          maxRedirects: 5,
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
          } 
        });
        const html = pageRes.data;
        let img = null;
        let pub = null;
        
        // [전략 1] og:image (content가 앞에 오는 패턴도 대응)
        const ogImg = html.match(/<meta[^>]*property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i) ||
                      html.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*property=['"]og:image['"]/i);
        if (ogImg && ogImg[1]) img = ogImg[1];

        // [전략 2] twitter:image
        if (!img) {
          const twImg = html.match(/<meta[^>]*(?:property|name)=['"]twitter:image(?::src)?['"][^>]*content=['"]([^'"]+)['"]/i) ||
                        html.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*(?:property|name)=['"]twitter:image(?::src)?['"]/i);
          if (twImg && twImg[1]) img = twImg[1];
        }

        // [전략 3] 네이버 뉴스 본문 영역의 img 태그 (다양한 셀렉터 대응)
        if (!img) {
          const articleImg = html.match(/<div[^>]*(?:id|class)=['"][^'"]*(?:newsct_article|article_body|news_body|article_content|articeBody|nbd_article)[^'"]*['"][^>]*>[\s\S]*?<img[^>]*src=['"]([^'"]+)['"]/i) ||
                            html.match(/<img[^>]*class=['"][^'"]*(?:_article_full_img|nbd_main_img)[^'"]*['"][^>]*src=['"]([^'"]+)['"]/i);
          if (articleImg && articleImg[1]) img = articleImg[1];
        }

        // [전략 4] 본문 내 첫 고화질 이미지 (로고/아이콘 등 제외)
        if (!img) {
          const allImgs = [...html.matchAll(/<img[^>]*src=['"]([^'"]+)['"]/gi)];
          for (const m of allImgs) {
            const src = m[1];
            if (src.includes('logo') || src.includes('icon') || src.includes('banner') || 
                src.includes('btn_') || src.includes('bg_') || src.includes('sprite') ||
                src.includes('ad_') || src.includes('1x1') || src.includes('blank') ||
                src.includes('pixel') || src.includes('loading') ||
                src.endsWith('.gif') || src.endsWith('.svg')) continue;
            img = src;
            break;
          }
        }

        // og:site_name에서 언론사명 추출
        const siteMatch = html.match(/<meta[^>]*property=['"]og:site_name['"][^>]*content=['"]([^'"]+)['"]/i) ||
                         html.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*property=['"]og:site_name['"]/i);
        if (siteMatch && siteMatch[1]) pub = siteMatch[1];

        return { image: img, publisher: pub };
      } catch (e) { 
        return { image: null, publisher: null }; 
      }
    };

    // [중복 정밀 진단] 제목(유사도) + 이미지(URL) 복합 필터링
    const finalCandidates = [];
    const seenTitles = new Set();
    const seenImages = new Set();

    for (const item of rawNewsData.slice(0, 30)) { // 상위 30개 정밀 검사
      const cleanTitle = item.title.replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣]/g, '').substring(0, 15);
      if (seenTitles.has(cleanTitle)) continue;

      // ===== 이미지 & 언론사 정보 추출 (다중 소스 전략) =====
      let currentImage = null;
      let publisherName = null;

      // 1차 시도: 네이버 링크 (n.news.naver.com)
      const naverResult = await extractFromUrl(item.link);
      currentImage = naverResult.image;
      publisherName = naverResult.publisher;

      // 2차 시도: 네이버 링크에서 이미지를 못 가져왔으면, 원본 언론사 링크에서 재시도
      if (!currentImage && item.original_link && item.original_link !== item.link) {
        console.log(`   - [2차 시도] 원본 링크에서 이미지 추출: ${item.original_link.substring(0, 50)}...`);
        const origResult = await extractFromUrl(item.original_link);
        if (origResult.image) currentImage = origResult.image;
        if (!publisherName && origResult.publisher) publisherName = origResult.publisher;
      }

      // 상대경로 -> 절대경로 보정 (더욱 견고하게)
      if (currentImage && !currentImage.startsWith('http')) {
        try {
          const baseUrlStr = item.original_link || item.link;
          const base = new URL(baseUrlStr);
          if (currentImage.startsWith('//')) {
            currentImage = 'https:' + currentImage;
          } else if (currentImage.startsWith('/')) {
            currentImage = base.origin + currentImage;
          } else {
            currentImage = base.origin + '/' + currentImage;
          }
        } catch (e) { /* ignore */ }
      }

      // 동일 이미지를 사용하는 기사(동일 보도자료) 걸러내기
      if (currentImage && seenImages.has(currentImage)) {
        console.log(`   - [중복 제외] 이미지가 겹침: ${item.title.substring(0,20)}...`);
        continue;
      }

      if (currentImage) {
        console.log(`   ✓ [이미지 추출 성공] ${item.title.substring(0,25)}...`);
      }

      item.image = currentImage;
      item.publisher = publisherName;
      seenTitles.add(cleanTitle);
      if (currentImage) seenImages.add(currentImage);
      finalCandidates.push(item);
      
      if (finalCandidates.length >= 15) break;
    }

    // 이미지 추출 성공률 로그
    const imgSuccessCount = finalCandidates.filter(c => c.image).length;
    console.log(`   📊 이미지 추출 성공률: ${imgSuccessCount}/${finalCandidates.length} (${Math.round(imgSuccessCount/finalCandidates.length*100)}%)`);

    if (global.updateStatus) global.updateStatus(sector.id, 'working', `중복 제거 완료 (${finalCandidates.length}건 유효, 이미지 ${imgSuccessCount}건). AI 최종 브리핑 생성 중...`, 'info');

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
**핵심 지침:**
1. **수량 확보**: 가능한 한 **반드시 8개의 뉴스 기사**를 엄선하십시오. 후보가 충분하다면 반드시 8개를 채워야 합니다.
2. **기업/콘텐츠 다양성**: 동일한 기업이나 브랜드에 대한 기사는 **최대 2개**까지만 포함할 수 있습니다. 이미 유사한 내용을 다룬 언론사의 중복 보도는 배제하고, 최대한 다양한 관점과 주제를 선택하십시오.
3. **언론사명 정확성**: 각 기사의 'publisher' 필드를 우선 사용하고, **반드시 모든 제목의 맨 앞에 [언론사명]을 포함하십시오.** (예: [매일경제] 신재생에너지 보급 확대)
4. **JSON 출력 형식**: 반드시 다음의 객체 형태로만 응답하십시오.
{
  "news": [
    {
      "title": "[언론사명] 헤드라인",
      "summary": "1~2문장 요약",
      "link": "URL"
    }
  ]
}`
          },
          {
            role: "user",
            content: `다음 뉴스 데이터 중 가장 비즈니스 가치가 높은 8개를 엄선하여 JSON으로 응답하십시오 (현재 후보군: ${finalCandidates.length}건):\n${JSON.stringify(finalCandidates.map(({title, description, link, publisher}) => ({title, description, link, publisher})))}`
          }
        ],
        response_format: { type: "json_object" },
        timeout: 60000 // 60s timeout to avoid hanging
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      let selectedNews = parsed.news || [];
      
      // [보정 로직] 기사가 8개 미만일 경우 후보군에서 추가로 채움
      if (selectedNews.length < 8 && finalCandidates.length > selectedNews.length) {
        console.log(`   ⚠️ AI 결과 기사 부족 (${selectedNews.length}/8). 후보군에서 추가 수집 중...`);
        const existingLinks = new Set(selectedNews.map(n => n.link));
        const extraCandidates = finalCandidates.filter(c => !existingLinks.has(c.link));
        
        for (const extra of extraCandidates) {
          if (selectedNews.length >= 8) break;
          const pub = extra.publisher || '소식';
          selectedNews.push({
            title: `[${pub}] ${extra.title}`,
            summary: extra.description ? extra.description.substring(0, 100) + '...' : '세부 내용을 확인하세요.',
            link: extra.link,
            image: extra.image
          });
        }
      }

      // [핵심 보정] 모든 기사 제목 맨 앞에 [언론사명] 강제 적용 (AI가 누락한 경우 대비)
      selectedNews = selectedNews.map(item => {
        // AI가 이미 [언론사]를 넣었는지 확인
        if (!item.title.startsWith('[')) {
          const matched = finalCandidates.find(f => f.link === item.link || f.original_link === item.link);
          const pub = matched?.publisher || '소식';
          item.title = `[${pub}] ${item.title}`;
        }
        return item;
      });

      // 선택된 뉴스에 이미지 매칭 (link 기반 + original_link 기반 양측 대조)
      for (const item of selectedNews) {
        if (item.image) continue; // 이미 보정 로직에서 채워졌다면 스킵
        const matched = finalCandidates.find(f => f.link === item.link || f.original_link === item.link);
        if (matched && matched.image) {
          item.image = matched.image;
        }
      }

      // ===== 이미지 누락 기사에 대한 재추출 (최종 안전망) =====
      const missingImgItems = selectedNews.filter(n => !n.image);
      if (missingImgItems.length > 0) {
        console.log(`   🔄 이미지 누락 ${missingImgItems.length}건에 대해 개별 재추출 시도...`);
        if (global.updateStatus) global.updateStatus(sector.id, 'working', `이미지 누락 ${missingImgItems.length}건 개별 재추출 중...`, 'info');
        
        for (const item of missingImgItems) {
          const retryResult = await extractFromUrl(item.link);
          if (retryResult.image) {
            item.image = retryResult.image;
            console.log(`   ✓ [재추출 성공] ${item.title.substring(0,25)}...`);
          } else {
            console.log(`   ✗ [재추출 실패] ${item.title.substring(0,25)}...`);
          }
        }
      }

      // ===== 기사 내용 보강 및 이미지 폴백 적용 =====
      selectedNews = selectedNews.map(item => {
        if (!item.image) {
          item.image = SECTOR_PLACEHOLDERS[sector.id] || SECTOR_PLACEHOLDERS['default'];
        }
        return item;
      });

      results[sector.id] = selectedNews;
      if (global.updateStatus) global.updateStatus(sector.id, 'working', `GPT-4o 브리핑 및 영상 대조 중복제거 완료!`, 'info');
      console.log(`   ✅ [${sector.name}] 이미지 기반 중복제거 및 분석 완료!`);
    } catch (err) {
      console.error(`   ❌ [${sector.name}] AI 분석 오류:`, err.message);
      if (global.updateStatus) global.updateStatus(sector.id, 'idle', `AI 분석 오류 발생: ${err.message}`, 'error');
      results[sector.id] = [];
    }
  }

  if (global.updateStatus && targetSectorId) global.updateStatus(targetSectorId, 'idle', `전체 파이프라인 작업 완료 및 대기 중`, 'success');
  return results;
}

module.exports = { fetchAndProcessNews };
