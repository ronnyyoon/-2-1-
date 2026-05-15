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
const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from process.env");
    throw new Error("GEMINI_API_KEY environment variable is required. Please check Settings > Secrets.");
  }
  return apiKey;
};

// API routes
const registerRoutes = (app: express.Express) => {
  // Diagnostic endpoint
  app.get("/api/diag", (req, res) => {
    res.json({
      status: "ok",
      node_env: process.env.NODE_ENV,
      has_api_key: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      time: new Date().toISOString()
    });
  });

  // AI Feedback route
  app.post(["/api/generate-feedback", "/api/generate-feedback/"], async (req, res) => {
    console.log(`[API] ${req.method} ${req.url} - Request received`);
    try {
      const { studentName, history, current, subjectDetails } = req.body;
      
      if (!studentName || !history || !current || !subjectDetails) {
         return res.status(400).json({ error: "Missing required student data" });
      }

      const apiKey = getApiKey();
      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = `
        학생 이름: ${studentName}
        성적 데이터:
        ${JSON.stringify({ history, current, subjectDetails })}
        
        위 데이터를 바탕으로 학생에게 줄 피드백을 작성해줘.
        상위등급과 점수차가 작은 과목은 '등급 상승 가능성'으로, 하위등급과 점수차가 작은 과목은 '등급 하락 위험'으로 분석해줘.
        
        반드시 다음 세 가지 항목을 포함하는 JSON 형식으로 답변하세요:
        {
          "encouragement": "격려 메시지",
          "warning": "경고/보완책 메시지",
          "trendAnalysis": "전체적인 추이 분석"
        }
      `;

      console.log("[API] Calling Gemini API (gemini-3-flash-preview)...");
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      if (!text) {
        throw new Error("AI produced an empty response");
      }

      // JSON 추출 및 파싱
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(cleanJson);

      res.json({
        encouragement: parsed.encouragement || "분석 완료",
        warning: parsed.warning || "보완 사항 없음",
        trendAnalysis: parsed.trendAnalysis || "안정적 추세"
      });

    } catch (error: any) {
      console.error("[API Error]", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
};

async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  console.log(`[BOOT] NODE_ENV: ${process.env.NODE_ENV}, isProd: ${isProd}`);
  
  // Register API routes BEFORE static/fallback
  registerRoutes(app);

  if (!isProd) {
    console.log("[BOOT] Using Vite middleware (Development)");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("[BOOT] Failed to create Vite server:", e);
    }
  } else {
    console.log("[BOOT] Serving static files (Production)");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // API routes fallthrough catch-all (placed after explicit routes)
    app.all("/api/*", (req, res) => {
      console.warn(`[BOOT] API Route Not Found: ${req.method} ${req.url}`);
      res.status(404).json({ error: `Route ${req.method} ${req.url} not found on this server.` });
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BOOT] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
