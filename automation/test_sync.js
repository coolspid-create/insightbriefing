const fs = require('fs');
const path = require('path');

const FRONTEND_DATA_PATH = path.join(__dirname, '../frontend/src/data/mockData.js');

try {
  let content = fs.readFileSync(FRONTEND_DATA_PATH, 'utf8');
  const dummyNews = {
    "sector-ren": [{ "id": 100, "title": "AI 동기화 완료 테스트 뉴스", "impact": "성공", "summary": "정상 적용되었습니다.", "link": "#", "image": "" }]
  };
  const newChunk = `export const MOCK_NEWS = ${JSON.stringify(dummyNews, null, 2)};`;
  const updated = content.replace(/export const MOCK_NEWS = \{[\s\S]*?\};/g, newChunk);
  fs.writeFileSync(FRONTEND_DATA_PATH, updated, 'utf8');
  console.log("Success");
} catch (e) {
  console.log("Error: " + e.message);
}
