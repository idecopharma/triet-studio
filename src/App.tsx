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
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setCharImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setProdImage(reader.result);
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
          outfits: charOutfit,
          images: charImages
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
          name: prodName,
          image: prodImage
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
          durationGroup: durationGroup
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md max-w-lg ${
              alertMsg.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
                : alertMsg.type === "error"
                ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
                : "bg-slate-900/90 border-slate-700/50 text-slate-200"
            }`}
          >
            {alertMsg.type === "success" && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
            {alertMsg.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {alertMsg.type === "info" && <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />}
            <span className="text-sm font-medium tracking-wide">{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        
        {/* Navigation / Brand Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Layers className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  STUDIO-TRIET
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  AI PROMPT STUDIO
                </span>
              </div>
              <p className="text-xs text-slate-400 tracking-wide mt-0.5">
                Thiết Kế Kịch Bản Thống Nhất & Khóa Nhân Diện Nhân Vật/Sản Phẩm Đệ Nhất
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadSampleData}
              className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:border-slate-700 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Nạp dữ liệu mẫu nhanh
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-900 text-[11px] font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>ACTIVE SYSTEM</span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid (Two Column Layout for Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT AREA: Character & Product Asset lockers (4 cols on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Informative Introduction Box */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-900 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex gap-3">
                <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Bản sắc nhất quán tuyệt đối là gì?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Khóa nhân diện nhân vật <span className="text-emerald-400 font-mono">@name</span> và kết cấu sản phẩm dựa trên ảnh tham chiếu thật. AI sẽ đóng gói đặc trưng hình ảnh dưới dạng ngôn ngữ kỹ thuật sâu để nhúng đồng bộ vào mọi cảnh kịch bản, giúp bạn tạo video không bị đổi gương mặt, sai quần áo, lệch nhãn mác.
                  </p>
                </div>
              </div>
            </div>

            {/* Assets Locker Section (Characters & Products) */}
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-900">
              
              {/* Locker Tab Buttons */}
              <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-900 mb-6">
                <button
                  onClick={() => setActiveTab("characters")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                    activeTab === "characters"
                      ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Nhân Vật Tham Chiếu ({characters.length})
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                    activeTab === "products"
                      ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Sản Phẩm Trưng Bày ({product ? "1" : "0"})
                </button>
              </div>

              {/* TAB CONTENT: CHARACTERS LOCKER */}
              {activeTab === "characters" && (
                <div className="space-y-6">
                  {/* Form to Create & Lock Character */}
                  <div className="space-y-4 bg-slate-950/70 p-4.5 rounded-xl border border-slate-900/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5 text-emerald-500" />
                      Khai báo & Khóa Nhân Vật mới
                    </h4>
                    
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wide">
                        Tên nhân vật (Hệ thống tự thêm @)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Alex, Helen, John..."
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        className="w-full bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-850 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors placeholder:text-slate-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wide">
                        Mô tả phục trang (Outfit) cố định
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Áo len cổ lọ đen, kính gọng vàng..."
                        value={charOutfit}
                        onChange={(e) => setCharOutfit(e.target.value)}
                        className="w-full bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-850 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors placeholder:text-slate-600 font-medium"
                      />
                    </div>

                    {/* Image uploads for Character (1-3 images) */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wide">
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
                          className="border-2 border-dashed border-slate-850 hover:border-emerald-500/40 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-900/20 hover:bg-slate-900/40"
                        >
                          <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-medium">Bấm để tải ảnh chân dung cận mặt</p>
                          <p className="text-[10px] text-slate-500 mt-1">Hỗ trợ PNG, JPG, JPEG (Mục tiêu 1-3 ảnh)</p>
                        </div>
                      )}

                      {/* Displaying Uploading Thumbnails prior to saving */}
                      {charImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {charImages.map((img, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-md overflow-hidden bg-slate-900 border border-slate-800">
                              <img src={img} alt="Character profile upload" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeUploadedImage(idx)}
                                className="absolute top-1 right-1 bg-red-900/80 hover:bg-red-950 text-white p-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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
                      className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:pointer-events-none"
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
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Nhân vật đang kích hoạt trong hệ thống:</span>
                      <span className="text-emerald-400 font-mono">({characters.length})</span>
                    </h5>

                    {characters.length === 0 ? (
                      <div className="text-center py-8 rounded-xl border border-slate-900 bg-slate-950/20 text-slate-500">
                        <User className="w-8 h-8 mx-auto opacity-30 mb-2.5" />
                        <p className="text-xs">Chưa có nhân vật nào được lưu trong khối khóa.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Sử dụng nút nạp mẫu ở trên để xem nhanh.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {characters.map((char) => (
                          <div
                            key={char.id}
                            className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex items-start gap-4 hover:border-slate-800 transition-colors group"
                          >
                            <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                              <img src={char.images[0]} alt={char.name} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 right-0 bg-emerald-555 p-0.5 rounded-tl bg-emerald-500">
                                <Lock className="w-2.5 h-2.5 text-slate-950" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <h6 className="font-extrabold text-sm text-emerald-400 tracking-wide truncate">
                                  {char.name}
                                </h6>
                                <button
                                  onClick={() => handleDeleteCharacter(char.id)}
                                  className="text-slate-650 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer group-hover:opacity-100 sm:opacity-0 transition-opacity"
                                  title="Gỡ bỏ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-400 font-semibold mt-0.5 tracking-wide line-clamp-1">
                                Outfit: {char.outfits}
                              </p>
                              
                              <div className="mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-900">
                                <p className="text-[10.5px] font-mono leading-relaxed text-slate-400 line-clamp-2">
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
                    <div className="space-y-4 bg-slate-950/70 p-4.5 rounded-xl border border-slate-900/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-500" />
                        Khai báo & Khóa Sản Phẩm
                      </h4>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wide">
                          Tên thương phẩm / loại sản phẩm
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Triết Homme Parfum, Lon Coca Cola vị mộc..."
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-850 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors placeholder:text-slate-600 font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wide">
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
                            className="border-2 border-dashed border-slate-850 hover:border-emerald-500/40 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-900/20 hover:bg-slate-900/40"
                          >
                            <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">Bấm để tải ảnh sản phẩm</p>
                            <p className="text-[10px] text-slate-500 mt-1">Ảnh cận cảnh, nhìn rõ chữ viết nhãn hàng</p>
                          </div>
                        ) : (
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                            <img src={prodImage} alt="Product preview" className="w-full h-full object-contain" />
                            <button
                              onClick={() => setProdImage("")}
                              className="absolute top-2 right-2 bg-slate-950/80 hover:bg-slate-950 text-white p-1.5 rounded-full transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleSaveProduct}
                        disabled={isAnalyzingProd || !prodName || !prodImage}
                        className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:pointer-events-none"
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
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Sản phẩm hiện tại đã quét chuẩn:
                        </span>
                        <button
                          onClick={handleDeleteProduct}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Gỡ bỏ
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-800 mb-3.5">
                          <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                        </div>
                        <h4 className="font-extrabold text-sm text-emerald-400 tracking-wide">
                          {product.name}
                        </h4>
                        
                        <div className="mt-3.5 bg-slate-900 p-3 rounded-lg border border-slate-900">
                          <p className="text-[11.5px] leading-relaxed font-mono text-slate-300">
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
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-900 space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-emerald-500" />
                  Xây dựng kịch bản & phân phối phân cảnh
                </h3>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-400 tracking-wide">
                  STUDIO-TRIET ENGINE
                </span>
              </div>

              {/* Text Area for Idea input */}
              <div className="space-y-2">
                <label className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Ý tưởng lõi của kịch bản phim/quảng cáo</span>
                  <span className="text-[10px] text-slate-500 lowercase font-mono">Ví dụ: viết về bối cảnh, hành động nhân vật chi tiết</span>
                </label>
                <textarea
                  placeholder="Hãy gõ ý tưởng kịch bản tại đây... Ví dụ: Quảng cáo kem chống nắng. @Alex đang đi bộ dọc bãi biển vắng dưới nắng hè gay gắt, sản phẩm kem chống nắng nằm nổi bật trên một phiến đá san hô xinh đẹp. Cảnh tiếp theo cô lấy kem thoa lên má và nhảy múa vui tươi dưới nắng vàng lấp lánh..."
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 p-4 rounded-xl border border-slate-850 focus:border-emerald-500/50 text-sm focus:outline-none transition-colors leading-relaxed placeholder:text-slate-650"
                />
              </div>

              {/* Configuration Panel: Duration intervals & total duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-950 border border-slate-900">
                
                {/* Group 1 & 2 Selector */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    1. Nhóm thời lượng cốt lõi
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDurationGroupChange("10s")}
                      className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                        durationGroup === "10s"
                          ? "bg-slate-900 border-emerald-500 Text text-emerald-400"
                          : "bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      <span className="text-sm">Nhóm 1</span>
                      <span className="text-[9.5px] font-mono text-slate-500 mt-0.5">Mỗi phân cảnh 10s</span>
                    </button>

                    <button
                      onClick={() => handleDurationGroupChange("8s")}
                      className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                        durationGroup === "8s"
                          ? "bg-slate-900 border-emerald-500 Text text-emerald-400"
                          : "bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      <span className="text-sm">Nhóm 2</span>
                      <span className="text-[9.5px] font-mono text-slate-500 mt-0.5">Mỗi phân cảnh 8s</span>
                    </button>
                  </div>
                </div>

                {/* Duration Picker Pills */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
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
                                ? "bg-emerald-600 border-emerald-600 text-slate-950"
                                : "bg-slate-900 hover:bg-slate-850 border-slate-900 text-slate-300"
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
                                ? "bg-emerald-600 border-emerald-600 text-slate-950"
                                : "bg-slate-900 hover:bg-slate-850 border-slate-900 text-slate-300"
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
              <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300">
                    Sản xuất video tổng độ dài là <strong className="text-emerald-400">{totalDuration} giây</strong>.
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded bg-slate-950 text-xs font-bold border border-slate-850 text-emerald-400">
                    Phân chia thành: {Math.ceil(totalDuration / (durationGroup === "10s" ? 10 : 8))} cảnh ({durationGroup === "10s" ? "10s" : "8s"}/cảnh)
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleGenerateScreenplay}
                disabled={isGenerating || !idea.trim()}
                className="w-full py-4.5 rounded-xl font-bold tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-sky-500 hover:from-emerald-500 hover:to-sky-400 text-slate-950 shadow-lg shadow-emerald-500/15 disabled:opacity-50 disabled:pointer-events-none text-sm uppercase"
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
                className="p-6 rounded-2xl bg-slate-900 border border-slate-900 flex flex-col items-center justify-center space-y-4 text-center min-h-[220px]"
              >
                <div className="h-10 w-10 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                </div>
                
                <div className="space-y-1.5 mt-2">
                  <h4 className="font-bold text-sm text-slate-200">Hệ thống máy chủ STUDIO-TRIET AI đang biên khảo...</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Gemini 3.5 đang cấu trúc hóa phân cảnh, điều chỉnh âm thoại vừa khít khung thời lượng.</p>
                </div>

                <div className="w-full max-w-xs space-y-1 bg-slate-950 p-3.5 rounded-lg border border-slate-850 text-left font-mono text-[10px]">
                  <div className={`flex items-center gap-2 ${genStep >= 1 ? "text-emerald-400" : "text-slate-600"}`}>
                    <span className="shrink-0">{genStep >= 1 ? "✓" : "○"}</span>
                    <span>Thiết lập môi trường làm việc thông suốt</span>
                  </div>
                  <div className={`flex items-center gap-2 ${genStep >= 2 ? "text-emerald-400" : "text-slate-600"}`}>
                    <span className="shrink-0">{genStep >= 2 ? "✓" : "○"}</span>
                    <span> Đồng hóa chân dung tham chiếu nhân vật/sản phẩm</span>
                  </div>
                  <div className={`flex items-center gap-2 ${genStep >= 3 ? "text-emerald-400" : "text-slate-600"}`}>
                    <span className="shrink-0">{genStep >= 3 ? "✓" : "○"}</span>
                    <span>Phác thảo phân phối kịch bản hình ảnh và tiếng phát thanh</span>
                  </div>
                  <div className={`flex items-center gap-2 ${genStep >= 4 ? "text-emerald-400" : "text-slate-600"}`}>
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
                <div className="p-5.5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-500 text-slate-950 text-xs">
                        <Check className="w-3.5 h-3.5 font-black" />
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-200">Kịch bản đã sẵn sàng!</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Đã biên soạn thành công <strong>{screenplay.scenes.length} phân cảnh đồng bộ</strong> gồm Video Prompt mô hình AI và Voiceover phát âm tối ưu.
                    </p>
                  </div>

                  <button
                    onClick={copyUnifiedScreenplay}
                    className="px-4.5 py-3 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 shrink-0 cursor-pointer w-full sm:w-auto justify-center"
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
                        className="bg-slate-900/80 rounded-2xl border border-slate-900 overflow-hidden hover:border-slate-800 transition-colors"
                      >
                        
                        {/* Tab header on scene */}
                        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-900 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-emerald-400 shadow">
                              #{scene.sceneNumber}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10.5px] font-mono text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                {scene.duration} Giây
                              </span>
                              <span className="text-xs text-slate-500 font-medium">| Cảnh phân phối thời gian</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copySingleScene(scene)}
                              className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-[11px] font-bold border border-slate-850 flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Sao chép kịch bản phân cảnh"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy cảnh
                            </button>
                          </div>
                        </div>

                        {/* Interactive Editor Fields for Scene */}
                        <div className="p-5.5 space-y-4">
                          
                          {/* Visual Prompt Section */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-sky-400" />
                                Video Prompt (Tiếng Anh mô tả phối cảnh)
                              </span>
                              <span className="text-[10px] lowercase text-slate-500 font-mono">Dùng cho AI Video Generator</span>
                            </div>
                            <textarea
                              value={scene.visualPrompt}
                              onChange={(e) => updateSceneManually(scene.sceneNumber, "visualPrompt", e.target.value)}
                              className="w-full bg-slate-950 p-3.5 rounded-xl border border-slate-850 focus:border-emerald-500/40 text-[12.5px] font-mono text-slate-300 focus:outline-none transition-colors leading-relaxed"
                              rows={3.5}
                            />
                          </div>

                          {/* Audio Voiceover Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            
                            {/* Voiceover scripts and counters */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                                  Lời thoại lồng giọng (Tiếng Việt)
                                </span>
                                
                                <span className={`text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isOverflow ? "bg-rose-500/10 text-rose-400 border border-rose-500/25" : "bg-emerald-500/10 text-emerald-400"
                                }`}>
                                  {sceneWordCount} / {maxWordsAllowed} từ
                                </span>
                              </div>
                              <textarea
                                value={scene.audioPrompt}
                                onChange={(e) => updateSceneManually(scene.sceneNumber, "audioPrompt", e.target.value)}
                                className="w-full bg-slate-950 p-3 rounded-xl border border-slate-850 focus:border-emerald-500/40 text-xs text-slate-300 focus:outline-none transition-colors leading-relaxed"
                                rows={2.5}
                              />
                              {isOverflow && (
                                <p className="text-[10.5px] text-rose-400 flex items-center gap-1 font-medium mt-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  Số từ vượt ngưỡng khuyến nghị phát âm cho {scene.duration}s. Hãy thu gọn!
                                </p>
                              )}
                            </div>

                            {/* Staging & Post-production notes */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                                Ghi chú nhịp điệu & Âm thanh SFX
                              </span>
                              <textarea
                                value={scene.notes}
                                onChange={(e) => updateSceneManually(scene.sceneNumber, "notes", e.target.value)}
                                className="w-full bg-slate-950 p-3 rounded-xl border border-slate-850 focus:border-emerald-500/40 text-xs text-slate-400 focus:outline-none transition-colors leading-relaxed"
                                rows={2.5}
                              />
                            </div>

                          </div>

                          {/* REGENERATE FORM AT BOTTOM OF CARD */}
                          <div className="mt-4 pt-4 border-t border-slate-850/60 transition-all">
                            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900/60 flex flex-col md:flex-row gap-3 items-end">
                              <div className="flex-1 w-full text-left space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                  <RotateCw className="w-3 h-3 text-sky-400" />
                                  Tái tạo / Chỉnh sửa lại phối cảnh (AI Prompt Repair)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ví dụ: Thay bức tường từ đá cuội thành vách kính nhìn ra thành phố ban đêm ấm áp..."
                                  value={sceneFeedbacks[scene.sceneNumber] || ""}
                                  onChange={(e) => setSceneFeedbacks({ ...sceneFeedbacks, [scene.sceneNumber]: e.target.value })}
                                  className="w-full bg-slate-900 px-3 py-2 rounded-lg border border-slate-850 focus:border-sky-500/40 text-xs focus:outline-none placeholder:text-slate-600 text-slate-300"
                                />
                              </div>

                              <button
                                onClick={() => handleRegenerateScene(scene.sceneNumber)}
                                disabled={regeneratingSceneNum !== null || !sceneFeedbacks[scene.sceneNumber]?.trim()}
                                className="px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-900 text-sky-400 hover:bg-slate-850 border border-slate-800 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:pointer-events-none w-full md:w-auto justify-center"
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
              <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-900 bg-slate-950/20 text-slate-650 min-h-[300px] flex flex-col items-center justify-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400">
                  <Video className="w-7 h-7 opacity-40 animate-pulse" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-bold text-slate-400 text-sm">Chưa có kịch bản phân cảnh nào được xuất bản</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hãy nạp các nhân vật và sản phẩm tham chiếu, viết ý tưởng kịch bản video cốt lõi, chọn chế độ thời lượng (Group 1 hoặc Group 2) rồi bấm bắt đầu dấn thân biên soạn!
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Styled Footer */}
      <footer className="mt-20 py-8 border-t border-slate-900 text-center bg-slate-950/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-500 space-y-2">
          <p className="font-mono">STUDIO-TRIET V1.2.0 • BUILT ON GOOGLE GEMINI 3.5 FLASH</p>
          <p>© 2026 STUDIO-TRIET. Đồng bộ kịch bản tuyệt đối phục vụ tạo mẫu sản xuất phim AI chất lượng cao.</p>
        </div>
      </footer>

    </div>
  );
}
