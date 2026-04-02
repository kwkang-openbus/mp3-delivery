require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { initDB, createTextbook } = require('./src/db');

// data/mp3 디렉토리 생성
const mp3Dir = path.join(__dirname, 'data/mp3');
fs.mkdirSync(mp3Dir, { recursive: true });

// 최소한의 유효한 MPEG1 Layer3 침묵 프레임 생성 (약 1초 분량)
function createSilentMP3(titleText) {
  // ID3v2.3 태그 헤더
  const titleBytes = Buffer.from(titleText, 'utf8');
  const titleFrameData = Buffer.concat([
    Buffer.from([0x00]), // 인코딩: ISO-8859-1
    titleBytes
  ]);
  const titleFrameHeader = Buffer.alloc(10);
  titleFrameHeader.write('TIT2', 0);
  titleFrameHeader.writeUInt32BE(titleFrameData.length, 4);
  titleFrameHeader.writeUInt16BE(0, 8);
  const titleFrame = Buffer.concat([titleFrameHeader, titleFrameData]);

  const id3Header = Buffer.alloc(10);
  id3Header.write('ID3', 0);
  id3Header[3] = 3; id3Header[4] = 0; id3Header[5] = 0;
  const tagSize = titleFrame.length;
  id3Header[6] = (tagSize >> 21) & 0x7F;
  id3Header[7] = (tagSize >> 14) & 0x7F;
  id3Header[8] = (tagSize >> 7) & 0x7F;
  id3Header[9] = tagSize & 0x7F;
  const id3Tag = Buffer.concat([id3Header, titleFrame]);

  // MPEG1 Layer3, 128kbps, 44100Hz, Joint Stereo, No Padding
  // Frame header: FF FB 90 00
  // Frame size: floor(144 * 128000 / 44100) = 417 bytes
  const FRAME_HEADER = Buffer.from([0xFF, 0xFB, 0x90, 0x00]);
  const FRAME_SIZE = 417;
  const NUM_FRAMES = 38; // ~1초

  const audioData = Buffer.alloc(NUM_FRAMES * FRAME_SIZE, 0);
  for (let i = 0; i < NUM_FRAMES; i++) {
    FRAME_HEADER.copy(audioData, i * FRAME_SIZE);
  }

  return Buffer.concat([id3Tag, audioData]);
}

const textbooks = [
  // 일본어 5종
  {
    title: 'JLPT N5 완전정복',
    language: 'japanese',
    level: 'N5',
    publisher: '다락원',
    description: 'JLPT N5 합격을 위한 체계적인 문법·어휘·독해 종합서'
  },
  {
    title: 'みんなの日本語 初級I',
    language: 'japanese',
    level: '초급',
    publisher: 'スリーエーネットワーク',
    description: '전 세계 100만 부 이상 판매된 일본어 초급 대표 교재'
  },
  {
    title: 'げんき I 初版',
    language: 'japanese',
    level: '초급',
    publisher: 'ジャパンタイムズ',
    description: '대학 교재로 널리 사용되는 통합 일본어 입문 과정'
  },
  {
    title: '일본어 첫걸음 완성',
    language: 'japanese',
    level: '입문',
    publisher: '동양북스',
    description: '하루 10분 학습으로 일본어 기초를 완성하는 입문 교재'
  },
  {
    title: 'JLPT N3 한권으로 합격',
    language: 'japanese',
    level: 'N3',
    publisher: '시사일본어사',
    description: 'N3 실전 모의고사 5회분 수록, 출제경향 완벽 분석'
  },
  // 중국어 5종
  {
    title: 'HSK 표준 교재 1급',
    language: 'chinese',
    level: 'HSK 1급',
    publisher: '시사중국어사',
    description: '중국 한판에서 공식 인정한 HSK 1급 표준 교재'
  },
  {
    title: 'HSK 표준 교재 2급',
    language: 'chinese',
    level: 'HSK 2급',
    publisher: '시사중국어사',
    description: '중국 한판에서 공식 인정한 HSK 2급 표준 교재'
  },
  {
    title: '汉语口语速成 初级本',
    language: 'chinese',
    level: '초급',
    publisher: '北京大学出版社',
    description: '단기간 중국어 회화 실력 향상을 위한 집중 교재'
  },
  {
    title: '신실용 중국어 1권',
    language: 'chinese',
    level: '초급',
    publisher: '다락원',
    description: '실용 회화 중심의 체계적인 중국어 학습 시리즈 1권'
  },
  {
    title: '중국어 첫걸음 완성',
    language: 'chinese',
    level: '입문',
    publisher: '동양북스',
    description: '병음부터 기초 회화까지, 중국어 입문자를 위한 핵심 교재'
  }
];

async function main() {
  console.log('🌱 시드 데이터 생성 시작...\n');

  initDB();

  for (const book of textbooks) {
    const mp3Buffer = createSilentMP3(book.title);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
    const filepath = path.join(mp3Dir, filename);

    fs.writeFileSync(filepath, mp3Buffer);
    console.log(`🎵 MP3 생성: ${filename} (${(mp3Buffer.length / 1024).toFixed(1)} KB)`);

    createTextbook({
      ...book,
      mp3_filename: filename,
      mp3_size: mp3Buffer.length
    });
    console.log(`📚 교재 등록: [${book.language === 'japanese' ? '일본어' : '중국어'}] ${book.title}\n`);
  }

  console.log(`\n✅ 시드 완료! 총 ${textbooks.length}개 교재 (일본어 5, 중국어 5)`);
  console.log('🚀 서버를 시작하려면: npm start');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 시드 오류:', err);
  process.exit(1);
});
