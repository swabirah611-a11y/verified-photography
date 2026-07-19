import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Helper to fetch an image and convert it to Base64 on the server
async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; base64: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return { mimeType: contentType, base64 };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Body parser
  app.use(express.json());

  // 1. Core Health API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. Secure Supabase Handshake Proxy
  // Verifies the connection to a Supabase instance without exposing keys on the client
  app.post("/api/supabase/verify", async (req, res) => {
    const { url, key } = req.body;
    
    // Fallback to server-side env vars if client-side parameters are empty
    const finalUrl = url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const finalKey = key || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    if (!finalUrl || !finalKey) {
      return res.status(400).json({
        success: false,
        error: "Missing credentials. Please provide both Supabase URL and Key.",
        code: "MISSING_CREDENTIALS"
      });
    }

    try {
      // Create a temporary client to test the handshake
      const testClient = createClient(finalUrl, finalKey, {
        auth: { persistSession: false }
      });

      // Query a basic count on profiles (or try a dummy query that verifies pg_catalog table)
      const { data, error } = await testClient
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        // If table doesn't exist, it might still mean the connection is valid but schema is not initialized
        if (error.code === "PGRST116" || error.code === "PGRST204" || error.code === "42P01") {
          return res.json({
            success: true,
            partiallyConfigured: true,
            message: "Successfully connected to Supabase, but the 'profiles' table does not exist yet. Please run the SQL schema migrations.",
            code: error.code,
            details: error.message
          });
        }
        
        return res.status(400).json({
          success: false,
          error: `Supabase database error: ${error.message}`,
          code: error.code || "PG_CONN_ERROR",
          details: error.details || ""
        });
      }

      return res.json({
        success: true,
        message: "Supabase connection verified. Handshake completed successfully!",
        details: {
          url: finalUrl,
          hasData: Array.isArray(data),
          recordCount: data ? data.length : 0
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Network handshake failed: ${err.message || err}`,
        code: "NETWORK_EXCEPTION"
      });
    }
  });

  // 2b. AI Visual Intelligence Engine API Route
  app.post("/api/ai/analyze", async (req, res) => {
    const { imageUrl, filename, originalFilename, fileSize } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "Missing image URL for analysis."
      });
    }

    // A. Duplicate detection
    let isDuplicate = false;
    let duplicateFilename = "";
    const sUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (sUrl && sKey) {
      try {
        const testClient = createClient(sUrl, sKey, { auth: { persistSession: false } });
        // Fetch existing records to check for duplicates by original name or matching size
        const { data: duplicates } = await testClient
          .from("media_vault")
          .select("filename, original_filename, url, file_size")
          .neq("url", imageUrl)
          .limit(50);
        
        if (duplicates) {
          const match = duplicates.find(d => 
            d.original_filename === originalFilename || 
            (fileSize && d.file_size && Math.abs((d.file_size || 0) - (fileSize || 0)) < 10)
          );
          if (match) {
            isDuplicate = true;
            duplicateFilename = match.original_filename || match.filename;
          }
        }
      } catch (err) {
        console.warn("[Dup Check Error]", err);
      }
    }

    // B. Verify Gemini API Key configuration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "GEMINI_API_KEY environment variable is missing on the server. Please provide it in Settings > Secrets.",
        code: "MISSING_GEMINI_KEY",
        isDuplicate,
        duplicateFilename
      });
    }

    try {
      // C. Initialize GoogleGenAI SDK with required telemetry User-Agent
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Fetch the image from Supabase storage and encode as Base64
      const { mimeType, base64 } = await fetchImageAsBase64(imageUrl);

      const prompt = `You are a professional computer vision model, senior photography editor, and SEO expert.
Analyze the provided photograph and output a detailed, creative, technical, and commercial report.
You must return ONLY a JSON response matching the following schema. Do not wrap it in markdown code blocks.
Response Schema:
{
  "category": "Wedding", // Must be exactly one of: Wedding, Portrait, Graduation, Event, Commercial, Birthday, Studio, Fashion, Lifestyle, Outdoor, Indoor, Drone, Corporate, Traditional, Product, Documentary, Street, Nature, Sports, Festival
  "confidence": 95, // Integer 0 to 100 representing classification certainty
  "title": "Elegant Wedding Portrait", // Professional visual title suitable for a luxury portfolio
  "description": "Bespoke story-rich caption (maximum 120 words) that captures the soul, scenery, and emotion of this photography",
  "tags": ["Bride", "Wedding", "Smile"], // Array of up to 15 relevant tags
  "location": "Outdoor", // Must be exactly one of: Indoor, Outdoor, Beach, Studio, Garden, Hall, Street, Campus, Church, Hotel, Conference Hall
  "people": "Couple", // Must be exactly one of: Single Person, Couple, Family, Group, Children, Crowd, None. NEVER guess or reveal real identities.
  "colors": {
    "dominant_colors": ["#10261F", "#2EC4B6"], // Array of hex colors extracted
    "accent_colors": ["#D4AF37"], // Array of accents
    "background_colors": ["#071A14"], // Array of backgrounds
    "overall_mood": "Ethereal / Cinematic" // Textual mood description
  },
  "quality": {
    "sharpness": 95, // integer 0-100
    "exposure": 90, // integer 0-100
    "noise": 10, // integer 0-100
    "composition": 94, // integer 0-100
    "lighting": 92, // integer 0-100
    "framing": 90, // integer 0-100
    "depth": 88, // integer 0-100
    "overall_quality": 92, // integer 0-100
    "suggestions": ["Slightly warm up the highlights to match the sunset glow.", "Mute ambient highlights slightly in post-production."] // Array of improvement suggestions
  },
  "seo": {
    "seo_title": "Elegant Wedding Portrait | Verified Photography",
    "meta_description": "Experience luxury wedding storytelling in Nigeria. Meticulously captured sunset editorial portrait by Verified Photography.",
    "alt_text": "An elegant bride and groom sharing a heartfelt moment at their traditional wedding.",
    "caption": "Edo traditional bride and groom smiling at golden hour.",
    "slug": "elegant-wedding-portrait",
    "keywords": ["wedding photography", "edo traditional wedding", "bride portrait", "verified photography"]
  },
  "camera": {
    "camera": "Sony Alpha 7R V", // Estimate model based on detail/style or standard setup
    "lens": "Sony FE 85mm f/1.4 GM", // Estimate lens compression and depth
    "iso": "100",
    "aperture": "f/1.4",
    "focal_length": "85mm",
    "shutter_speed": "1/250s",
    "date_taken": "2026-07-17"
  },
  "smart_collections": ["Best Weddings", "Featured Portraits"], // Suggested collections
  "safety": {
    "issues": [], // Any of: Blur, Low Resolution, Over Exposure, Under Exposure, Corrupted Files, Unsupported Formats
    "rejected": false // Set to true ONLY if image contains highly offensive, dangerous, violent, or explicit content
  },
  "social": {
    "instagram": "Capture the moments that matter. A traditional celebration under the Nigerian sky. #Wedding #Bride #Groom #EdoWeddings #VerifiedPhotography",
    "facebook": "We are honored to document visual heritage. True elegance is captured, not posed. Book your consultation today. #VerifiedPhotography #EdoNuptials",
    "whatsapp": "Preserving the beauty of culture. Elegant wedding portrait capture. Check the full gallery in our bio!",
    "tiktok": "Nuptials with cinematic elegance. Traditional Edo wedding details. 🇳🇬📸 #weddinggoals #nigerianwedding #foryou #photography",
    "hashtags": ["#VerifiedPhotography", "#EdoWeddings", "#TraditionalCelebrations", "#LuxuryPortraits"]
  }
}`;

      const imagePart = {
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      };
      const textPart = { text: prompt };

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty text returned from Gemini Vision API.");
      }

      const parsedAnalysis = JSON.parse(text.trim());

      // If rejected by safety filter
      if (parsedAnalysis.safety?.rejected) {
        return res.status(400).json({
          success: false,
          error: "Upload rejected: Image violates Content Safety policy.",
          code: "SAFETY_REJECTION",
          analysis: parsedAnalysis,
          isDuplicate,
          duplicateFilename
        });
      }

      // D. Save results into Supabase if configured
      if (sUrl && sKey) {
        try {
          const testClient = createClient(sUrl, sKey, { auth: { persistSession: false } });
          const dbRow = {
            image_url: imageUrl,
            filename: filename,
            original_filename: originalFilename || filename,
            confidence: parsedAnalysis.confidence || 0,
            category: parsedAnalysis.category || "General",
            title: parsedAnalysis.title || "Untitled Capture",
            description: parsedAnalysis.description || "",
            tags: parsedAnalysis.tags || [],
            location: parsedAnalysis.location || "Outdoor",
            people: parsedAnalysis.people || "None",
            colors: parsedAnalysis.colors || {},
            quality: parsedAnalysis.quality || {},
            seo: parsedAnalysis.seo || {},
            camera: parsedAnalysis.camera || {},
            social: parsedAnalysis.social || {},
            status: "pending_review"
          };

          const { error: dbErr } = await testClient
            .from("ai_analysis_results")
            .upsert(dbRow, { onConflict: "image_url" });

          if (dbErr) {
            console.warn("[AI DB Sync Note]", dbErr.message);
          }
        } catch (dbEx) {
          console.warn("[AI DB Exception]", dbEx);
        }
      }

      return res.json({
        success: true,
        analysis: parsedAnalysis,
        isDuplicate,
        duplicateFilename
      });

    } catch (err: any) {
      const errMsg = err.message || String(err);
      const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("429");
      const isDenied = errMsg.includes("PERMISSION_DENIED") || errMsg.includes("denied access") || errMsg.includes("403");

      if (isQuota) {
        console.warn("\n======================================================================");
        console.warn("⚠️  GEMINI API QUOTA EXCEEDED (RESOURCE EXHAUSTED)");
        console.warn("Your Gemini API key is working, but has exceeded its daily free-tier limit");
        console.warn("or has 0 token quota. The application is automatically falling back");
        console.warn("to local offline vision and metadata classification.");
        console.warn("======================================================================\n");
      } else if (isDenied) {
        console.warn("\n======================================================================");
        console.warn("⚠️  GEMINI API PERMISSION DENIED (403)");
        console.warn("Your project is currently denied access to this model (e.g., gemini-3.5-flash).");
        console.warn("This usually means you are using a free-tier key that does not support");
        console.warn("advanced pre-release models, or needs to enable the paid model flow.");
        console.warn("The application is automatically falling back to local offline metadata.");
        console.warn("======================================================================\n");
      } else {
        console.error("[AI Vision Service Exception]", err);
      }

      // Return a 200 with success: false and ANALYSIS_EXCEPTION so the client gracefully falls back
      return res.status(200).json({
        success: false,
        error: `AI visual intelligence skipped (offline fallback): ${errMsg}`,
        code: "ANALYSIS_EXCEPTION",
        isDuplicate,
        duplicateFilename
      });
    }
  });

  // 3. Diagnostics Engine Endpoint
  app.get("/api/diagnose/engine", async (req, res) => {
    const report: any = {
      timestamp: new Date().toISOString(),
      supabase: {
        configured: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "NOT_LOADED",
        tableAccessibility: "unknown",
        error: null
      },
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD || process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_API_KEY),
        cloudName: process.env.CLOUDINARY_CLOUD || process.env.CLOUDINARY_CLOUD_NAME || "NOT_LOADED",
        apiKey: process.env.CLOUDINARY_API_KEY ? "LOADED (MASKED)" : "NOT_LOADED",
        hasSecret: !!process.env.CLOUDINARY_API_SECRET
      },
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        apiKey: process.env.GEMINI_API_KEY ? "LOADED (MASKED)" : "NOT_LOADED"
      },
      databaseFallback: "ACTIVE" // LocalStorage is always active as safe fallback
    };

    // Attempt actual Supabase ping if configured
    const sUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (sUrl && sKey) {
      try {
        const testClient = createClient(sUrl, sKey, { auth: { persistSession: false } });
        const { error } = await testClient.from("profiles").select("id").limit(1);
        
        if (error) {
          if (error.code === "42P01") {
            report.supabase.tableAccessibility = "PARTIAL (Tables missing)";
            report.supabase.error = "Profiles table does not exist. Run SQL script to provision tables.";
          } else {
            report.supabase.tableAccessibility = "FAILED";
            report.supabase.error = error.message;
          }
        } else {
          report.supabase.tableAccessibility = "ACCESSIBLE & SYNCED";
        }
      } catch (err: any) {
        report.supabase.tableAccessibility = "CONNECTION_ERROR";
        report.supabase.error = err.message || err;
      }
    } else {
      report.supabase.tableAccessibility = "NOT_CONFIGURED";
      report.supabase.error = "Missing environment variables (SUPABASE_URL / SUPABASE_ANON_KEY)";
    }

    res.json(report);
  });

  // Vite middleware setup
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
    console.log(`[SERVER] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error("[SERVER_START_ERROR]", err);
});
