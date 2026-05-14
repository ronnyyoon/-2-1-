
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FeedbackResult {
  encouragement: string;
  warning: string;
  trendAnalysis: string;
}

export async function generateStudentFeedback(
  studentName: string,
  history: { g1_1: number; g1_2: number },
  current: { g2_1: number },
  subjectDetails: { name: string; grade: number; grade9: number; upGap: number; downGap: number; trend: 'up' | 'down' | 'stable' }[]
): Promise<FeedbackResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      encouragement: "API 키가 설정되지 않아 분석을 수행할 수 없습니다.",
      warning: "성적 관리에 유의하여 최선을 다하시기 바랍니다.",
      trendAnalysis: "1학년 대비 현재 성적 추이를 모니터링 중입니다."
    };
  }

  const prompt = `
    학생 이름: ${studentName}
    성적 데이터:
    - 1학년 1학기 평균: ${history.g1_1}등급 (5등급제)
    - 1학년 2학기 평균: ${history.g1_2}등급 (5등급제)
    - 2학년 1학기 예상 평균: ${current.g2_1}등급 (5등급제)
    
    과목별 상세 (2학년 1학기):
    ${subjectDetails.map(s => `- ${s.name}: ${s.grade}등급(5제) / ${s.grade9}등급(9제). (추이: ${s.trend}). 상위등급과 점수차: +${s.upGap}점, 하위등급과 점수차: -${s.downGap}점`).join('\n')}
    
    위 데이터를 바탕으로 학생에게 줄 피드백을 작성해줘.
    특히 '상위등급과 점수차'가 작은 과목은 등급 상승 가능성이 높은 과목으로, '하위등급과 점수차'가 작은 과목은 등급 하락 위험이 있는 과목으로 분석하여 언급해줘.
    
    다음 세 가지 항목을 포함하고, JSON 형식으로 답변해줘:
    1. encouragement: 등급 상승 가능성이 높거나(상위등급과 점수차가 작은 경우) 성적이 우수한 과목에 대한 격려 및 구체적인 조언.
    2. warning: 등급 하락 가능성이 높거나(하위등급과 점수차가 작은 경우) 관리가 필요한 과목에 대한 경고 및 보완책.
    3. trendAnalysis: 1학년 성정과 비교했을 때의 전체적인 성적 추이 분석 및 향후 방향성.
    
    답변은 한국어로 작성해줘.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text);
    return {
      encouragement: result.encouragement || "",
      warning: result.warning || "",
      trendAnalysis: result.trendAnalysis || ""
    };
  } catch (error: any) {
    console.error("AI Feedback error:", error);
    // Rethrow to let the component handle the error (e.g. 429)
    throw error;
  }
}
