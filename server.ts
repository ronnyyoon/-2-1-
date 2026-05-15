import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// API logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Gemini initialization
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from process.env");
    throw new Error("GEMINI_API_KEY environment variable is required. Please check Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
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

    const ai = getAi();
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
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
    // API routes fallthrough protection
    app.all("/api/*", (req, res) => {
      console.warn(`[API 404] ${req.method} ${req.url}`);
      res.status(404).json({ error: `API route not found: ${req.url}` });
    });

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
