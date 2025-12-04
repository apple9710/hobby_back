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
    'https://open-yy.com',
    'https://apple9710.github.io',
    'https://theopenproduct.cafe24.com',
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const crypto = require('crypto');

const PORT = 3000;
const dataPath = path.join(__dirname, 'data.json');
const authPath = path.join(__dirname, 'auth.json');

// 마스터 코드 (환경변수 또는 하드코딩 - 실제 운영시 환경변수 권장)
const MASTER_CODE = process.env.MASTER_CODE || 'your-master-code-here';

// 세션 검증용 키 (프론트 세션스토리지와 동일해야 함)
const SESSION_KEY = 'hobby_session';
const SESSION_VALUE = process.env.SESSION_VALUE || 'authenticated_user_2024';

// 코드 유효기간 (24시간, 밀리초)
const CODE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// 인증 코드 데이터 로드
let authData = { codes: [] };
try {
  authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
} catch (err) {
  console.log('auth.json not found, creating new one');
  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
}

// 기본 데이터 상수
const DEFAULT_DATA = {
  game: ['오버워치', '배틀그라운드', '마인크래프트'],
  book: ['천개의파랑', '지구끝의온실', '총,균,쇠'],
  movie: ['드래곤길들이기', '괴물의 아이', '러브레터'],
  food: ['피자', '초밥', '회'],
  pet: ['물고기', '도마뱀', '강아지'],
  plant: ['선인장', '스투키', '능소화'],
  money: ['저축하기', '여행가기', '쇼핑'],
  music: ['세카이노오와리', '알렉산드로스', '스파이에어'],
  family: ['여동생', '오빠, 여동생', '5인가족'],
  health: ['영양제 먹기', '헬스', '등산'],
  job: ['모션그래픽', '타투이스트', '애견미용사'],
  home: ['남양주', '수원', '의정부'],
};

// 데이터 로드
let data = {};
try {
  data = require(dataPath);
} catch (err) {
  console.log('data.json not found, creating new one with default data');
  data = JSON.parse(JSON.stringify(DEFAULT_DATA)); // 깊은 복사
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// 서버 시작 시 중복 제거 함수
function removeDuplicates() {
  let hasChanges = false;

  Object.keys(data).forEach((hobby) => {
    const originalLength = data[hobby].length;

    // 공백 제거 후 비교하여 중복 제거 (원본 유지)
    const seen = new Set();
    data[hobby] = data[hobby].filter((word) => {
      const normalized = word.trim().replace(/\s+/g, '');
      if (seen.has(normalized.toLowerCase())) {
        return false;
      }
      seen.add(normalized.toLowerCase());
      return true;
    });

    if (data[hobby].length !== originalLength) {
      hasChanges = true;
      console.log(
        `[${hobby}] Removed ${originalLength - data[hobby].length} duplicates`,
      );
    }
  });

  if (hasChanges) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('Duplicates removed and saved to data.json');
  } else {
    console.log('No duplicates found');
  }
}

// 서버 시작 시 중복 제거 실행
removeDuplicates();

// GET: 전체 데이터 가져오기
app.get('/data', (req, res) => {
  res.json(data);
});

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

  // 중복 체크: 공백 제거 후 비교 (대소문자 무시)
  const normalizedInput = word.trim().replace(/\s+/g, '').toLowerCase();
  const isDuplicate = data[type].some((existingWord) => {
    const normalized = existingWord.trim().replace(/\s+/g, '').toLowerCase();
    return normalized === normalizedInput;
  });

  if (isDuplicate) {
    return res.status(409).json({
      error: 'Duplicate word',
      message: 'This word already exists',
      hobby: type,
      words: data[type],
    });
  }

  data[type].push(word);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({ message: 'Word added', hobby: type, words: data[type] });
});

// DELETE: 단어 삭제
app.delete('/hobby/:type', (req, res) => {
  const type = req.params.type;
  const word = req.body.word;

  if (!word) {
    return res.status(400).json({ error: 'word is required' });
  }

  if (!data[type]) {
    return res.status(404).json({ error: 'Hobby not found' });
  }

  // 단어 찾기 (공백 제거 후 비교)
  const normalizedInput = word.trim().replace(/\s+/g, '').toLowerCase();
  const index = data[type].findIndex((existingWord) => {
    const normalized = existingWord.trim().replace(/\s+/g, '').toLowerCase();
    return normalized === normalizedInput;
  });

  if (index === -1) {
    return res.status(404).json({
      error: 'Word not found',
      message: 'This word does not exist',
      hobby: type,
      words: data[type],
    });
  }

  // 삭제
  const deletedWord = data[type].splice(index, 1)[0];
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({
    message: 'Word deleted',
    deletedWord: deletedWord,
    hobby: type,
    words: data[type],
  });
});

// PUT: 단어 수정
app.put('/hobby/:type', (req, res) => {
  const type = req.params.type;
  const { oldWord, newWord } = req.body;

  if (!oldWord || !newWord) {
    return res.status(400).json({ error: 'oldWord and newWord are required' });
  }

  if (!data[type]) {
    return res.status(404).json({ error: 'Hobby not found' });
  }

  // 기존 단어 찾기
  const normalizedOldWord = oldWord.trim().replace(/\s+/g, '').toLowerCase();
  const index = data[type].findIndex((existingWord) => {
    const normalized = existingWord.trim().replace(/\s+/g, '').toLowerCase();
    return normalized === normalizedOldWord;
  });

  if (index === -1) {
    return res.status(404).json({
      error: 'Word not found',
      message: 'The old word does not exist',
      hobby: type,
      words: data[type],
    });
  }

  // 새 단어 중복 체크
  const normalizedNewWord = newWord.trim().replace(/\s+/g, '').toLowerCase();
  const isDuplicate = data[type].some((existingWord, i) => {
    if (i === index) return false; // 자기 자신은 제외
    const normalized = existingWord.trim().replace(/\s+/g, '').toLowerCase();
    return normalized === normalizedNewWord;
  });

  if (isDuplicate) {
    return res.status(409).json({
      error: 'Duplicate word',
      message: 'The new word already exists',
      hobby: type,
      words: data[type],
    });
  }

  // 수정
  data[type][index] = newWord;
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({
    message: 'Word updated',
    oldWord: oldWord,
    newWord: newWord,
    hobby: type,
    words: data[type],
  });
});

// ============ 인증 API ============

// 만료된 코드 정리 함수
function cleanExpiredCodes() {
  const now = Date.now();
  const before = authData.codes.length;
  authData.codes = authData.codes.filter((item) => {
    const createdAt = new Date(item.createdAt).getTime();
    return now - createdAt < CODE_EXPIRY_MS;
  });
  if (authData.codes.length !== before) {
    fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
    console.log(`Cleaned ${before - authData.codes.length} expired codes`);
  }
}

// 서버 시작 시 만료 코드 정리
cleanExpiredCodes();

// GET: 코드 발급 페이지 (누구나 접근 가능)
app.get('/publish', (req, res) => {
  // 만료된 코드 정리
  cleanExpiredCodes();

  // 새 인증 코드 생성 (16자리 랜덤 문자열)
  const newCode = crypto.randomBytes(8).toString('hex');

  authData.codes.push({
    code: newCode,
    createdAt: new Date().toISOString(),
  });

  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));

  res.json({
    message: 'Auth code issued',
    code: newCode,
    expiresIn: '24 hours',
  });
});

// POST: 인증 코드 발급 (마스터 코드 필요) - 기존 유지
app.post('/auth/issue', (req, res) => {
  const { masterCode } = req.body;

  if (!masterCode) {
    return res.status(400).json({ error: 'masterCode is required' });
  }

  if (masterCode !== MASTER_CODE) {
    return res.status(403).json({ error: 'Invalid master code' });
  }

  // 만료된 코드 정리
  cleanExpiredCodes();

  // 새 인증 코드 생성 (16자리 랜덤 문자열)
  const newCode = crypto.randomBytes(8).toString('hex');

  authData.codes.push({
    code: newCode,
    createdAt: new Date().toISOString(),
  });

  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));

  res.json({
    message: 'Auth code issued',
    code: newCode,
    expiresIn: '24 hours',
  });
});

// POST: 인증 코드 검증 (코드 입력해서 접속 시)
app.post('/auth/verify', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }

  // 만료된 코드 정리
  cleanExpiredCodes();

  const validCode = authData.codes.find((item) => item.code === code);

  if (validCode) {
    // 유효한 코드면 세션 값도 함께 반환
    res.json({
      valid: true,
      message: 'Access granted',
      sessionKey: SESSION_KEY,
      sessionValue: SESSION_VALUE,
    });
  } else {
    res.status(401).json({ valid: false, message: 'Invalid or expired code' });
  }
});

// POST: 세션 검증 (페이지 접근 시 세션스토리지 값 확인)
app.post('/auth/session', (req, res) => {
  const { sessionValue } = req.body;

  if (!sessionValue) {
    return res.status(400).json({ error: 'sessionValue is required' });
  }

  if (sessionValue === SESSION_VALUE) {
    res.json({ valid: true, message: 'Session valid' });
  } else {
    res.status(401).json({ valid: false, message: 'Invalid session' });
  }
});

// DELETE: 인증 코드 삭제 (마스터 코드 필요)
app.delete('/auth/revoke', (req, res) => {
  const { masterCode, code } = req.body;

  if (!masterCode || !code) {
    return res.status(400).json({ error: 'masterCode and code are required' });
  }

  if (masterCode !== MASTER_CODE) {
    return res.status(403).json({ error: 'Invalid master code' });
  }

  const index = authData.codes.findIndex((item) => item.code === code);

  if (index === -1) {
    return res.status(404).json({ error: 'Code not found' });
  }

  authData.codes.splice(index, 1);
  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));

  res.json({ message: 'Code revoked', code });
});

// ============ 데이터 관리 API ============

// POST: 데이터 초기화 (기본값으로 리셋)
app.post('/reset', (req, res) => {
  data = JSON.parse(JSON.stringify(DEFAULT_DATA)); // 깊은 복사
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({
    message: 'Data reset to default',
    data: data,
  });
});

// SSL 인증서 로드 (HTTPS 서버용)
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/chukapi.xyz/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/chukapi.xyz/fullchain.pem'),
};

// HTTPS 서버 실행 (외부 접속 허용)
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS Server running on port ${PORT}`);
});
