
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
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate feedback");
    }

    return await response.json();
  } catch (error: any) {
    console.error("AI Feedback error:", error);
    throw error;
  }
}
