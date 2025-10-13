const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

// CORS: GitHub Pages와 localhost만 허용
const corsOptions = {
  origin: [
    'http://localhost',
    'http://localhost:3000', // 포트 추가
    'http://localhost:5500', // Live Server 등
    'http://localhost:5174',
    'http://localhost:5173',
    'http://127.0.0.1',
    'https://apple9710.github.io',
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = 3000;
const dataPath = path.join(__dirname, 'data.json');

// 데이터 로드
let data = {};
try {
  data = require(dataPath);
} catch (err) {
  console.log('data.json not found, creating new one');
  fs.writeFileSync(dataPath, JSON.stringify({}));
}

// GET: 취미별 단어 가져오기
app.get('/hobby/:type', (req, res) => {
  const type = req.params.type;
  const result = data[type];

  if (result) {
    res.json({ hobby: type, words: result });
  } else {
    res.status(404).json({ error: 'Hobby not found' });
  }
});

// POST: 단어 추가
app.post('/hobby/:type', (req, res) => {
  const type = req.params.type;
  const word = req.body.word;

  if (!word) {
    return res.status(400).json({ error: 'word is required' });
  }

  if (!data[type]) {
    data[type] = [];
  }

  data[type].push(word);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({ message: 'Word added', hobby: type, words: data[type] });
});

// SSL 인증서 로드 (HTTPS 서버용)
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/chukapi.xyz/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/chukapi.xyz/fullchain.pem')
};

// HTTPS 서버 실행 (외부 접속 허용)
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS Server running on port ${PORT}`);
});
