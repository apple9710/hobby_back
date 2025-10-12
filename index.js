const express = require('express');

const app = express();
app.use(express.json()); 
const PORT = 3000;

// JSON 데이터 불러오기
const data = require('./data.json');

// 취미별 단어 가져오기
app.get('/hobby/:type', (req, res) => {
  const type = req.params.type; // URL 파라미터
  const result = data[type];

  if (result) {
    res.json({ hobby: type, words: result });
  } else {
    res.status(404).json({ error: 'Hobby not found' });
  }
});

const fs = require('fs');

// POST 요청으로 데이터 받기
app.post('/hobby/:type', (req, res) => {
  const type = req.params.type;  // URL 파라미터 예: game
  const word = req.body.word;    // JSON body에서 단어 꺼냄

  if (!word) {
    return res.status(400).json({ error: 'word is required' });
  }

  // 해당 hobby가 없으면 새로 만들기
  if (!data[type]) {
    data[type] = [];
  }

  // 단어 추가
  data[type].push(word);

  // 파일에 저장 (덮어쓰기)
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));

  res.json({ message: 'Word added', hobby: type, words: data[type] });
});




// 서버 실행
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

