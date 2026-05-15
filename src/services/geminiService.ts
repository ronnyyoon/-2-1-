
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
    const response = await fetch("/api/generate-feedback", {
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
      let errorMessage = `AI Analysis failed (Status ${response.status})`;
      try {
        const text = await response.text();
        if (text) {
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
              errorMessage = "서버 설정 오작동 (HTML 응답 수신). 페이지를 매뉴얼로 새로고침 해보세요.";
            } else {
              errorMessage = text.substring(0, 100);
            }
          }
        }
      } catch (e) {
        errorMessage = `Network or server error: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    console.error("AI Feedback error:", error);
    throw error;
  }
}
