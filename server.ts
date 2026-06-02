/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit to handle base64 image uploads comfortably
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Utility to parse base64 strings
function parseBase64Image(dataUrl: string) {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2],
    };
  }
  // Fallback if it's already a raw base64 string
  return {
    mimeType: "image/jpeg",
    data: dataUrl,
  };
}

// 2.5 Robust Dynamic retry function to combat 503 Service Unavailable / Gateway Timeout errors
async function callGeminiDynamic(params: any, maxRetries = 3, delayMs = 1500) {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.statusCode || 500;
      const errorMsg = String(error.message || "").toLowerCase();
      console.warn(`[STUDIO-TRIET Gemini Retry] Attempt ${attempt} failed with status ${status}:`, error.message || error);
      
      const isTransient = status === 503 || status === 502 || status === 504 || status === 429 ||
                          errorMsg.includes("503") || errorMsg.includes("502") || errorMsg.includes("504") || errorMsg.includes("429") ||
                          errorMsg.includes("unavailable") || errorMsg.includes("overloaded") || errorMsg.includes("timeout") ||
                          errorMsg.includes("capacity") || errorMsg.includes("exhausted");
                          
      if (attempt < maxRetries && isTransient) {
        const sleepTime = delayMs * Math.pow(2, attempt - 1);
        console.log(`[STUDIO-TRIET Gemini Retry] Waiting ${sleepTime}ms before attempt ${attempt + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

// 1. API: Analyze Character Reference Photos
app.post("/api/analyze-character", async (req, res) => {
  try {
    const { name, outfits } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required character data (name)" });
    }

    // Bypassing heavy multimodal model call to completely prevent 503 timeout errors
    const description = `${name} character face structure, features, hairstyle, and facial expression must perfectly match the original face from the reference photos. Outfit: ${outfits || "Default clothing from the reference photos."}\n(Đảm bảo nhận diện theo khuôn mặt ảnh gốc, là được.)`;

    res.json({ description });
  } catch (error: any) {
    console.error("Error analyzing character:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2. API: Analyze Product Reference Photo
app.post("/api/analyze-product", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing product name" });
    }

    // Bypassing heavy multimodal model call to completely prevent 503 timeout errors
    const description = `Product "${name}". Brand logo, packaging colors, textual details, and shape structure must exactly resemble the original product from the reference photo.\n(Đảm bảo nhận diện theo nhãn mác sản phẩm ảnh gốc, là được.)`;

    res.json({ description });
  } catch (error: any) {
    console.error("Error analyzing product:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 3. API: Generate Screenplay and Prompts
app.post("/api/generate-screenplay", async (req, res) => {
  try {
    const { idea, characters, product, totalDuration, durationGroup, style } = req.body;
    if (!idea || !totalDuration || !durationGroup) {
      return res.status(400).json({ error: "Missing required screenplay parameters" });
    }

    const durationUnit = durationGroup === "8s" ? 8 : (durationGroup === "10s" ? 10 : (durationGroup === "15s" ? 15 : 30));
    const isSingleSceneGroup = durationGroup === "15s" || durationGroup === "30s";
    const numScenes = isSingleSceneGroup ? 1 : Math.ceil(totalDuration / durationUnit);
    const scene_duration = isSingleSceneGroup ? totalDuration : durationUnit;
    // 1s translates to about 2.2 words in Vietnamese.
    const maxWords = isSingleSceneGroup ? Math.ceil(totalDuration * 2.2) : (durationUnit === 8 ? 18 : 25);

    const ai = getGenAI();

    // Map screenplay style choices for highly tailored outputs
    let styleDescription = "PHONG CÁCH MẶC ĐỊNH: Đa dạng, linh hoạt và cân bằng giữa nghệ thuật lẫn thương mại.";
    if (style === "cinematic") {
      styleDescription = "PHONG CÁCH ĐIỆN ẢNH (Cinematic Cinematic Cinematic): Bố cục khung hình hoành tráng phong cách điện ảnh Hollywood, bối cảnh tỉ mỉ sâu sắc, độ tương phản ánh sáng nghệ thuật cao (high contrast chiaroscuro), chuyển động camera mượt mà có nhịp điệu (slow cinematic panning/tracking/push-in), diễn tả nội tâm và cảm xúc nhân vật lắng đọng.";
    } else if (style === "daily") {
      styleDescription = "PHONG CÁCH ĐỜI SỐNG SINH HOẠT (Slice-of-life/Daily/Vlogger): Góc quay chân thực sắc bén giống máy quay cầm tay hoặc máy quay Vlog mộc mạc, ánh sáng ban ngày tự nhiên tràn ngập, động thái mộc mạc chân thật, bối cảnh đời thường gần gũi sống động đầy sinh khí.";
    } else if (style === "commercial") {
      styleDescription = "PHONG CÁCH QUẢNG CÁO THƯƠNG MẠI (Commercial Brand Promo): Bố cục hiện đại, màu sắc rực rỡ tươi sáng bắt mắt, ánh sáng studio căng mịn sang trọng (stylized key light/rim light rõ nét), góc máy chuyển động nhanh sôi động trẻ trung, zoom cận cảnh cực nét chi tiết cấu trúc góc viền nhãn mác sản phẩm và hành trình xúc cảm người mua.";
    }

    // Structure characters descriptions
    let charactersInfo = "Không sử dụng nhân vật ngoại cảnh đặc biệt.";
    if (characters && characters.length > 0) {
      charactersInfo = characters
        .map((char: any) => {
          return `- Nhân vật ${char.name} (Tên bắt đầu bằng @):
  + Mô tả ngoại hình & trang phục: ${char.description}
  + Outfit gốc đã khóa: ${char.outfits || "Mặc định theo ảnh gốc"}`;
        })
        .join("\n\n");
    }

    // Structure product info
    let productInfo = "Không bao gồm sản phẩm thương mại cụ thể.";
    if (product && product.name) {
      productInfo = `- Sản phẩm: "${product.name}"
  + Đặc điểm nhận dạng & chi tiết nhãn: ${product.description}`;
    }

    const promptText = `Bạn là một biên kịch danh tiếng và kỹ sư thiết kế prompt (prompt engineer) video chuyên nghiệp dạn dày kinh nghiệm tại STUDIO-TRIET.
Nhiệm vụ của bạn là chuyển thể Ý tưởng kịch bản (Idea) dưới đây thành một kịch bản video đồng bộ, tối ưu thời lượng và nhất quán về nhân vật lẫn sản phẩm.

Ý TƯỞNG KỊCH BẢN CHỦ ĐẠO:
"${idea}"

YÊU CẦU PHONG CÁCH NGHỆ THUẬT CHỈ ĐỊNH:
${styleDescription}

THÔNG TIN QUY CHUẨN ĐỒNG BỘ:
- Nhóm thời lượng: Phân cảnh ${scene_duration} giây.
- Tổng thời lượng video: ${totalDuration} giây.
- Tổng số phân cảnh cần tạo: ${numScenes} phân cảnh ${isSingleSceneGroup ? `(Tạo duy nhất 1 kịch bản/prompt tổng thể hoàn chỉnh dài đúng ${totalDuration}s, tuyệt đối không chia nhỏ ra nhiều phân cảnh)` : `(Mỗi cảnh dài đúng ${durationUnit}s để tổng đạt ${totalDuration}s)`}.
- Nhân vật tham chiếu cần sử dụng (nếu phù hợp):
${charactersInfo}
- Sản phẩm quảng cáo cần sử dụng (nếu phù hợp):
${productInfo}

YÊU CẦU QUAN TRỌNG VỀ ĐỒNG BỘ VIDEO VÀ AUDIO:
1. Tính Nhất Quán Xuyên Suốt: Cốt truyện kịch bản phải có tính kết nối mạch lạc, phong cách nghệ thuật, bối cảnh ánh sáng và diện mạo nhân vật/sản phẩm phải nhất quán theo phong cách nghệ thuật đã yêu cầu ở trên.
2. Quy tắc thời lượng lời thoại (audioPrompt):
   - Cảnh dài ${scene_duration} giây CHỈ được chứa tối đa ${maxWords} từ tiếng Việt trong lời thoại để phát âm vừa vặn, truyền cảm, tự nhiên và không bị hụt hơi.
   - Bạn PHẢI thiết lập độ dài lời thoại ngắn gọn, súc tích nhất có thể để khớp hoàn hảo trong khu vực thời gian ${scene_duration}s.
3. Cú pháp viết Video Visual Prompt (visualPrompt):
   - Viết hoàn toàn bằng TIẾNG VIỆT chuyên sâu, chi tiết, mô tả rõ góc quay, chuyển động camera, ánh sáng, hành động của nhân vật cùng sản phẩm để người dùng dễ dàng theo dõi và sử dụng.
   - Hãy chèn chính xác từ khóa tên nhân vật dạng "@TênNhânVật" cùng các đặc điểm nhận diện ngoại hình đi kèm đã khóa ở trên để AI tạo cảnh có mặt nhân vật chuẩn xác nhất.
   - Thể hiện sản phẩm chi tiết nếu cảnh đó có xuất hiện sản phẩm.
4. Lời thoại (audioPrompt): Viết bằng TIẾNG VIỆT tự nhiên, súc tích, cực kỳ truyền cảm bám sát kịch bản, khớp với hoạt cảnh diễn ra.
5. Ghi chú phân cảnh (notes): Viết bằng TIẾNG VIỆT về chuyển động, biểu cảm, nhịp điệu diễn xuất hoặc chuyển động của máy quay, âm thanh bối cảnh (SFX, Ambient).`;

    const response = await callGeminiDynamic({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        temperature: 0.35, // Slightly lower temperature for deterministic, hyper-fast, correct generation
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: {
                    type: Type.INTEGER,
                    description: "Thứ tự phân cảnh (bắt đầu từ 1)",
                  },
                  duration: {
                    type: Type.INTEGER,
                    description: `Thời lượng phân cảnh, phải bằng đúng ${scene_duration}`,
                  },
                  visualPrompt: {
                    type: Type.STRING,
                    description: "Detailed video generation prompt in Vietnamese, incorporating character details with @name and product look-and-feel.",
                  },
                  audioPrompt: {
                    type: Type.STRING,
                    description: `Voiceover narration text in Vietnamese. Max ${maxWords} words to fit ${scene_duration} seconds perfectly!`,
                  },
                  notes: {
                    type: Type.STRING,
                    description: "Production and sound direction notes in Vietnamese.",
                  },
                },
                required: ["sceneNumber", "duration", "visualPrompt", "audioPrompt", "notes"],
              },
            },
          },
          required: ["scenes"],
        },
      },
    });

    const textContent = response.text;
    if (!textContent) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(textContent.trim());
    const scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || []);
    res.json({ scenes });
  } catch (error: any) {
    console.error("Error generating screenplay:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 4. API: Regenerate Single Scene with feedback/instruction
app.post("/api/regenerate-scene", async (req, res) => {
  try {
    const { idea, characters, product, durationUnit, currentScenes, targetSceneNumber, feedback } = req.body;
    if (!targetSceneNumber || !feedback || !currentScenes) {
      return res.status(400).json({ error: "Missing required parameters for scene regeneration" });
    }

    const ai = getGenAI();
    const maxWords = durationUnit === 8 ? 18 : (durationUnit === 10 ? 25 : (durationUnit === 15 ? 35 : 70));

    // Characters formatting
    let charactersInfo = "";
    if (characters && characters.length > 0) {
      charactersInfo = characters
        .map((char: any) => `- Nhân vật ${char.name}: ${char.description}`)
        .join("\n");
    }

    // Product formatting
    let productInfo = "";
    if (product && product.name) {
      productInfo = `- Sản phẩm "${product.name}": ${product.description}`;
    }

    // Context format
    const contextPrompt = `Bạn là một biên kịch chuyên nghiệp và kỹ sư thiết kế prompt video tại STUDIO-TRIET.
Chúng ta đang cải tạo và tạo lại DUY NHẤT một Phân Cảnh trong kịch bản tổng thể.

Ý TƯỞNG KỊCH BẢN CHUNG:
"${idea}"

BỐI CẢNH CÁC NHÂN VẬT & SẢN PHẨM:
${charactersInfo}
${productInfo}

MÔ TẢ TOÀN BỘ KỊCH BẢN HIỆN TẠI:
${JSON.stringify(currentScenes, null, 2)}

YÊU CẦU ĐẶC BIỆT TỪ NGƯỜI DÙNG CHO PHÂN CẢNH SỐ ${targetSceneNumber}:
"${feedback}"

HÃY TẠO LẠI PHÂN CẢNH SỐ ${targetSceneNumber} NÀY để đáp ứng mong muốn trên nhưng VẪN PHẢI GIỮ TÍNH MẠCH LẠC, NHẤT QUÁN kết cấu chung của toàn bộ kịch bản.
Đảm bảo lời thoại tiếng Việt (audioPrompt) cực kỳ ngắn gọn, sắc sảo và KHÔNG vượt quá ${maxWords} từ để vừa khít thời lượng ${durationUnit}s.
Visual prompt cho video phải viết bằng tiếng Việt chi tiết cao (khoảng 100 từ).`;

    const response = await callGeminiDynamic({
      model: "gemini-3.5-flash",
      contents: contextPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: {
              type: Type.INTEGER,
            },
            duration: {
              type: Type.INTEGER,
            },
            visualPrompt: {
              type: Type.STRING,
              description: "Detailed video generation prompt in Vietnamese, incorporating character details with @name and product look-and-feel.",
            },
            audioPrompt: {
              type: Type.STRING,
              description: `Voiceover narration text in Vietnamese. Max ${maxWords} words.`,
            },
            notes: {
              type: Type.STRING,
              description: "Staging, ambient sounds and staging notes in Vietnamese.",
            },
          },
          required: ["sceneNumber", "duration", "visualPrompt", "audioPrompt", "notes"],
        },
      },
    });

    const textContent = response.text;
    if (!textContent) {
      throw new Error("Empty response received from Gemini during regeneration.");
    }

    const updatedScene = JSON.parse(textContent.trim());
    res.json({ updatedScene });
  } catch (error: any) {
    console.error("Error regenerating scene:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Vite middleware integration for development / static serving for production
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
    console.log(`[STUDIO-TRIET Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
