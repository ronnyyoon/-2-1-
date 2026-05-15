
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FeedbackResult {
  encouragement: string;
  warning: string;
  trendAnalysis: string;
}

const getAiModel = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI 분석을 위한 API Key가 설정되지 않았습니다. (VITE_GEMINI_API_KEY 확인 필요)");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // Using 1.5-flash for faster responsiveness and high reliability on mobile
  return genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });
};

export async function generateStudentFeedback(
  studentName: string,
  history: { g1_1: number; g1_2: number },
  current: { g2_1: number },
  subjectDetails: { name: string; grade: number; grade9: number; upGap: number; downGap: number; trend: 'up' | 'down' | 'stable' }[]
): Promise<FeedbackResult> {
  try {
    console.log(`[CLIENT] Requesting AI Analysis for: ${studentName}`);
    
    const model = getAiModel();
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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    if (!text) {
      throw new Error("AI 응답이 비어있습니다.");
    }
    
    try {
      // Find JSON block if it exists
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      
      return {
        encouragement: parsedData.encouragement || "분석 완료",
        warning: parsedData.warning || "보완이 필요한 항목이 없습니다.",
        trendAnalysis: parsedData.trendAnalysis || "안정적인 추세를 유지하고 있습니다."
      };
    } catch (e) {
      console.error("JSON parsing failed for AI response:", text);
      throw new Error("AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.");
    }
  } catch (error: any) {
    console.error("AI Client Side Analysis error:", error);
    
    let userMessage = error.message;
    if (error.message?.includes("API_KEY_INVALID")) {
      userMessage = "API Key가 유효하지 않습니다. 설정을 확인해 주세요.";
    } else if (error.message?.includes("quota")) {
      userMessage = "AI 분석 요청량이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    }
    
    throw new Error(userMessage);
  }
}
