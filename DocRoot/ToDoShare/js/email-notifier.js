import { authMailConfig } from './email-notifier-config.js';

function buildAuthEmailMessage(eventType, eventTime) {
  if (eventType === 'logout') {
    return `TodoShare 계정에서 로그아웃이 감지되었습니다.\n시간: ${eventTime}`;
  }
  return `TodoShare 계정에 로그인이 감지되었습니다.\n시간: ${eventTime}`;
}

function isNotifierConfigured() {
  return Boolean(
    authMailConfig.enabled &&
    authMailConfig.serviceId &&
    authMailConfig.templateId &&
    authMailConfig.publicKey
  );
}

export async function sendAuthEventEmail({ eventType, email, nickname }) {
  if (!email || !isNotifierConfigured()) {
    return false;
  }

  const eventLabel = eventType === 'logout' ? '로그아웃' : '로그인';
  const eventTime = new Date().toLocaleString('ko-KR', { hour12: false });

  const payload = {
    service_id: authMailConfig.serviceId,
    template_id: authMailConfig.templateId,
    user_id: authMailConfig.publicKey,
    template_params: {
      to_email: email,
      to_name: nickname || email,
      from_name: authMailConfig.fromName,
      event_type: eventLabel,
      event_time: eventTime,
      subject: `[TodoShare] ${eventLabel} 알림`,
      message: buildAuthEmailMessage(eventType, eventTime)
    }
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`메일 전송 실패: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.warn('인증 메일 전송 오류:', error.message);
    return false;
  }
}
