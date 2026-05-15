import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini initialization
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("DEBUG: GEMINI_API_KEY is missing from process.env");
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  console.log("DEBUG: GEMINI_API_KEY is present");
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API routes
app.post("/api/generate-feedback", async (req, res) => {
  try {
    const { studentName, history, current, subjectDetails } = req.body;
    
    const ai = getAi();

    const prompt = `
      학생 이름: ${studentName}
      성적 데이터:
      - 1학년 1학기 평균: ${history.g1_1}등급 (5등급제)
      - 1학년 2학기 평균: ${history.g1_2}등급 (5등급제)
      - 2학년 1학기 예상 평균: ${current.g2_1}등급 (5등급제)
      
      과목별 상세 (2학년 1학기):
      ${subjectDetails.map((s: any) => `- ${s.name}: ${s.grade}등급(5제) / ${s.grade9}등급(9제). (추이: ${s.trend}). 상위등급과 점수차: +${s.upGap}점, 하위등급과 점수차: -${s.downGap}점`).join('\n')}
      
      위 데이터를 바탕으로 학생에게 줄 피드백을 작성해줘.
      특히 '상위등급과 점수차'가 작은 과목은 등급 상승 가능성이 높은 과목으로, '하위등급과 점수차'가 작은 과목은 등급 하락 위험이 있는 과목으로 분석하여 언급해줘.
      
      당신은 입시 전문가입니다. 답변은 친절하면서도 전문적인 어조로 작성해주세요.
      
      반드시 다음 세 가지 항목을 포함하는 JSON 형식으로만 답변하세요:
      {
        "encouragement": "격려 메시지",
        "warning": "경고/보완책 메시지",
        "trendAnalysis": "전체적인 추이 분석"
      }
    `;

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) {
      throw new Error("No text response from AI");
    }
    
    let parsedResult;
    try {
      // Find JSON block if it exists
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(text);
      }
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON. Original text:", text);
      res.status(500).json({ error: "AI produced invalid response architecture" });
      return;
    }

    res.json({
      encouragement: parsedResult.encouragement || "",
      warning: parsedResult.warning || "",
      trendAnalysis: parsedResult.trendAnalysis || ""
    });
  } catch (error: any) {
    console.error("AI Feedback error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
