
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
  try {
    const apiPath = "/api/generate-feedback";
    console.log(`[FRONTEND] Calling AI Analysis at: ${apiPath}`);
    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentName,
        history,
        current,
        subjectDetails,
      }),
    });

    if (!response.ok) {
      let errorMessage = `AI 분석 서비스 오류 (Status ${response.status})`;
      try {
        const text = await response.text();
        if (text) {
          if (response.status === 404) {
            errorMessage = "API 경로를 찾을 수 없습니다. (404 Error)";
          } else if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
            errorMessage = "서버 설정 오작동 (HTML 응답 수신). 페이지를 완전히 새로고침 해보세요.";
          } else {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              errorMessage = text.substring(0, 150);
            }
          }
        }
      } catch (e) {
        errorMessage = `네트워크 또는 서버 오류: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    console.error("AI Feedback error:", error);
    throw error;
  }
}
