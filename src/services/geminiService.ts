
export interface FeedbackResult {
  encouragement: string;
  warning: string;
  trendAnalysis: string;
}

/**
 * AI 분석 기능을 수행하는 메인 함수
 * SDK 대신 REST API를 직접 호출하여 환경 변화에 따른 오류를 최소화합니다.
 */
export async function generateStudentFeedback(
  studentName: string,
  history: { g1_1: number; g1_2: number },
  current: { g2_1: number },
  subjectDetails: { name: string; grade: number; grade9: number; upGap: number; downGap: number; trend: 'up' | 'down' | 'stable' }[]
): Promise<FeedbackResult> {
  // 1. API Key 확인 (Vite 환경 변수)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key를 찾을 수 없습니다. Netlify 환경 변수(VITE_GEMINI_API_KEY) 설정 후 다시 배포해 주세요.");
  }

  console.log(`[AI Analysis] Starting analysis for ${studentName}...`);

  // 2. 프롬프트 구성
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

  // 3. Google Gemini REST API 호출 (가장 안정적인 v1 버전 사용)
  // v1beta 대신 v1을 사용하며, 특정 모델 이름(gemini-1.5-flash)을 명시합니다.
  const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Error Response]", errorText);
      
      if (response.status === 404) {
        throw new Error("선택한 AI 모델을 찾을 수 없습니다 (404). Google AI Studio에서 API Key가 유효한지 확인해 주세요.");
      } else if (response.status === 403) {
        throw new Error("API Key 권한 오류 또는 지역 제한입니다 (403).");
      } else if (response.status === 429) {
        throw new Error("AI 요청 할당량이 초과되었습니다 (429). 잠시 후 다시 시도해 주세요.");
      }
      throw new Error(`AI 분석 중 오류 발생 (Status ${response.status})`);
    }

    const data = await response.json();
    
    // 4. 응답 파싱
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("AI가 응답을 생성하지 못했습니다.");
    }

    try {
      // JSON 문자열 내의 불필요한 마크업(```json ...) 제거 후 파싱
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      return {
        encouragement: parsed.encouragement || "분석이 완료되었습니다.",
        warning: parsed.warning || "특별한 주의사항이 없습니다.",
        trendAnalysis: parsed.trendAnalysis || "성적이 안정적으로 유지되고 있습니다."
      };
    } catch (e) {
      console.error("[Parse Error] Raw Text:", text);
      throw new Error("AI 응답을 처리하는 중 형식이 어긋났습니다. 다시 시도해 주세요.");
    }

  } catch (error: any) {
    console.error("[API Call Failed]", error);
    throw error;
  }
}
