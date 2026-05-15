
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FeedbackResult {
  encouragement: string;
  warning: string;
  trendAnalysis: string;
}

const getAiModel = (modelName: string = "gemini-1.5-flash") => {
  // Try multiple ways to get the API Key
  const apiKey = 
    import.meta.env.VITE_GEMINI_API_KEY || 
    (window as any).VITE_GEMINI_API_KEY || 
    (window as any).GEMINI_API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey === "null") {
    console.error("[GEMINI] API Key not found in environment variables.");
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log(`[GEMINI] Initializing with model: ${modelName}`);
    return genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
  } catch (err) {
    console.error("[GEMINI] Initialization failed:", err);
    throw new Error("GEMINI_INIT_FAILED");
  }
};

export async function generateStudentFeedback(
  studentName: string,
  history: { g1_1: number; g1_2: number },
  current: { g2_1: number },
  subjectDetails: { name: string; grade: number; grade9: number; upGap: number; downGap: number; trend: 'up' | 'down' | 'stable' }[]
): Promise<FeedbackResult> {
  const generateWithModel = async (modelName: string): Promise<FeedbackResult> => {
    const model = getAiModel(modelName);
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
    
    // Find JSON block if it exists
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    
    return {
      encouragement: parsedData.encouragement || "분석 완료",
      warning: parsedData.warning || "보완이 필요한 항목이 없습니다.",
      trendAnalysis: parsedData.trendAnalysis || "안정적인 추세를 유지하고 있습니다."
    };
  };

  try {
    console.log(`[CLIENT] Requesting AI Analysis for: ${studentName}`);
    // Use gemini-1.5-flash as the primary model - highly available and fast
    return await generateWithModel("gemini-1.5-flash");
  } catch (error: any) {
    console.error("AI Client Side Analysis error:", error);
    
    let userMessage = error.message;
    if (error.message === "GEMINI_API_KEY_MISSING") {
      userMessage = "설정된 AI API Key를 찾을 수 없습니다. (VITE_GEMINI_API_KEY 환경변수 미감지)";
    } else if (error.message === "GEMINI_INIT_FAILED") {
      userMessage = "AI 서비스 초기화에 실패했습니다. API Key 형식을 확인해 주세요.";
    } else if (error.message?.includes("API_KEY_INVALID")) {
      userMessage = "입력된 API Key가 유효하지 않습니다. (Invalid API Key)";
    } else if (error.message?.includes("quota") || error.message?.includes("429")) {
      userMessage = "AI 분석 요청 가능량을 초과했습니다. 잠시 후 재시도해 주세요.";
    } else if (error.message?.includes("404")) {
      userMessage = "선택한 AI 모델을 사용할 수 없는 지역이거나 모델명이 변경되었습니다. (404 Error)";
    }
    
    throw new Error(userMessage);
  }
}
