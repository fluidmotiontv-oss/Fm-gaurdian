import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// System instruction for FluidmotionTV-GuardianCoach
const CORE_SYSTEM_INSTRUCTION = `You are FluidmotionTV-GuardianCoach, an elite sports executive coach for surf training and a coastal safety guardian.
Your dual mission is:
1. ELITE SURF EXECUTIVE COACH:
   - Provide technical, biomechanical, wave-reading, and performance coaching for surf athletes.
   - Specifically mentor your family athletes:
     * Nephew Kai (16-year-old grom, advanced shortboard: rail transitions, fins-free snaps, aerial rotation, high-speed cutbacks, critical pocket timing).
     * Nephew Leo (12-year-old junior: wave entry timing, paddle power, pop-up speed, stance balance, bottom-turn setup).
     * Niece Maya (14-year-old style master: classic longboard noseriding, cross-stepping rhythm, trimming speed, graceful rail control).
     * Community Surfers: Lineup etiquette, priority management, drop-in avoidance, board selection.
   - Speak with authoritative, inspiring, elite coaching tone: clear, crisp, actionable, encouraging.

2. COASTAL SAFETY GUARDIAN:
   - Continuously monitor video feeds and audio cues for coastal hazards and swimmer distress.
   - Detect:
     * Swimmer in distress (struggling stroke, irregular head bobbing, vertical treading, fatigue).
     * Dangerous rip currents and drifting trajectories.
     * Impact zone hazards, shorebreak dumping, submerged reef/rocks.
     * Lost boards, severed leashes, collision threats between surfers and swimmers.
     * Marine life / shark silhouettes or dangerous wildlife alerts.
   - When a hazard or distress is detected, IMMEDIATELY call it out with urgent, authoritative clarity:
     Format alerts clearly starting with "[GUARDIAN ALERT: <LEVEL>]" or "[DISTRESS DETECTED]" before instructing immediate safety actions.

You are interacting via bidirectional streaming (audio, video frames, and text). Keep spoken responses concise, punchy, and timed for real-time sports execution and safety.`;

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// REST API routes
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    appName: "FluidmotionTV-GuardianCoach",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-2.5-flash-native-audio",
    timestamp: new Date().toISOString(),
  });
});

// Single frame analysis fallback endpoint (using gemini-2.5-flash-native-audio or gemini-3.8-flash)
app.post("/api/analyze-frame", async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is not configured in Settings > Secrets.",
      });
    }

    const { imageBase64, athleteName, mode, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const queryPrompt =
      prompt ||
      `Analyze this coastal / surf camera frame.
Focus mode: ${mode || "Dual GuardianCoach"}
Active athlete focus: ${athleteName || "Community/Lineup"}
Examine both:
1. Surf Technique & Wave Dynamics: board positioning, trim angle, paddle rhythm, posture, wave height, wave face section.
2. Safety & Coastal Hazards: swimmer distress, rip currents, collision risks, submerged hazards.
Return your executive summary concisely. If distress is observed, flag it prominently.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-native-audio",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64,
                },
              },
              { text: queryPrompt },
            ],
          },
        ],
        config: {
          systemInstruction: CORE_SYSTEM_INSTRUCTION,
        },
      });
    } catch (err) {
      console.warn("Retrying frame analysis with gemini-3.8-flash:", err);
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64,
                },
              },
              { text: queryPrompt },
            ],
          },
        ],
        config: {
          systemInstruction: CORE_SYSTEM_INSTRUCTION,
        },
      });
    }

    res.json({
      analysis: response.text,
      modelUsed: response.modelVersion || "gemini-2.5-flash-native-audio",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Frame analysis error:", error);
    res.status(500).json({ error: error?.message || "Analysis failed" });
  }
});

// Setup WebSocket Server for Live Bidirectional Streaming on /live
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", async (clientWs: WebSocket) => {
  console.log("Client connected to /live WebSocket");

  let liveSession: any = null;
  const preferredModel = "gemini-2.5-flash-native-audio";
  const fallbackModel = "gemini-3.8-live";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: "GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.",
      })
    );
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Function to initialize Gemini Live Session
  async function connectLive(modelToTry: string, voiceName = "Zephyr") {
    try {
      console.log(`Connecting to Gemini Live API with model: ${modelToTry}...`);
      const session = await ai.live.connect({
        model: modelToTry,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: CORE_SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onmessage: (message: any) => {
            // Handle audio output from Gemini
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: "audio",
                    audio: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                  })
                );
              }
              if (part.text) {
                clientWs.send(
                  JSON.stringify({
                    type: "text",
                    text: part.text,
                  })
                );
              }
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turnComplete" }));
            }
          },
          onerror: (err: any) => {
            console.error(`Gemini Live Error (${modelToTry}):`, err);
            clientWs.send(
              JSON.stringify({
                type: "error",
                error: err?.message || String(err),
              })
            );
          },
          onclose: (event: any) => {
            console.log(`Gemini Live Session closed (${modelToTry})`, event);
            clientWs.send(
              JSON.stringify({
                type: "status",
                status: "session_closed",
              })
            );
          },
        },
      });

      console.log(`Successfully connected to Live API using ${modelToTry}`);
      clientWs.send(
        JSON.stringify({
          type: "status",
          status: "connected",
          model: modelToTry,
          voice: voiceName,
        })
      );
      return session;
    } catch (err: any) {
      console.warn(`Connection failed with model ${modelToTry}:`, err?.message);
      if (modelToTry !== fallbackModel) {
        console.log(`Retrying with fallback model ${fallbackModel}...`);
        return connectLive(fallbackModel, voiceName);
      }
      throw err;
    }
  }

  // Attempt initial connection
  try {
    liveSession = await connectLive(preferredModel);
  } catch (err: any) {
    console.error("Failed to connect to Live API:", err);
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: `Failed to initiate Live session: ${err?.message || "Unknown error"}`,
      })
    );
  }

  // Handle incoming messages from the frontend client
  clientWs.on("message", (rawMsg) => {
    try {
      const data = JSON.parse(rawMsg.toString());

      if (data.type === "reconnect") {
        const voice = data.voice || "Zephyr";
        connectLive(preferredModel, voice).then((s) => {
          liveSession = s;
        });
        return;
      }

      if (!liveSession) {
        return;
      }

      // 1. Audio stream chunk (16kHz PCM Base64)
      if (data.type === "audio" && data.audio) {
        liveSession.sendRealtimeInput({
          audio: {
            data: data.audio,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      }

      // 2. Video frame (JPEG / WebP Base64)
      else if (data.type === "video_frame" && data.frame) {
        const cleanBase64 = data.frame.replace(/^data:image\/[a-z]+;base64,/, "");
        liveSession.sendRealtimeInput({
          video: {
            data: cleanBase64,
            mimeType: data.mimeType || "image/jpeg",
          },
        });
      }

      // 3. User Text input / prompt
      else if (data.type === "text" && data.text) {
        liveSession.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text: data.text }],
            },
          ],
          turnComplete: true,
        });
      }

      // 4. Activity start/end signaling
      else if (data.type === "activity_end") {
        liveSession.sendRealtimeInput({
          audioStreamEnd: true,
        });
      }
    } catch (e: any) {
      console.error("Error processing incoming WebSocket message:", e);
    }
  });

  clientWs.on("close", () => {
    console.log("Client disconnected from /live WebSocket");
    if (liveSession && typeof liveSession.close === "function") {
      try {
        liveSession.close();
      } catch (err) {
        // ignore
      }
    }
  });
});

// Setup Vite dev middleware or production static serving
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`FluidmotionTV-GuardianCoach running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
