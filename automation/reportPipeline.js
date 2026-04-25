require('dotenv').config();
const { OpenAI } = require('openai');
const supabase = require('./supabaseClient');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 mins for generating long report
});

async function generateWeeklyReport(sectorId, customStart = null, customEnd = null) {
  try {
    // 1. Fetch config for sector details
    const { data: sectorConfig, error: cfgError } = await supabase
      .from('sector_config')
      .select('id, name')
      .eq('id', sectorId)
      .single();

    if (cfgError) throw new Error(`Sector config error: ${cfgError.message}`);
    const sectorName = sectorConfig.name;

    // 2. Calculate period (default: previous Mon~Sun)
    let start, end;
    if (customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else {
      // When run on Monday, get last Mon~Sun
      // When run on any other day, still get the most recent completed Mon~Sun
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
      
      // Calculate last Sunday (end of previous week)
      // If today is Monday(1), last Sunday was 1 day ago
      // If today is Sunday(0), last Sunday was 7 days ago (the one before)
      const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
      end = new Date(today);
      end.setDate(today.getDate() - daysToLastSunday);
      end.setHours(23, 59, 59, 999);
      
      // Start = the Monday before that Sunday (6 days before Sunday)
      start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    // 3. Fetch history articles
    const { data: historyData, error: histError } = await supabase
      .from('news_history')
      .select('content, created_at')
      .eq('sector_id', sectorId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (histError) throw new Error(`History fetch error: ${histError.message}`);

    let allArticles = [];
    if (historyData) {
      historyData.forEach(record => {
        if (record.content && Array.isArray(record.content)) {
          allArticles.push(...record.content);
        }
      });
    }

    // Deduplicate by URL
    const uniqueMap = new Map();
    allArticles.forEach(item => {
      uniqueMap.set(item.link, item);
    });
    
    let articlesToAnalyze = Array.from(uniqueMap.values());
    if (articlesToAnalyze.length === 0) {
      throw new Error("최근 7일간의 수집된 뉴스 데이터가 없습니다.");
    }
    
    // Allow up to 200 articles to provide a comprehensive view of the entire week
    if (articlesToAnalyze.length > 200) {
      articlesToAnalyze = articlesToAnalyze.slice(0, 200);
    }

    const articleContext = articlesToAnalyze.map((a, idx) => 
      `[${idx + 1}] 제목: ${a.title}\n요약: ${a.summary}\nURL: ${a.link}`
    ).join('\n\n');

    const prompt = `
당신은 세계 최고 수준의 글로벌 산업 트렌드 및 미래 전망 분석 전문가(Top-tier Industry Consultant & Futurist)입니다. 
당신의 임무는 '${sectorName}' 산업의 최근 1주일간 전체 데이터를 심층적으로 분석하여, 단순 요약이 아닌 다각도(거시경제, 기술혁신, 비즈니스 모델, 시장 경쟁, 정책 등)의 입체적인 통찰을 제공하는 것입니다.
주어진 데이터를 바탕으로 다음 기준에 맞춰 최고 수준의 주간 트렌드 리포트를 작성해주세요.

[분석 요구사항]
1. 단순 사실 나열을 피하고, 현상의 '이면(Why)'과 '파급력(So What)'을 도출하세요.
2. 다양한 관점을 융합하여 산업 생태계 전체를 조망하는 분석을 제공하세요.
3. 개별 데이터의 파편들을 연결하여 거대한 흐름(Macro Trend)을 찾아내고, 이를 바탕으로 날카로운 미래를 예측하세요.

[분석 데이터]
${articleContext}

[출력 요구사항]
다음 JSON 구조로 응답해야 합니다:
{
  "title": "리포트 제목 (예: [주간 동향] AI 시장, 생성형 AI의 다음 단계 진입 - 시사점과 전략적 대응)",
  "one_line_summary": "이번 주 트렌드의 가장 핵심적인 본질과 전략적 시사점을 꿰뚫는 한 줄 결론 (30~50자)",
  "key_issues": ["거시적/구조적 관점의 핵심 이슈 1", "시장/기술 관점의 핵심 이슈 2", "경쟁/전략 관점의 핵심 이슈 3"],
  "trend_analysis": "대시보드용 요약(120자 내외)을 먼저 쓰고, 두 줄 개행(\\n\\n) 후 상세 분석(300자 내외)을 이어서 작성하세요.",
  "impact_analysis": "대시보드용 요약(120자 내외)을 먼저 쓰고, 두 줄 개행(\\n\\n) 후 상세 분석(300자 내외)을 이어서 작성하세요.",
  "future_outlook": "대시보드용 요약(120자 내외)을 먼저 쓰고, 두 줄 개행(\\n\\n) 후 상세 분석(300자 내외)을 이어서 작성하세요.",
  "diagram_prompt": "이번 주 트렌드를 보여주는 Mermaid.js flowchart (TD) 문법 코드. (마크다운 백틱 제외, 순수 코드만). 반드시 graph TD 로 시작하고, 텍스트에 HTML 특수문자나 복잡한 괄호를 빼서 렌더링 에러가 나지 않도록 작성.",
  \"relevant_count\": \"(숫자) 제공된 ${articlesToAnalyze.length}건 중 실제로 ${sectorName} 산업과 연관된 기사 수를 정확히 세어 숫자만 입력\",
  \"source_indices\": \"(배열) 연관 기사 중 리포트 핵심 논지를 뒷받침하는 가장 중요한 기사 번호 최대 5개\"
}

[참조 기사 선별 기준 - 매우 중요]
1. "relevant_count": 제공된 전체 기사 중에서 '${sectorName}' 산업의 이번 주간 트렌드 분석에 실질적으로 연관되어 통찰 도출에 기여한 기사의 총 건수입니다. 해당 산업과 전혀 무관한 기사(다른 산업, 단순 광고, 관련 없는 사건 등)는 반드시 제외하세요. 숫자를 정직하게 산출하세요.
2. "source_indices": 위 relevant_count에 해당하는 기사들 중에서도 리포트의 핵심 논지를 직접적으로 뒷받침하는 가장 중요한 기사 최대 5건의 번호입니다. 리포트를 읽는 독자가 이 기사를 보면 리포트의 분석 근거를 이해할 수 있다고 느낄 수 있는 기사만 엄선하세요. 5건 미만이어도 무방합니다.
    `;

    console.log(`[Report] GPT 분석 요청 시작 (${sectorName}, 분석 기사 수: ${articlesToAnalyze.length})`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "당신은 세계 최고 수준의 산업 동향 분석가이자 미래학자입니다. 제공된 데이터를 기반으로 입체적이고 전략적인 통찰이 담긴 JSON 형태의 리포트를 작성합니다. 모든 분석 필드(trend_analysis, impact_analysis, future_outlook)는 반드시 '요약내용\\n\\n상세내용' 형식을 지켜야 합니다." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const reportJson = JSON.parse(response.choices[0].message.content);
    
    // Map source indices to actual URLs (top 5 critical articles)
    let sourceArticleIds = reportJson.source_indices 
      ? reportJson.source_indices.map(idx => articlesToAnalyze[idx - 1]?.link).filter(Boolean)
      : [];

    // Store the AI-determined relevant article count (not the raw total)
    const relevantCount = reportJson.relevant_count || articlesToAnalyze.length;
    sourceArticleIds.push(`RELEVANT_COUNT:${relevantCount}`);

    console.log(`[Report] GPT 분석 완료. 데이터 저장 준비 중...`);
    let diagramImageUrl = null;

    const dbPayload = {
      report_type: 'weekly',
      sector_id: sectorId,
      title: reportJson.title || `${sectorName} 주간 트렌드 리포트`,
      period_start: start.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0],
      one_line_summary: reportJson.one_line_summary,
      key_issues: reportJson.key_issues,
      trend_analysis: reportJson.trend_analysis,
      impact_analysis: reportJson.impact_analysis,
      future_outlook: reportJson.future_outlook,
      diagram_type: 'image',
      diagram_prompt: reportJson.diagram_prompt,
      diagram_image_url: diagramImageUrl,
      source_article_ids: sourceArticleIds,
      status: 'published',
      published_at: new Date().toISOString()
    };

    // Save to DB
    const { data: insertedData, error: insertError } = await supabase
      .from('trend_reports')
      .insert(dbPayload)
      .select()
      .single();

    if (insertError) throw new Error(`Report DB Insert Error: ${insertError.message}`);

    console.log(`[Report] 리포트 생성 및 저장 완료: ${insertedData.id}`);
    
    return insertedData;

  } catch (error) {
    console.error(`[Report Error] Failed to generate weekly report for ${sectorId}:`, error.message);
    throw error;
  }
}

module.exports = {
  generateWeeklyReport
};
