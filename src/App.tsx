/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  User,
  Plus,
  Trash2,
  Lock,
  Package,
  Clock,
  Copy,
  RotateCw,
  Edit2,
  Save,
  Check,
  Video,
  Mic,
  Volume2,
  Image as ImageIcon,
  FileText,
  Layers,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Upload,
  ArrowRight,
  Maximize2
} from "lucide-react";
import { Character, Product, ScreenplayScene, Screenplay } from "./types";

export default function App() {
  // Characters State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charName, setCharName] = useState("");
  const [charOutfit, setCharOutfit] = useState("");
  const [charImages, setCharImages] = useState<string[]>([]);
  const [isAnalyzingChar, setIsAnalyzingChar] = useState(false);

  // Active Tab for inputs ("characters" | "products")
  const [activeTab, setActiveTab] = useState<"characters" | "products">("characters");

  // Product State
  const [product, setProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodImage, setProdImage] = useState<string>("");
  const [isAnalyzingProd, setIsAnalyzingProd] = useState(false);

  // Screenplay Setup State
  const [idea, setIdea] = useState("");
  const [durationGroup, setDurationGroup] = useState<"10s" | "8s">("10s");
  const [totalDuration, setTotalDuration] = useState<number>(20); // Default to 20s for 10s group
  const [screenplayStyle, setScreenplayStyle] = useState<"cinematic" | "daily" | "commercial">("cinematic");

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Generation & Workspace State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);

  // UI Message States & Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Character reference upload input ref
  const charImageInputRef = useRef<HTMLInputElement>(null);
  const prodImageInputRef = useRef<HTMLInputElement>(null);

  // Feedback fields for individual scene regeneration
  const [sceneFeedbacks, setSceneFeedbacks] = useState<{ [key: number]: string }>({});
  const [regeneratingSceneNum, setRegeneratingSceneNum] = useState<number | null>(null);

  // Quick Samples Helper for instant interactive testing
  const loadSampleData = () => {
    // Character sample
    const sampleChar: Character = {
      id: "sample-char",
      name: "@Alex",
      outfits: "Bông tai bạc, Áo vest nhung đen tuyền lịch lãm, cổ sọc đỏ bordeaux",
      description: "MALE, mid-20s, sharp jawline, high cheekbones, side-parted obsidian black hair, deep mysterious eyes, elegant and charismatic look.",
      images: [
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300"
      ],
      isLocked: true
    };
    
    // Product sample
    const sampleProduct: Product = {
      name: "Triết Homme Perfume",
      description: "A dark luxury rectangular black glass bottle with gold embossed letters of 'TRIET HOMME', sleek golden cap, warm wood texture underneath, amber mist sprayed in high class dark ambiance.",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=300"
    };

    setCharacters([sampleChar]);
    setProduct(sampleProduct);
    setIdea("Một đoạn quảng cáo ngắn giới thiệu dòng nước hoa nam cao cấp Triết Homme. Nhân vật nam @Alex bước đi tự tin trong bối cảnh căn hộ cao cấp buổi hoàng hôn, nhìn thấy lọ nước hoa trên bệ gương cổ kính, anh xịt thử, mỉm cười đầy cuốn hút khi hương thơm lan tỏa.");
    setDurationGroup("10s");
    setTotalDuration(20);
    showNotification("Đã tải dữ liệu mẫu STUDIO-TRIET mẫu nhanh!", "success");
  };

  // Speech Recognition Setup & Handlers
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "vi-VN";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript) {
          setIdea(prev => {
            const trimmed = prev.trim();
            return trimmed ? trimmed + " " + finalTranscript.trim() : finalTranscript.trim();
          });
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          showNotification("Quyền truy cập micro ghi âm bị từ chối.", "error");
        } else if (event.error !== "no-speech") {
          showNotification("Lỗi ghi âm giọng nói: " + event.error, "error");
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      showNotification("Trình duyệt không hỗ trợ chuyển đổi Giọng nói hoặc cần cấp quyền micro.", "error");
      return;
    }
    try {
      recognitionRef.current.start();
      showNotification("Đang mở micro... Vui lòng nói ý tưởng kịch bản bằng tiếng Việt.", "info");
    } catch (err) {
      console.error(err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      showNotification("Đã tạm dừng nhận diện giọng nói.", "info");
    }
  };

  const clearAndRestartListening = () => {
    setIdea("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setTimeout(() => {
        try {
          recognitionRef.current.start();
          showNotification("Đã dọn dẹp và bắt đầu lắng nghe mới...", "info");
        } catch (err) {
          console.error(err);
        }
      }, 300);
    } else {
      showNotification("Đã xóa sạch nội dung kịch bản cũ.", "info");
    }
  };

  // Display custom Toast notification
  const showNotification = (text: string, type: "success" | "error" | "info" = "info") => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  // Handler for duration group switch
  const handleDurationGroupChange = (group: "10s" | "8s") => {
    setDurationGroup(group);
    if (group === "10s") {
      setTotalDuration(20); // Recommended starting for 10s
    } else {
      setTotalDuration(24); // Recommended starting for 8s
    }
  };

  // Helper to compress and resize base64 images, preventing 503 Gateway / 413 Payload Too Large errors
  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as JPEG with 80% quality to compress payload size to under ~100KB per image
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  // Convert files to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "character" | "product") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === "character") {
      const remainingSlots = 3 - charImages.length;
      if (remainingSlots <= 0) {
        showNotification("Bạn chỉ được phép tải lên tối đa 3 ảnh nhân vật làm tham chiếu.", "error");
        return;
      }
      
      const fileList = Array.from(files).slice(0, remainingSlots);
      fileList.forEach((file: any) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          if (typeof reader.result === "string") {
            try {
              const compressed = await compressImage(reader.result);
              setCharImages(prev => [...prev, compressed]);
            } catch (err) {
              setCharImages(prev => [...prev, reader.result as string]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          try {
            const compressed = await compressImage(reader.result);
            setProdImage(compressed);
          } catch (err) {
            setProdImage(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file dialog
  const triggerFileInput = (target: "character" | "product") => {
    if (target === "character") {
      charImageInputRef.current?.click();
    } else {
      prodImageInputRef.current?.click();
    }
  };

  // Remove uploaded image from stage prior to locking
  const removeUploadedImage = (index: number) => {
    setCharImages(prev => prev.filter((_, i) => i !== index));
  };

  // 1. Lock Character & Analyze
  const handleSaveCharacter = async () => {
    if (!charName.trim()) {
      showNotification("Vui lòng đặt tên nhân vật.", "error");
      return;
    }
    // Clean name to starts with @
    let formattedName = charName.trim();
    if (!formattedName.startsWith("@")) {
      formattedName = "@" + formattedName;
    }

    if (charImages.length === 0) {
      showNotification("Cần ít nhất 1 ảnh làm tham chiếu nhân vật trước khi khóa và lưu.", "error");
      return;
    }

    setIsAnalyzingChar(true);
    showNotification("Đang phân tích nhân diện và phong cách áo quần bằng AI...", "info");

    try {
      const response = await fetch("/api/analyze-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName,
          outfits: charOutfit
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gặp lỗi khi phân tích nhân khẩu học nhân vật.");

      const newChar: Character = {
        id: "char-" + Date.now(),
        name: formattedName,
        outfits: charOutfit || "Trang phục mặc định theo ảnh gieo phối",
        description: data.description,
        images: [...charImages],
        isLocked: true
      };

      setCharacters(prev => [...prev, newChar]);
      // Reset character input fields
      setCharName("");
      setCharOutfit("");
      setCharImages([]);
      showNotification(`Nhân vật ${formattedName} đã được chuẩn hóa & khóa đặc trưng vật lý thành công!`, "success");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Không thể phân tích nhân vật. Hãy thử lại.", "error");
    } finally {
      setIsAnalyzingChar(false);
    }
  };

  // 2. Lock Product & Analyze
  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      showNotification("Vui lòng điền tên loại sản phẩm trưng dụng.", "error");
      return;
    }
    if (!prodImage) {
      showNotification("Vui lòng tải lên 1 tấm ảnh sản phẩm cận cảnh.", "error");
      return;
    }

    setIsAnalyzingProd(true);
    showNotification("Đang soi chiếu nhãn hàng, văn tự và bố cục sản phẩm...", "info");

    try {
      const response = await fetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Phân tích sản phẩm gặp sự cố ngoại vi.");

      const newProd: Product = {
        name: prodName,
        description: data.description,
        image: prodImage
      };

      setProduct(newProd);
      setProdName("");
      setProdImage("");
      showNotification(`Sản phẩm "${newProd.name}" đã lưu khóa danh tính thương phẩm!`, "success");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Lỗi lưu sản phẩm.", "error");
    } finally {
      setIsAnalyzingProd(false);
    }
  };

  // 3. Clear existing states
  const handleDeleteCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    showNotification("Đã gỡ nhân vật tham chiếu ra khỏi không gian khóa.", "info");
  };

  const handleDeleteProduct = () => {
    setProduct(null);
    showNotification("Đã gỡ sản phẩm tham chiếu.", "info");
  };

  // 4. Submit Idea to Generate Screenplay script
  const handleGenerateScreenplay = async () => {
    if (!idea.trim()) {
      showNotification("Hãy truyền đạt ý tưởng cốt truyện hoặc ý tưởng kịch bản video.", "error");
      return;
    }

    setIsGenerating(true);
    setGenStep(1);

    // Simulated interactive step progress for high-quality professional UX
    const timer1 = setTimeout(() => setGenStep(2), 2500);
    const timer2 = setTimeout(() => setGenStep(3), 5000);
    const timer3 = setTimeout(() => setGenStep(4), 7500);

    try {
      const response = await fetch("/api/generate-screenplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea,
          characters: characters,
          product: product,
          totalDuration: totalDuration,
          durationGroup: durationGroup,
          style: screenplayStyle
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không viết được kịch bản hoàn chỉnh.");

      const newScreenplay: Screenplay = {
        id: "sc-" + Date.now(),
        idea: idea,
        totalDuration: totalDuration,
        durationGroup: durationGroup,
        scenes: data.scenes,
        createdAt: new Date().toLocaleTimeString("vi-VN")
      };

      // Set empty feedback keys
      const initialFeedbacks: { [key: number]: string } = {};
      data.scenes.forEach((s: any) => {
        initialFeedbacks[s.sceneNumber] = "";
      });
      setSceneFeedbacks(initialFeedbacks);

      // Instantly advance state
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setGenStep(5);
      
      setScreenplay(newScreenplay);
      showNotification("Biên soạn kịch bản đồng bộ STUDIO-TRIET hoàn thành rực rỡ!", "success");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Lỗi xử lý ngôn ngữ sáng tác kịch bản.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // 5. Click to Regenerate Single Scene via Prompt Feedback
  const handleRegenerateScene = async (sceneNum: number) => {
    const feedbackText = sceneFeedbacks[sceneNum];
    if (!feedbackText || !feedbackText.trim()) {
      showNotification("Vui lòng điền nội dung thay đổi phối cảnh bạn mong muốn.", "error");
      return;
    }

    if (!screenplay) return;

    setRegeneratingSceneNum(sceneNum);
    showNotification(`Đang tái khởi tạo phối cảnh và lời thoại cho phân cảnh #${sceneNum}...`, "info");

    try {
      const durationUnit = durationGroup === "10s" ? 10 : 8;
      const response = await fetch("/api/regenerate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: screenplay.idea,
          characters: characters,
          product: product,
          durationUnit: durationUnit,
          currentScenes: screenplay.scenes,
          targetSceneNumber: sceneNum,
          feedback: feedbackText
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gặp sự cố khi thiết kế lại cảnh quay.");

      const updatedScene: ScreenplayScene = data.updatedScene;

      // Update the scene object inside screenplay array
      const updatedScenes = screenplay.scenes.map(s => {
        if (s.sceneNumber === sceneNum) {
          return {
            ...s,
            visualPrompt: updatedScene.visualPrompt,
            audioPrompt: updatedScene.audioPrompt,
            notes: updatedScene.notes
          };
        }
        return s;
      });

      setScreenplay({
        ...screenplay,
        scenes: updatedScenes
      });

      // Clear only this feedback field
      setSceneFeedbacks(prev => ({ ...prev, [sceneNum]: "" }));
      showNotification(`Đã thiết lập lại thành công Phân Cảnh #${sceneNum}!`, "success");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Lỗi tái tạo phân cảnh.", "error");
    } finally {
      setRegeneratingSceneNum(null);
    }
  };

  // Edit fields directly in browser manually
  const updateSceneManually = (sceneNum: number, field: keyof ScreenplayScene, val: any) => {
    if (!screenplay) return;
    const updatedScenes = screenplay.scenes.map(s => {
      if (s.sceneNumber === sceneNum) {
        return { ...s, [field]: val };
      }
      return s;
    });
    setScreenplay({ ...screenplay, scenes: updatedScenes });
  };

  // Helper Word Count Check
  const getWordCount = (text: string) => {
    const raw = text.trim();
    if (!raw) return 0;
    return raw.split(/\s+/).length;
  };

  // Copy Single Scene Visual/Voice Prompt to clipboard
  const copySingleScene = (scene: ScreenplayScene) => {
    const textToCopy = `[PHÂN CẢNH ${scene.sceneNumber} | THỜI LƯỢNG: ${scene.duration} Giây]
- VIDEO GENERATION PROMPT:
${scene.visualPrompt}

- AUDIO / VOICEOVER SCRIPT:
"${scene.audioPrompt}"

- STUDIO DIRECTION NOTES:
${scene.notes}`;

    navigator.clipboard.writeText(textToCopy);
    showNotification(`Đã sao chép kịch bản Phân cảnh #${scene.sceneNumber}!`, "success");
  };

  // 6. Global action to copy the entire unified screenplay
  const copyUnifiedScreenplay = () => {
    if (!screenplay) return;

    let text = `=====================================================
            KỊCH BẢN ĐỒNG BỘ: STUDIO-TRIET
=====================================================
Ý TƯỞNG CHỦ ĐẶO: ${screenplay.idea}
TỔNG THỜI LƯỢNG SẢN XUẤT: ${screenplay.totalDuration} Giây
CHẾ ĐỘ TỐI ƯU HỎA: Cảnh quay ${screenplay.durationGroup === "10s" ? 10 : 8} giây
NGÀY KHỞI TẠO: ${screenplay.createdAt}

`;

    // Add active characters metadata
    if (characters.length > 0) {
      text += `DANH SÁCH NHÂN VẬT THAM CHIẾU:\n`;
      characters.forEach(c => {
        text += `- ${c.name}: ${c.description} (Trang phục: ${c.outfits})\n`;
      });
      text += `\n`;
    }

    // Add active product metadata
    if (product) {
      text += `SẢN PHẨM KHÓA NHẬN DIỆN:\n`;
      text += `- ${product.name}: ${product.description}\n\n`;
    }

    text += `================ PHÂN CẢNH SẢN XUẤT ================\n\n`;

    screenplay.scenes.forEach(s => {
      text += `---------------- PHÂN CẢNH #${s.sceneNumber} (Thời lượng: ${s.duration}s) ----------------\n\n`;
      text += `🎬 [VIDEO PROMPT (ENGLISH)]:\n${s.visualPrompt}\n\n`;
      text += `🎙️ [LỜI THOẠI / AUDIO PROMPT]:\n"${s.audioPrompt}"\n`;
      text += `(Số từ: ${getWordCount(s.audioPrompt)} từ - Cân đối hoàn hảo cho ${s.duration}s)\n\n`;
      text += `💡 [GHI CHÚ HẬU KỲ]:\n${s.notes}\n\n`;
    });

    text += `=====================================================
Hệ thống lưu ý: Hãy nạp trực tiếp phần 'VIDEO PROMPT' vào các AI Video Generator
( Runway Gen-3, Kling, Sora, Luma Dream Machine) và giọng đọc 'AUDIO PROMPT' vào ElevenLabs/Veed.io.
Sản xuất bởi STUDIO-TRIET.
=====================================================`;

    navigator.clipboard.writeText(text);
    showNotification("Đã sao chép Kịch bản & Prompt Thống Nhất của toàn bộ Video!", "success");
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md max-w-lg ${
              alertMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100/40"
                : alertMsg.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100/40"
                : "bg-stone-50 border-stone-200 text-stone-800 shadow-stone-100/40"
            }`}
          >
            {alertMsg.type === "success" && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
            {alertMsg.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {alertMsg.type === "info" && <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />}
            <span className="text-sm font-semibold tracking-wide">{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        
        {/* Navigation / Brand Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-stone-200">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/15">
              <Layers className="w-6 h-6 text-white font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-wider text-stone-900">
                  STUDIO-TRIET
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  AI PROMPT STUDIO
                </span>
              </div>
              <p className="text-xs text-stone-500 tracking-wide mt-0.5 font-medium">
                Thiết Kế Kịch Bản Thống Nhất & Khóa Nhân Diện Nhân Vật/Sản Phẩm Đệ Nhất
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadSampleData}
              className="px-4 py-2 text-xs font-bold bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-sm rounded-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Nạp dữ liệu mẫu nhanh
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[11px] font-mono text-emerald-700 font-bold">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>ACTIVE SYSTEM</span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid (Two Column Layout for Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT AREA: Character & Product Asset lockers (4 cols on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Informative Introduction Box */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-md shadow-stone-100/35 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex gap-3">
                <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Bản sắc nhất quán tuyệt đối là gì?
                  </h3>
                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed font-medium">
                    Khóa nhân diện nhân vật <span className="text-emerald-600 font-black font-mono">@name</span> và kết cấu sản phẩm dựa trên ảnh tham chiếu thật. AI sẽ đóng gói đặc trưng hình ảnh dưới dạng ngôn ngữ kỹ thuật sâu để nhúng đồng bộ vào mọi cảnh kịch bản, giúp bạn tạo video không bị đổi gương mặt, sai quần áo, lệch nhãn mác.
                  </p>
                </div>
              </div>
            </div>

            {/* Assets Locker Section (Characters & Products) */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-md shadow-stone-100/40">
              
              {/* Locker Tab Buttons */}
              <div className="flex p-1.5 rounded-xl bg-stone-50 border border-stone-200/80 mb-6">
                <button
                  onClick={() => setActiveTab("characters")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                    activeTab === "characters"
                      ? "bg-white text-emerald-600 border border-stone-200/80 shadow-md shadow-stone-100/50"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Nhân Vật Tham Chiếu ({characters.length})
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                    activeTab === "products"
                      ? "bg-white text-emerald-600 border border-stone-200/80 shadow-md shadow-stone-100/50"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Sản Phẩm Trưng Bày ({product ? "1" : "0"})
                </button>
              </div>

              {/* TAB CONTENT: CHARACTERS LOCKER */}
              {activeTab === "characters" && (
                <div className="space-y-6">
                  {/* Form to Create & Lock Character */}
                  <div className="space-y-4 bg-stone-50/70 p-4.5 rounded-xl border border-stone-200/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      Khai báo & Khóa Nhân Vật mới
                    </h4>
                    
                    <div>
                      <label className="text-[11px] font-bold text-stone-500 block mb-1.5 uppercase tracking-wide">
                        Tên nhân vật (Hệ thống tự thêm @)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Alex, Helen, John..."
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        className="w-full bg-white px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors placeholder:text-stone-400 font-bold text-stone-800"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-500 block mb-1.5 uppercase tracking-wide">
                        Mô tả phục trang (Outfit) cố định
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Áo len cổ lọ đen, kính gọng vàng..."
                        value={charOutfit}
                        onChange={(e) => setCharOutfit(e.target.value)}
                        className="w-full bg-white px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors placeholder:text-stone-400 font-bold text-stone-800"
                      />
                    </div>

                    {/* Image uploads for Character (1-3 images) */}
                    <div>
                      <label className="text-[11px] font-bold text-stone-500 block mb-1.5 uppercase tracking-wide">
                        Ảnh chân dung làm khuôn mẫu (Tối đa 3 ảnh {charImages.length}/3)
                      </label>
                      
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        ref={charImageInputRef}
                        onChange={(e) => handleFileChange(e, "character")}
                        className="hidden"
                      />

                      {charImages.length < 3 && (
                        <div
                          onClick={() => triggerFileInput("character")}
                          className="border-2 border-dashed border-stone-200 hover:border-emerald-500/40 rounded-lg p-5 text-center cursor-pointer transition-colors bg-white hover:bg-stone-50/50 shadow-sm"
                        >
                          <Upload className="w-5 h-5 text-stone-400 mx-auto mb-2" />
                          <p className="text-xs text-stone-700 font-bold">Bấm để tải ảnh chân dung cận mặt</p>
                          <p className="text-[10px] text-stone-400 mt-1">Hỗ trợ PNG, JPG, JPEG (Mục tiêu 1-3 ảnh)</p>
                        </div>
                      )}

                      {/* Displaying Uploading Thumbnails prior to saving */}
                      {charImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {charImages.map((img, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-md overflow-hidden bg-stone-100 border border-stone-200">
                              <img src={img} alt="Character profile upload" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeUploadedImage(idx)}
                                className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full opacity-100 transition-opacity cursor-pointer shadow"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSaveCharacter}
                      disabled={isAnalyzingChar || !charName || charImages.length === 0}
                      className="w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isAnalyzingChar ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          AI Đang phân tích tạo hình...
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Nhận Diện Chân Dung & Khóa Nhân Vật
                        </>
                      )}
                    </button>
                  </div>

                  {/* List of currently locked characters */}
                  <div className="space-y-3.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                      <span>Nhân vật đang kích hoạt trong hệ thống:</span>
                      <span className="text-emerald-600 font-mono">({characters.length})</span>
                    </h5>

                    {characters.length === 0 ? (
                      <div className="text-center py-8 rounded-xl border border-stone-200 bg-stone-50/30 text-stone-500 shadow-inner">
                        <User className="w-8 h-8 mx-auto opacity-35 mb-2.5 text-stone-400" />
                        <p className="text-xs font-bold text-stone-600">Chưa có nhân vật nào được lưu trong khối khóa.</p>
                        <p className="text-[10px] text-stone-400 mt-1">Sử dụng nút nạp mẫu ở trên để xem nhanh.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {characters.map((char) => (
                          <div
                            key={char.id}
                            className="p-4 rounded-xl bg-[#fafaf9] border border-stone-200 flex items-start gap-4 hover:border-stone-350 transition-colors group shadow-sm"
                          >
                            <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-stone-200 bg-white shadow-sm">
                              <img src={char.images[0]} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute bottom-0 right-0 p-0.5 rounded-tl bg-emerald-600">
                                <Lock className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <h6 className="font-black text-sm text-emerald-600 tracking-wide truncate">
                                  {char.name}
                                </h6>
                                <button
                                  onClick={() => handleDeleteCharacter(char.id)}
                                  className="text-stone-400 hover:text-rose-600 p-1 rounded hover:bg-stone-100 transition-colors cursor-pointer"
                                  title="Gỡ bỏ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-stone-500 font-bold mt-0.5 tracking-wide line-clamp-1">
                                Outfit: {char.outfits}
                              </p>
                              
                              <div className="mt-2 bg-white p-2.5 rounded-lg border border-stone-150 shadow-inner">
                                <p className="text-[10.5px] font-mono leading-relaxed text-stone-600 line-clamp-2">
                                  {char.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PRODUCT LOCKER */}
              {activeTab === "products" && (
                <div className="space-y-6">
                  {/* Create Product Form */}
                  {!product ? (
                    <div className="space-y-4 bg-stone-50/70 p-4.5 rounded-xl border border-stone-200/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        Khai báo & Khóa Sản Phẩm
                      </h4>

                      <div>
                        <label className="text-[11px] font-bold text-stone-500 block mb-1.5 uppercase tracking-wide">
                          Tên thương phẩm / loại sản phẩm
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Triết Homme Parfum, Lon Coca Cola vị mộc..."
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          className="w-full bg-white px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors placeholder:text-stone-400 font-bold text-stone-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-500 block mb-1.5 uppercase tracking-wide">
                          Ảnh chụp sản phẩm (1 ảnh chụp cận rõ các mặt phụ)
                        </label>

                        <input
                          type="file"
                          accept="image/*"
                          ref={prodImageInputRef}
                          onChange={(e) => handleFileChange(e, "product")}
                          className="hidden"
                        />

                        {!prodImage ? (
                          <div
                            onClick={() => triggerFileInput("product")}
                            className="border-2 border-dashed border-stone-200 hover:border-emerald-500/40 rounded-lg p-5 text-center cursor-pointer transition-colors bg-white hover:bg-stone-50/50"
                          >
                            <Upload className="w-5 h-5 text-stone-400 mx-auto mb-2" />
                            <p className="text-xs text-stone-700 font-bold">Bấm để tải ảnh sản phẩm</p>
                            <p className="text-[10px] text-stone-400 mt-1">Ảnh cận cảnh, nhìn rõ chữ viết nhãn hàng</p>
                          </div>
                        ) : (
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shadow-sm">
                            <img src={prodImage} alt="Product preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            <button
                              onClick={() => setProdImage("")}
                              className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full transition-colors shadow"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleSaveProduct}
                        disabled={isAnalyzingProd || !prodName || !prodImage}
                        className="w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {isAnalyzingProd ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Sử dụng AI phân tích sản phẩm...
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Quét Nhận Diện và Lưu Khóa
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Display of currently saved product */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          Sản phẩm hiện tại đã quét chuẩn:
                        </span>
                        <button
                          onClick={handleDeleteProduct}
                          className="text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Gỡ bỏ
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 shadow-sm">
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-white border border-stone-200 mb-3.5 shadow-inner">
                          <img src={product.image} alt={product.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <h4 className="font-extrabold text-sm text-emerald-600 tracking-wide">
                          {product.name}
                        </h4>
                        
                        <div className="mt-3.5 bg-white p-3 rounded-lg border border-stone-150 shadow-inner">
                          <p className="text-[11.5px] leading-relaxed font-mono text-stone-700 font-medium">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT AREA: Screenplay Generator & Prompt Board (7 cols on desktop) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Screenplay Idea Editor Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-6 shadow-md shadow-stone-100/40">
              <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                <h3 className="font-bold text-sm uppercase tracking-wider text-stone-800 flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-emerald-600" />
                  Xây dựng kịch bản & phân phối phân cảnh
                </h3>
                <span className="px-2.5 py-1 rounded bg-stone-50 border border-stone-250 text-[10px] font-bold text-stone-600 tracking-wide shadow-sm">
                  STUDIO-TRIET ENGINE
                </span>
              </div>

              {/* Text Area for Idea input */}
              <div className="space-y-2">
                <label className="text-[11.5px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Ý tưởng lõi của kịch bản phim/quảng cáo</span>
                  <span className="text-[10px] text-stone-400 lowercase font-bold">Ví dụ: viết kịch bản chi tiết & chèn nhân vật dạng @Tên</span>
                </label>
                <textarea
                  placeholder="Hãy gõ ý tưởng kịch bản tại đây... Ví dụ: Quảng cáo kem chống nắng. @Alex đang đi bộ dọc bãi biển vắng dưới nắng hè gay gắt, sản phẩm kem chống nắng nằm nổi bật trên một phiến đá san hô xinh đẹp. Cảnh tiếp theo cô lấy kem thoa lên má và nhảy múa vui tươi dưới nắng vàng lấp lánh..."
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={4}
                  className="w-full bg-stone-50/50 p-4 rounded-xl border border-stone-200 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors leading-relaxed placeholder:text-stone-400 font-medium text-stone-800 shadow-inner"
                />

                {/* Voice-to-Text Action Bar */}
                <div className="flex flex-wrap items-center gap-2 mt-1 px-1">
                  <span className="text-[10.5px] font-bold text-stone-500 mr-auto flex items-center gap-1.5">
                    <Mic className={`w-3.5 h-3.5 ${isListening ? "text-rose-500 animate-pulse" : "text-stone-400"}`} />
                    {isListening ? (
                      <span className="text-rose-600 font-extrabold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping inline-block" />
                        Đang ghi âm giọng nói chuyển văn bản...
                      </span>
                    ) : "Chuyển giọng nói:"}
                  </span>

                  {!isListening ? (
                    <button
                      onClick={startListening}
                      type="button"
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Bắt đầu nói để tự ghi kịch bản"
                    >
                      <Mic className="w-3.5 h-3.5 text-emerald-650" />
                      Nhấp nói (Micro)
                    </button>
                  ) : (
                    <button
                      onClick={stopListening}
                      type="button"
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Tắt micro"
                    >
                      <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                      Dừng
                    </button>
                  )}

                  <button
                    onClick={clearAndRestartListening}
                    type="button"
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-350 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Xóa ý tưởng cũ và nói lại từ đầu"
                  >
                    <RefreshCw className="w-3 h-3 text-stone-600" />
                    Xóa nói lại
                  </button>
                </div>
              </div>

              {/* Professional Style Selection */}
              <div className="space-y-2.5">
                <label className="text-[11.5px] font-bold text-stone-500 uppercase tracking-wider block">
                  Phong cách bối cảnh & nghệ thuật (AI Drama / Cinematic Style)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setScreenplayStyle("cinematic")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                      screenplayStyle === "cinematic"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md font-black"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Điện ảnh
                  </button>
                  <button
                    onClick={() => setScreenplayStyle("daily")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                      screenplayStyle === "daily"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md font-black"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Sinh hoạt
                  </button>
                  <button
                    onClick={() => setScreenplayStyle("commercial")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                      screenplayStyle === "commercial"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md font-black"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Quảng cáo
                  </button>
                </div>
                <p className="text-[10.5px] tracking-wide text-stone-500 font-semibold leading-relaxed">
                  {screenplayStyle === "cinematic" && "🎬 Phong cách Điện ảnh: Bối cảnh kỳ vĩ, tương phản nghệ thuật cao kiểu Hollywood, camera chậm rực sắc độ."}
                  {screenplayStyle === "daily" && "🏡 Phong cách Sinh hoạt: Góc quay dã ngoại cầm tay mộc mạc, ánh sáng ban ngày chân thật, thoại tự nhiên gần gũi."}
                  {screenplayStyle === "commercial" && "🛍️ Phong cách Quảng cáo: Điểm nhấn nhãn mác cấu trúc sản phẩm sành điệu, ánh sáng studio mịn màng, camera bay lướt."}
                </p>
              </div>

              {/* Configuration Panel: Duration intervals & total duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-stone-50 border border-stone-200">
                
                {/* Group 1 & 2 Selector */}
                <div className="space-y-3">
                  <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-widest block">
                    1. Nhóm thời lượng cốt lõi
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDurationGroupChange("10s")}
                      className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                        durationGroup === "10s"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm font-black ring-1 ring-emerald-250"
                          : "bg-white border-stone-200 text-stone-500 hover:text-stone-850"
                      }`}
                    >
                      <span className="text-sm">Nhóm 1</span>
                      <span className="text-[9.5px] font-mono text-stone-400 font-bold mt-0.5">Mỗi phân cảnh 10s</span>
                    </button>

                    <button
                      onClick={() => handleDurationGroupChange("8s")}
                      className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                        durationGroup === "8s"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm font-black ring-1 ring-emerald-250"
                          : "bg-white border-stone-200 text-stone-500 hover:text-stone-850"
                      }`}
                    >
                      <span className="text-sm">Nhóm 2</span>
                      <span className="text-[9.5px] font-mono text-stone-400 font-bold mt-0.5">Mỗi phân cảnh 8s</span>
                    </button>
                  </div>
                </div>

                {/* Duration Picker Pills */}
                <div className="space-y-3">
                  <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-widest block">
                    2. Tổng thời lượng Video
                  </span>
                  
                  <div className="grid grid-cols-4 gap-1.5">
                    {durationGroup === "10s" ? (
                      <>
                        {[10, 20, 30, 40].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTotalDuration(t)}
                            className={`py-2 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border ${
                              totalDuration === t
                                ? "bg-emerald-600 border-emerald-600 text-white font-black"
                                : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700 shadow-sm"
                            }`}
                          >
                            {t}s
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {[8, 24, 32, 40].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTotalDuration(t)}
                            className={`py-2 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border ${
                              totalDuration === t
                                ? "bg-emerald-600 border-emerald-600 text-white font-black"
                                : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700 shadow-sm"
                            }`}
                          >
                            {t}s
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Informative Preview Indicator of the division */}
              <div className="p-3.5 rounded-lg bg-emerald-50/30 border border-emerald-100/85 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-stone-600 font-medium">
                    Sản xuất video tổng độ dài là <strong className="text-emerald-700 font-extrabold">{totalDuration} giây</strong>.
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded bg-white text-xs font-black border border-stone-200 text-emerald-600 shadow-sm">
                    Phân chia thành: {Math.ceil(totalDuration / (durationGroup === "10s" ? 10 : 8))} cảnh ({durationGroup === "10s" ? "10s" : "8s"}/cảnh)
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleGenerateScreenplay}
                disabled={isGenerating || !idea.trim()}
                className="w-full py-4.5 rounded-xl font-black tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/15 disabled:opacity-50 disabled:pointer-events-none text-sm uppercase"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    AI Đang phân bổ đồng bộ kịch bản...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    Bắt đầu Biên Soạn Kịch Bản & Tạo Prompt Cảnh Quay
                  </>
                )}
              </button>
            </div>

            {/* Screenplay generation steps / loader UI */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-white border border-stone-200 flex flex-col items-center justify-center space-y-4 text-center min-h-[220px] shadow-md shadow-stone-100/40"
              >
                <div className="h-10 w-10 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
                </div>
                
                <div className="space-y-1.5 mt-2">
                  <h4 className="font-bold text-sm text-stone-850 font-sans">Hệ thống máy chủ STUDIO-TRIET AI đang biên khảo...</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto font-medium">Gemini đang cấu trúc hóa phân cảnh, điều chỉnh âm thoại vừa khít khung thời lượng.</p>
                </div>

                <div className="w-full max-w-xs space-y-1 bg-stone-50/70 p-3.5 rounded-lg border border-stone-200 text-left font-mono text-[10px] shadow-sm">
                  <div className={`flex items-center gap-2 ${genStep >= 1 ? "text-emerald-700 font-bold" : "text-stone-400 font-semibold"}`}>
                    <span className="shrink-0">{genStep >= 1 ? "✓" : "○"}</span>
                    <span>Thiết lập môi trường làm việc thông suốt</span>
                  </div>
                  <div className={`flex items-center gap-2 ${genStep >= 2 ? "text-emerald-700 font-bold" : "text-stone-400 font-semibold"}`}>
                    <span className="shrink-0">{genStep >= 2 ? "✓" : "○"}</span>
                    <span> Đồng hóa chân dung tham chiếu nhân vật/sản phẩm</span>
                  </div>
                  <div className={`flex items-center gap-2 ${genStep >= 3 ? "text-emerald-700 font-bold" : "text-stone-400 font-semibold"}`}>
                    <span className="shrink-0">{genStep >= 3 ? "✓" : "○"}</span>
                    <span>Phác thảo phân phối kịch bản hình ảnh và tiếng phát thanh</span>
                  </div>
                  <div className={`flex items-center gap-2 ${genStep >= 4 ? "text-emerald-700 font-bold" : "text-stone-400 font-semibold"}`}>
                    <span className="shrink-0">{genStep >= 4 ? "✓" : "○"}</span>
                    <span>Tối ưu từ ngữ lời thoại khớp thời gian ({durationGroup === "10s" ? "~22" : "~18"} từ)</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREENPLAY WORKSPACE OUTPUT */}
            {screenplay && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                
                {/* Outliner Summary Header with copy ALL unified prompt button */}
                <div className="p-5.5 rounded-2xl bg-gradient-to-r from-emerald-50/50 via-white to-white border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm shadow-emerald-100/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-600 text-white text-xs shadow-sm">
                        <Check className="w-3.5 h-3.5 font-black" />
                      </span>
                      <h4 className="font-extrabold text-sm text-stone-850">Kịch bản đã sẵn sàng!</h4>
                    </div>
                    <p className="text-xs text-stone-600 font-medium">
                      Đã biên soạn thành công <strong>{screenplay.scenes.length} phân cảnh đồng bộ</strong> gồm Video Prompt mô hình AI và Voiceover phát âm tối ưu.
                    </p>
                  </div>

                  <button
                    onClick={copyUnifiedScreenplay}
                    className="px-4.5 py-3 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 shrink-0 cursor-pointer w-full sm:w-auto text-center font-sans"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Prompt Thống Nhất (Video + Thoại)
                  </button>
                </div>

                {/* List of scenes */}
                <div className="space-y-6">
                  {screenplay.scenes.map((scene, idx) => {
                    const sceneWordCount = getWordCount(scene.audioPrompt);
                    const isGroup10 = durationGroup === "10s";
                    const maxWordsAllowed = isGroup10 ? 25 : 18;
                    const isOverflow = sceneWordCount > maxWordsAllowed;

                    return (
                      <div
                        key={scene.sceneNumber}
                        className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-stone-300 transition-colors shadow-md shadow-stone-100/40"
                      >
                        
                        {/* Tab header on scene */}
                        <div className="bg-stone-50 px-5 py-3.5 border-b border-stone-200 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-xs font-mono font-black text-emerald-600 shadow-sm">
                              #{scene.sceneNumber}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-white border border-stone-200 text-[10.5px] font-mono font-bold text-stone-600 flex items-center gap-1 shadow-xs">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                {scene.duration} Giây
                              </span>
                              <span className="text-xs text-stone-400 font-semibold">| Cảnh phân phối thời gian</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copySingleScene(scene)}
                              className="px-2.5 py-1.5 rounded bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-850 text-[11px] font-black border border-stone-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                              title="Sao chép kịch bản phân cảnh"
                            >
                              <Copy className="w-3.5 h-3.5 text-emerald-600" />
                              Copy cảnh
                            </button>
                          </div>
                        </div>

                        {/* Interactive Editor Fields for Scene */}
                        <div className="p-5.5 space-y-4">
                          
                          {/* Visual Prompt Section */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-stone-500">
                              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-sky-600" />
                                Video Prompt (Tiếng Anh mô tả phối cảnh)
                              </span>
                              <span className="text-[10px] lowercase text-stone-400 font-black">Dùng cho AI Video Generator</span>
                            </div>
                            <textarea
                              value={scene.visualPrompt}
                              onChange={(e) => updateSceneManually(scene.sceneNumber, "visualPrompt", e.target.value)}
                              className="w-full bg-stone-50 p-3.5 rounded-xl border border-stone-200 focus:border-emerald-500/40 text-[12.5px] font-mono text-stone-800 focus:outline-none transition-colors leading-relaxed shadow-inner"
                              rows={3.5}
                            />
                          </div>

                          {/* Audio Voiceover Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            
                            {/* Voiceover scripts and counters */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-stone-500">
                                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                                  Lời thoại lồng giọng (Tiếng Việt)
                                </span>
                                
                                <span className={`text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isOverflow ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                }`}>
                                  {sceneWordCount} / {maxWordsAllowed} từ
                                </span>
                              </div>
                              <textarea
                                value={scene.audioPrompt}
                                onChange={(e) => updateSceneManually(scene.sceneNumber, "audioPrompt", e.target.value)}
                                className="w-full bg-stone-50 p-3 rounded-xl border border-stone-200 focus:border-emerald-500/40 text-xs text-stone-800 focus:outline-none transition-colors leading-relaxed shadow-inner"
                                rows={2.5}
                              />
                              {isOverflow && (
                                <p className="text-[10.5px] text-rose-600 flex items-center gap-1 font-bold mt-1">
                                  <AlertCircle className="w-3 h-3 shrink-0 text-rose-600" />
                                  Số từ vượt ngưỡng khuyến nghị phát âm cho {scene.duration}s. Hãy thu gọn!
                                </p>
                              )}
                            </div>

                            {/* Staging & Post-production notes */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                                Ghi chú nhịp điệu & Âm thanh SFX
                              </span>
                              <textarea
                                value={scene.notes}
                                onChange={(e) => updateSceneManually(scene.sceneNumber, "notes", e.target.value)}
                                className="w-full bg-stone-50 p-3 rounded-xl border border-stone-200 focus:border-emerald-500/40 text-xs text-stone-650 focus:outline-none transition-colors leading-relaxed shadow-inner"
                                rows={2.5}
                              />
                            </div>

                          </div>

                          {/* REGENERATE FORM AT BOTTOM OF CARD */}
                          <div className="mt-4 pt-4 border-t border-stone-150 transition-all">
                            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col md:flex-row gap-3 items-end">
                              <div className="flex-1 w-full text-left space-y-1">
                                <label className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                                  <RotateCw className="w-3 h-3 text-sky-600" />
                                  Tái tạo / Chỉnh sửa lại phối cảnh (AI Prompt Repair)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ví dụ: Thay bức tường từ đá cuội thành vách kính nhìn ra thành phố ban đêm ấm áp..."
                                  value={sceneFeedbacks[scene.sceneNumber] || ""}
                                  onChange={(e) => setSceneFeedbacks({ ...sceneFeedbacks, [scene.sceneNumber]: e.target.value })}
                                  className="w-full bg-white px-3 py-2 rounded-lg border border-stone-200 focus:border-sky-500/40 text-xs focus:outline-none placeholder:text-stone-400 text-stone-800 font-semibold"
                                />
                              </div>

                              <button
                                onClick={() => handleRegenerateScene(scene.sceneNumber)}
                                disabled={regeneratingSceneNum !== null || !sceneFeedbacks[scene.sceneNumber]?.trim()}
                                className="px-4 py-2.5 rounded-lg text-xs font-black bg-white text-sky-600 hover:bg-stone-50 border border-stone-200 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:pointer-events-none w-full md:w-auto justify-center shadow-xs"
                              >
                                {regeneratingSceneNum === scene.sceneNumber ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    AI Đang viết lại...
                                  </>
                                ) : (
                                  <>
                                    <RotateCw className="w-3.5 h-3.5" />
                                    Cập nhật phối cảnh này bằng AI
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Empty Showcase screen */}
            {!screenplay && !isGenerating && (
              <div className="p-12 text-center rounded-2xl border border-stone-200 bg-white text-stone-400 min-h-[300px] flex flex-col items-center justify-center space-y-4 shadow-md shadow-stone-100/30">
                <div className="h-14 w-14 rounded-full bg-stone-50 flex items-center justify-center border border-stone-200 text-stone-550 shadow-sm">
                  <Video className="w-7 h-7 text-stone-400 animate-pulse" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-black text-stone-700 text-sm">Chưa có kịch bản phân cảnh nào được xuất bản</h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                    Hãy nạp các nhân vật và sản phẩm tham chiếu, viết ý tưởng kịch bản video cốt lõi, chọn chế độ thời lượng (Nhóm 1 hoặc Nhóm 2) rồi bấm bắt đầu dấn thân biên soạn!
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Styled Footer */}
      <footer className="mt-20 py-8 border-t border-stone-200 text-center bg-stone-50/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 text-xs text-stone-500 space-y-2 font-medium">
          <p className="font-mono">STUDIO-TRIET V1.2.0 • BUILT ON GOOGLE GEMINI 3.5 FLASH</p>
          <p>© 2026 STUDIO-TRIET. Đồng bộ kịch bản tuyệt đối phục vụ tạo mẫu sản xuất phim AI chất lượng cao.</p>
        </div>
      </footer>

    </div>
  );
}
