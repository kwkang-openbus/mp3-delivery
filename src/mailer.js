const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

let resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

async function sendMP3(email, textbook) {
  const mp3Path = path.join(__dirname, '../data/mp3', textbook.mp3_filename);

  if (!fs.existsSync(mp3Path)) {
    throw new Error(`MP3 파일을 찾을 수 없습니다: ${textbook.mp3_filename}`);
  }

  const mp3Buffer = fs.readFileSync(mp3Path);
  const langLabel = textbook.language === 'japanese' ? '일본어' : '중국어';
  const levelLabel = textbook.level ? ` (${textbook.level})` : '';

  const { data, error } = await getResend().emails.send({
    from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    to: [email],
    subject: `📚 교재 MP3 도착: ${textbook.title}`,
    html: `
      <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 8px;">📚</div>
            <h1 style="color: #1e293b; font-size: 22px; margin: 0;">MP3 음원이 도착했습니다!</h1>
          </div>

          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 4px 0; color: #475569;"><strong style="color: #1e293b;">교재명:</strong> ${textbook.title}</p>
            <p style="margin: 4px 0; color: #475569;"><strong style="color: #1e293b;">언어:</strong> ${langLabel}${levelLabel}</p>
            ${textbook.publisher ? `<p style="margin: 4px 0; color: #475569;"><strong style="color: #1e293b;">출판사:</strong> ${textbook.publisher}</p>` : ''}
          </div>

          <p style="color: #64748b; line-height: 1.7;">
            첨부 파일의 MP3 음원을 다운로드하여 학습에 활용하세요.<br>
            즐거운 외국어 학습 되세요! 🎧
          </p>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">
              이 메일은 교재 MP3 자동 배달 서비스에서 발송되었습니다
            </p>
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${textbook.title}.mp3`,
        content: mp3Buffer,
      }
    ]
  });

  if (error) {
    throw new Error(error.message || '이메일 발송에 실패했습니다');
  }

  return data;
}

module.exports = { sendMP3 };
