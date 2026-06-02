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

// 1. API: Analyze Character Reference Photos
app.post("/api/analyze-character", async (req, res) => {
  try {
    const { name, outfits, images } = req.body;
    if (!name || !images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Missing required character data (name, images)" });
    }

    const ai = getGenAI();

    // Convert images to parts
    const imageParts = images.map((img: string) => {
      const parsed = parseBase64Image(img);
      return {
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      };
    });

    const promptText = `Bạn là một chuyên gia phân tích nhân vật cho các công cụ tạo video AI (như Veo, Kling, Runway, Sora).
Hãy phân tích kỹ nghệ thuật tạo hình nhân vật từ (các) bức ảnh tham chiếu được cung cấp.
Hãy đặt tên nhân vật là: ${name}.
Hãy viết một đoạn mô tả chi tiết, rõ ràng, ngắn gọn và nhất quán tuyệt đối về diện mạo vật lý (màu tóc, kiểu tóc, khuôn mặt, ngũ quan, biểu cảm đặc trưng, độ tuổi phỏng đoán, vóc dáng) cùng với mô tả trang phục đặc trưng nếu có khai báo: "${outfits || "Mặc định theo ảnh gốc"}".

Mục tiêu là mô tả này sẽ được nhúng trực tiếp vào các prompt tạo video của mỗi phân cảnh để giữ tính nhất quán 100% diện mạo và trang phục của nhân vật giữa các phân cảnh khác nhau.
Hãy viết đoạn mô tả bằng tiếng Anh chi tiết cao (tối đa khoảng 120 từ) để đưa vào các mô hình video AI và kèm theo tóm tắt ngắn tiếng Việt ở dòng tiếp theo.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [...imageParts, { text: promptText }],
      },
    });

    res.json({ description: response.text || "Cannot analyze character properly." });
  } catch (error: any) {
    console.error("Error analyzing character:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2. API: Analyze Product Reference Photo
app.post("/api/analyze-product", async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name || !image) {
      return res.status(400).json({ error: "Missing product name or image" });
    }

    const ai = getGenAI();
    const parsed = parseBase64Image(image);

    const imagePart = {
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    };

    const promptText = `Bạn là một chuyên gia phân tích sản phẩm thương mại cho các công cụ tạo video quảng cáo AI.
Hãy phân tích sản phẩm trong ảnh tham chiếu được cung cấp.
Tên sản phẩm: "${name}".
Hãy viết một đoạn mô tả chi tiết, chính xác về đặc điểm hình dáng hiển thị, logo, nhãn hiệu thương hiệu, màu sắc chủ đạo, chất liệu bề mặt, chữ hiển thị trên bao bì và các điểm nhấn nhận diện cốt lõi của sản phẩm.

Mục tiêu là đoạn mô tả sản phẩm này sẽ được nhúng trực tiếp vào prompt tạo video quảng cáo để giữ nhận diện sản phẩm chuẩn nhất so với ảnh gốc đưa vào.
Hãy viết bằng đoạn văn tiếng Anh chi tiết cao (tối đa 120 từ) để đưa vào các mô hình video AI và kèm theo một tóm tắt tiếng Việt ở dòng tiếp theo.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [imagePart, { text: promptText }],
      },
    });

    res.json({ description: response.text || "Cannot analyze product properly." });
  } catch (error: any) {
    console.error("Error analyzing product:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 3. API: Generate Screenplay and Prompts
app.post("/api/generate-screenplay", async (req, res) => {
  try {
    const { idea, characters, product, totalDuration, durationGroup } = req.body;
    if (!idea || !totalDuration || !durationGroup) {
      return res.status(400).json({ error: "Missing required screenplay parameters" });
    }

    const durationUnit = durationGroup === "10s" ? 10 : 8;
    const numScenes = Math.ceil(totalDuration / durationUnit);
    // 1s points about 2.2 words in Vietnamese. So 8s matches ~18 words, 10s matches ~22 words.
    const maxWords = durationUnit === 10 ? 25 : 18;

    const ai = getGenAI();

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

    const promptText = `Bạn là một biên kịch và kỹ sư thiết kế prompt (prompt engineer) video chuyên nghiệp dạn dày kinh nghiệm tại STUDIO-TRIET.
Nhiệm vụ của bạn là chuyển thể Ý tưởng kịch bản (Idea) dưới đây thành một kịch bản video từng phân cảnh đồng bộ, tối ưu thời lượng và nhất quán về nhân vật lẫn sản phẩm.

Ý TƯỞNG KỊCH BẢN:
"${idea}"

THÔNG TIN QUY CHUẨN ĐỒNG BỘ:
- Nhóm thời lượng: Phân cảnh ${durationUnit} giây.
- Tổng thời lượng video: ${totalDuration} giây.
- Tổng số phân cảnh cần tạo: ${numScenes} phân cảnh (Mỗi cảnh dài đúng ${durationUnit}s để tổng đạt ${totalDuration}s).
- Nhân vật tham chiếu cần sử dụng (nếu phù hợp):
${charactersInfo}
- Sản phẩm quảng cáo cần sử dụng (nếu phù hợp):
${productInfo}

YÊU CẦU QUAN TRỌNG VỀ ĐỒNG BỘ VIDEO VÀ AUDIO:
1. Tính Nhất Quán Xuyên Suốt: Cốt truyện kịch bản phải có tính kết nối mạch lạc, phong cách nghệ thuật, bối cảnh ánh sáng và diện mạo nhân vật/sản phẩm phải nhất quán từ phân cảnh đầu đến phân cảnh cuối.
2. Quy tắc thời lượng lời thoại (audioPrompt):
   - Cảnh dài ${durationUnit} giây CHỈ được chứa tối đa ${maxWords} từ tiếng Việt trong lời thoại để phát âm vừa vặn, truyền cảm, tự nhiên và không bị hụt hơi.
   - Bạn PHẢI thiết lập độ dài lời thoại ngắn gọn, súc tích nhất có thể để khớp hoàn hảo trong khung thời gian ${durationUnit}s. Nếu ý tưởng lời thoại quá dài vượt khung, bạn BẮT BUỘC phải chuyển bớt ý hoặc câu thoại tiếp theo sang phân cảnh tiếp sau.
3. Cú pháp viết Video Visual Prompt (visualPrompt):
   - Viết hoàn toàn bằng TIẾNG ANH chuyên sâu để các mô hình AI tạo video lớn hiểu chính xác.
   - Phải mô tả chi tiết: Góc quay (e.g. medium shot, extreme close-up), động tác camera (e.g. cinematic slow panning, smooth push-in, tracking shot), ánh sáng (cinematic lighting, warm sunset glow), bối cảnh chính xác và diễn biến hành động.
   - Hãy chèn chính xác từ khóa tên nhân vật dạng "@TênNhânVật" cùng các đặc điểm nhận diện ngoại hình đi kèm đã khóa ở trên để AI tạo cảnh có mặt nhân vật chuẩn xác nhất.
   - Thể hiện sản phẩm chi tiết nếu cảnh đó có xuất hiện sản phẩm.
4. Lời thoại (audioPrompt): Viết bằng TIẾNG VIỆT tự nhiên, súc tích, đắt giá, khớp với hoạt cảnh diễn ra.
5. Ghi chú phân cảnh (notes): Viết bằng TIẾNG VIỆT về chuyển động, nhịp điệu diễn viên, hoặc âm thanh bối cảnh (SFX, Ambient).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
                description: `Thời lượng phân cảnh, phải bằng đúng ${durationUnit}`,
              },
              visualPrompt: {
                type: Type.STRING,
                description: "Detailed video generation prompt in English, incorporating character details with @name and product look-and-feel.",
              },
              audioPrompt: {
                type: Type.STRING,
                description: `Voiceover narration text in Vietnamese. Max ${maxWords} words to fit ${durationUnit} seconds perfectly!`,
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
    });

    const textContent = response.text;
    if (!textContent) {
      throw new Error("Empty response received from Gemini.");
    }

    const scenes = JSON.parse(textContent.trim());
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
    const maxWords = durationUnit === 10 ? 25 : 18;

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
Visual prompt cho video phải viết bằng tiếng Anh chi tiết cao (khoảng 100 từ).`;

    const response = await ai.models.generateContent({
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
              description: "Detailed video generation prompt in English, incorporating character details with @name and product look-and-feel.",
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
