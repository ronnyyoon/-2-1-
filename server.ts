import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = 3000;

app.use(express.json());

// API logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Gemini initialization
const getAiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from process.env");
    throw new Error("GEMINI_API_KEY environment variable is required. Please check Settings > Secrets.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// Diagnostic endpoint
app.get("/api/diag", (req, res) => {
  res.json({
    status: "ok",
    node_env: process.env.NODE_ENV,
    has_api_key: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString()
  });
});

// AI Feedback route
app.post("/api/generate-feedback", async (req, res) => {
  try {
    const { studentName, history, current, subjectDetails } = req.body;
    
    if (!studentName || !history || !current || !subjectDetails) {
       return res.status(400).json({ error: "Missing required student data" });
    }

    const model = getAiModel();
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
      console.error("Gemini returned empty text");
      throw new Error("AI produced an empty response");
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
      return res.status(500).json({ 
        error: "AI produced invalid response architecture",
        raw: text.substring(0, 100) + "..."
      });
    }

    res.json({
      encouragement: parsedResult.encouragement || "",
      warning: parsedResult.warning || "",
      trendAnalysis: parsedResult.trendAnalysis || ""
    });
  } catch (error: any) {
    console.error("AI Feedback route error:", error);
    // Propagate meaningful error if it's from Gemini
    res.status(500).json({ error: error.message || "Internal server error during AI analysis" });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  console.log(`[INIT] Starting server. NODE_ENV: ${process.env.NODE_ENV}, isProd: ${isProd}`);
  
  if (!isProd) {
    console.log("[INIT] Using Vite middleware (Development)");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("[INIT] Failed to create Vite server:", e);
    }
  } else {
    console.log("[INIT] Serving static files (Production)");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BOOT] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
