
export interface FeedbackResult {
  encouragement: string;
  warning: string;
  trendAnalysis: string;
}

/**
 * AI 분석 기능을 수행하는 메인 함수
 * 1. 우선 서버 API(/api/generate-feedback)를 호출합니다. (AI Studio 환경 대응)
 * 2. 서버가 404를 반환하면(Netlify 등 정적 호스팅), 직접 Gemini REST API를 호출합니다.
 */
export async function generateStudentFeedback(
  studentName: string,
  history: { g1_1: number; g1_2: number },
  current: { g2_1: number },
  subjectDetails: { name: string; grade: number; grade9: number; upGap: number; downGap: number; trend: 'up' | 'down' | 'stable' }[]
): Promise<FeedbackResult> {
  const payload = {
    studentName,
    history,
    current,
    subjectDetails,
  };

  const prompt = `
    학생 이름: ${studentName}
    성적 데이터:
    ${JSON.stringify({ history, current, subjectDetails })}
    
    위 데이터를 바탕으로 학생에게 줄 피드백을 작성해줘.
    상위등급과 점수차가 작은 과목은 '등급 상승 가능성'으로, 하위등급과 점수차가 작은 과목은 '등급 하락 위험'으로 분석해줘.
    당신은 입시 전문가입니다. 답변은 친절하면서도 전문적인 어조로 작성해주세요.
    
    반드시 다음 세 가지 항목을 포함하는 JSON 형식으로 답변하세요:
    {
      "encouragement": "격려 메시지",
      "warning": "경고/보완책 메시지",
      "trendAnalysis": "전체적인 추이 분석"
    }
  `;

  // --- 1단계: 서버 프록시 시도 (AI Studio/Cloud Run 환경) ---
  try {
    console.log("[AI] Attempting Server-side Analysis...");
    const serverResponse = await fetch("/api/generate-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (serverResponse.ok) {
      return await serverResponse.json();
    }

    // 404가 아니면(서버는 있는데 에러 발생), 폴백하지 않고 에러 처리
    if (serverResponse.status !== 404) {
      const errorText = await serverResponse.text();
      throw new Error(`서버 분석 오류 (Status ${serverResponse.status}): ${errorText.substring(0, 50)}`);
    }
    
    console.warn("[AI] Server endpoint 404 (Not Found). Falling back to Direct REST API...");
  } catch (err: any) {
    // 네트워크 연결 자체에 문제가 있거나 404인 경우만 폴백 시도
    if (err.message?.includes("Failed to fetch") || err.message?.includes("404")) {
      console.warn("[AI] Server unavailable, initiating client-side fallback.");
    } else {
      throw err;
    }
  }

  // --- 2단계: 직접 REST API 호출 (Netlify 등 정적 호스팅 환경) ---
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("AI API Key 미설정 (Netlify VITE_GEMINI_API_KEY 확인 필요)");
  }

  try {
    const REST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    
    console.log(`[AI] Calling Direct REST API (v1beta/gemini-3-flash-preview)...`);
    const response = await fetch(REST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[REST Error]", errorData);
      throw new Error(`AI 분석 오류 (Status ${response.status})`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("AI 응답 생성 실패");

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanText = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(cleanText);
    
    return {
      encouragement: parsed.encouragement || "분석 완료",
      warning: parsed.warning || "보완 사항 없음",
      trendAnalysis: parsed.trendAnalysis || "안정적 추세"
    };
  } catch (error: any) {
    console.error("[Fallback Failed]", error);
    throw error;
  }
}
