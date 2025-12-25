import React, { useState, useCallback, useEffect } from 'react';
import { 
  Wand2, Layers, Download, RotateCcw, CheckCircle2, AlertCircle, Loader2, Trash2, 
  Settings2, Image as ImageIcon, Archive, ShieldCheck, Sun, Grid, Box, RefreshCw,
  Sparkles, Palette, Camera
} from 'lucide-react';
import { clsx } from 'clsx';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Dropzone } from './components/Dropzone';
import { ComparisonSlider } from './components/ComparisonSlider';
import { editImageBackground, getStylistSuggestions } from './services/geminiService';
import { BACKGROUND_PRESETS, PLATFORM_PRESETS, ASPECT_RATIOS, VIEW_ANGLES } from './constants';
import { UploadedImage, AppState, BackgroundPreset, ShadowConfig, PlatformPreset, BatchConfig, ViewAngle, StylistSuggestion } from './types';

function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // Advanced Features State
  const [selectedPlatform, setSelectedPlatform] = useState<string>('amazon');
  const [consistencySeed, setConsistencySeed] = useState<number>(Math.floor(Math.random() * 10000));
  const [shadowConfig, setShadowConfig] = useState<ShadowConfig>({
    enabled: false,
    mode: 'soft',
    opacity: 50,
    angle: 45
  });
  const [fabricProtection, setFabricProtection] = useState<boolean>(true);
  const [autoRegenerate, setAutoRegenerate] = useState<boolean>(true);
  const [isZipping, setIsZipping] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'settings' | 'stylist'>('prompt');
  
  // Stylist State
  const [stylistSuggestions, setStylistSuggestions] = useState<StylistSuggestion[]>([]);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

  // Computed
  const completedCount = images.filter(i => i.status === 'completed').length;
  const progressPercent = images.length > 0 ? (completedCount / images.length) * 100 : 0;
  const currentPlatform = PLATFORM_PRESETS.find(p => p.id === selectedPlatform) || PLATFORM_PRESETS[0];

  const handleFilesAdded = useCallback((files: File[]) => {
    const newImages: UploadedImage[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      originalName: file.name,
      generationRetries: 0,
      viewAngle: 'front' // Default
    }));
    
    setImages(prev => [...prev, ...newImages]);
    if (!selectedImageId && newImages.length > 0) setSelectedImageId(newImages[0].id);
  }, [selectedImageId]);

  const handleRemoveImage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const handleResetAll = () => {
    if (confirm('Clear all images and reset settings?')) {
        setImages([]);
        setSelectedImageId(null);
        setAppState(AppState.IDLE);
        setConsistencySeed(Math.floor(Math.random() * 10000));
        setStylistSuggestions([]);
        setPrompt('');
    }
  };

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    const platform = PLATFORM_PRESETS.find(p => p.id === platformId);
    if (platform) {
        if (platform.forceWhiteBackground) {
            setPrompt('');
            setShadowConfig(prev => ({ ...prev, enabled: false }));
        } else {
            setShadowConfig(prev => ({ ...prev, enabled: true }));
        }
    }
  };

  const handleAnalyzeStyle = async () => {
    const selectedImage = images.find(img => img.id === selectedImageId);
    if (!selectedImage) return;

    setIsAnalyzingStyle(true);
    try {
        const suggestions = await getStylistSuggestions(selectedImage.file);
        setStylistSuggestions(suggestions);
    } catch (error) {
        alert("Failed to analyze style. Please try again.");
    } finally {
        setIsAnalyzingStyle(false);
    }
  };

  const handleUpdateViewAngle = (id: string, angle: ViewAngle) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, viewAngle: angle } : img));
  };

  const handleProcessImage = async (img: UploadedImage, seed: number): Promise<UploadedImage> => {
     try {
        const { resultUrl, qualityMetrics } = await editImageBackground(img.file, {
            prompt: prompt || (currentPlatform.forceWhiteBackground ? "Pure White" : "Studio Background"),
            shadows: shadowConfig,
            consistencySeed: seed,
            fabricProtection: fabricProtection,
            platformRules: { forceWhite: currentPlatform.forceWhiteBackground },
            viewAngle: img.viewAngle
        });

        if (autoRegenerate && qualityMetrics.overall < 0.85 && (img.generationRetries || 0) < 1) {
            console.log(`Auto-regenerating image ${img.id} due to low quality score: ${qualityMetrics.overall}`);
            return handleProcessImage({ ...img, generationRetries: (img.generationRetries || 0) + 1 }, seed + 1);
        }

        return { 
            ...img, 
            status: 'completed', 
            resultUrl, 
            qualityMetrics 
        };
     } catch (error) {
        console.error(error);
        return { ...img, status: 'failed' };
     }
  };

  const processBatch = async () => {
    if (images.length === 0) return;
    if (!prompt.trim() && !currentPlatform.forceWhiteBackground) {
        alert("Please enter a background prompt or select a preset.");
        return;
    }

    setAppState(AppState.PROCESSING);
    const queue = images.filter(i => i.status === 'pending' || i.status === 'failed');
    setImages(prev => prev.map(img => queue.find(q => q.id === img.id) ? { ...img, status: 'processing' } : img));

    for (const img of queue) {
        const updatedImg = await handleProcessImage(img, consistencySeed);
        setImages(prev => prev.map(prevImg => prevImg.id === updatedImg.id ? updatedImg : prevImg));
    }
    
    setAppState(AppState.COMPLETE);
  };

  const handleDownload = (img: UploadedImage) => {
    if (!img.resultUrl) return;
    const link = document.createElement('a');
    link.href = img.resultUrl;
    link.download = `lumina_${currentPlatform.id}_${img.originalName.replace(/\.[^/.]+$/, "")}.${currentPlatform.exportFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    const completedImages = images.filter(img => img.status === 'completed' && img.resultUrl);
    if (completedImages.length === 0) return;

    setIsZipping(true);
    try {
        const zip = new JSZip();
        const imgFolder = zip.folder(`lumina_${selectedPlatform}_batch`);

        completedImages.forEach((img) => {
            if (img.resultUrl && imgFolder) {
                const base64Data = img.resultUrl.split(',')[1];
                const ext = currentPlatform.exportFormat;
                const fileName = `${img.originalName.replace(/\.[^/.]+$/, "")}_processed.${ext}`;
                imgFolder.file(fileName, base64Data, { base64: true });
            }
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `lumina_batch_${new Date().toISOString().slice(0,10)}.zip`);
    } catch (error) {
        console.error("Failed to zip files", error);
        alert("Failed to create zip file.");
    } finally {
        setIsZipping(false);
    }
  };

  const selectedImage = images.find(img => img.id === selectedImageId);

  return (
    <div className="flex h-screen w-full bg-background text-neutral-200 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-[420px] flex-shrink-0 border-r border-neutral-800 bg-surface flex flex-col h-full z-10 shadow-2xl">
        <div className="p-5 border-b border-neutral-800 bg-surfaceHighlight/30">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Layers size={18} />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Lumina Enterprise</h1>
                    <p className="text-[10px] text-primary/80 font-medium uppercase tracking-widest">Fashion AI Engine v2.0</p>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800">
            {['prompt', 'stylist', 'settings'].map(tab => (
                 <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={clsx("flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors", 
                    activeTab === tab ? "border-primary text-white bg-primary/5" : "border-transparent text-neutral-500 hover:text-neutral-300")}
                >
                    {tab === 'prompt' ? 'Prompt' : tab === 'stylist' ? 'AI Stylist' : 'Studio'}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'prompt' && (
                <div className="p-5 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                            <Box size={14} /> Target Platform
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PLATFORM_PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handlePlatformChange(p.id)}
                                    className={clsx(
                                        "p-3 rounded-lg border text-left transition-all",
                                        selectedPlatform === p.id 
                                            ? "border-primary bg-primary/10 text-white shadow-sm" 
                                            : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700"
                                    )}
                                >
                                    <div className="text-xs font-bold">{p.name}</div>
                                    <div className="text-[10px] opacity-70 mt-1">{p.aspectRatio} • {p.exportFormat.toUpperCase()}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={clsx("space-y-2 transition-opacity", currentPlatform.forceWhiteBackground && "opacity-50 pointer-events-none")}>
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                            <Wand2 size={14} /> Background Prompt
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={currentPlatform.forceWhiteBackground}
                            placeholder={currentPlatform.forceWhiteBackground ? "Amazon Mode: Pure White (Locked)" : "Describe the scene..."}
                            className="w-full h-28 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none placeholder:text-neutral-600"
                        />
                    </div>

                    {!currentPlatform.forceWhiteBackground && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Scene Presets</label>
                            <div className="grid grid-cols-2 gap-2">
                                {BACKGROUND_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setPrompt(preset.prompt)}
                                        className="text-left px-3 py-2 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition-colors"
                                    >
                                        <div className="text-xs font-medium text-neutral-300">{preset.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'stylist' && (
                <div className="p-5 space-y-6">
                    <div className="text-center space-y-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/10 border border-primary/20">
                            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-white">AI Fashion Stylist</h3>
                            <p className="text-xs text-neutral-400 mt-1 mb-3">
                                Smart analysis of your garment to suggest clashing-free, trendy backgrounds.
                            </p>
                            <button
                                onClick={handleAnalyzeStyle}
                                disabled={!selectedImage || isAnalyzingStyle}
                                className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primaryHover transition-colors flex items-center justify-center gap-2"
                            >
                                {isAnalyzingStyle ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                {selectedImage ? "Analyze Active Image" : "Select an Image"}
                            </button>
                        </div>
                    </div>

                    {stylistSuggestions.length > 0 && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Suggestions</label>
                            {stylistSuggestions.map((s) => (
                                <div 
                                    key={s.id}
                                    onClick={() => { setPrompt(s.prompt); setActiveTab('prompt'); }}
                                    className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer hover:border-primary/50 group transition-all"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{s.theme}</div>
                                        <div className="flex gap-1">
                                            {s.colorPalette.map(c => (
                                                <div key={c} className="w-3 h-3 rounded-full border border-white/10" style={{backgroundColor: c}} title={c}></div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-neutral-500 leading-relaxed mb-2">{s.reasoning}</p>
                                    <div className="text-[10px] text-neutral-600 italic truncate opacity-50">"{s.prompt}"</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="p-5 space-y-8">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" /> Fabric & Color Lock
                            </label>
                            <div 
                                onClick={() => setFabricProtection(!fabricProtection)}
                                className={clsx("w-8 h-4 rounded-full relative cursor-pointer transition-colors", fabricProtection ? "bg-emerald-500" : "bg-neutral-700")}
                            >
                                <div className={clsx("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", fabricProtection ? "left-4.5" : "left-0.5")} />
                            </div>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                            AI strictly preserves original HEX colors (ΔE Check), knit textures, and print details.
                        </p>
                    </div>

                    <div className={clsx("space-y-4", currentPlatform.forceWhiteBackground && !currentPlatform.allowShadows && "opacity-50 pointer-events-none")}>
                        <div className="flex items-center justify-between">
                             <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                                <Sun size={14} /> Smart Shadows
                            </label>
                            <div 
                                onClick={() => setShadowConfig(p => ({...p, enabled: !p.enabled}))}
                                className={clsx("w-8 h-4 rounded-full relative cursor-pointer transition-colors", shadowConfig.enabled ? "bg-primary" : "bg-neutral-700")}
                            >
                                <div className={clsx("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", shadowConfig.enabled ? "left-4.5" : "left-0.5")} />
                            </div>
                        </div>
                        
                        {shadowConfig.enabled && (
                            <div className="space-y-4 p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-neutral-400">
                                        <span>Opacity: {shadowConfig.opacity}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={shadowConfig.opacity}
                                        onChange={(e) => setShadowConfig(p => ({...p, opacity: parseInt(e.target.value)}))}
                                        className="w-full accent-primary h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-neutral-400">
                                        <span>Angle: {shadowConfig.angle}°</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="360" 
                                        value={shadowConfig.angle}
                                        onChange={(e) => setShadowConfig(p => ({...p, angle: parseInt(e.target.value)}))}
                                        className="w-full accent-primary h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                     <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                            <Grid size={14} /> Batch Consistency
                        </label>
                        <div className="flex items-center gap-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800">
                            <div className="flex-1">
                                <div className="text-xs text-neutral-300">Seed Lock</div>
                                <div className="text-[10px] text-neutral-500 font-mono">#{consistencySeed}</div>
                            </div>
                            <button 
                                onClick={() => setConsistencySeed(Math.floor(Math.random() * 10000))}
                                className="p-2 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Action Area */}
        <div className="p-6 border-t border-neutral-800 bg-surfaceHighlight/10 backdrop-blur-sm">
             {appState === AppState.PROCESSING ? (
                 <div className="w-full space-y-3">
                    <div className="flex justify-between text-xs font-medium text-neutral-300">
                        <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-primary"/> Processing Batch</span>
                        <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-primary to-indigo-500 h-full transition-all duration-300 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                 </div>
            ) : (
                <button
                    onClick={processBatch}
                    disabled={images.length === 0 || (!prompt && !currentPlatform.forceWhiteBackground)}
                    className="w-full py-4 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold tracking-wide transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                >
                    <Wand2 size={18} />
                    GENERATE BATCH
                </button>
            )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0c0c0e]">
        
        {/* Header */}
        <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-md z-20">
            <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 rounded-full border border-neutral-800">
                    <span className="w-2 h-2 rounded-full bg-neutral-500"></span>
                    <span className="text-xs font-medium text-neutral-300">{images.length} Assets</span>
                 </div>
                 {completedCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-medium text-green-400">{completedCount} Ready</span>
                    </div>
                 )}
            </div>

            <div className="flex items-center gap-3">
                 {completedCount > 0 && (
                    <button 
                        onClick={handleDownloadAll}
                        disabled={isZipping}
                        className={clsx(
                            "h-9 px-4 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all",
                            isZipping 
                                ? "bg-neutral-800 text-neutral-500" 
                                : "bg-white text-black hover:bg-neutral-200"
                        )}
                    >
                        {isZipping ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                        {isZipping ? 'Archiving...' : 'Download Batch'}
                    </button>
                 )}
                 <button 
                    onClick={handleResetAll}
                    className="h-9 px-3 rounded-lg border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white transition-colors"
                    title="Reset All"
                 >
                    <RotateCcw size={16} />
                 </button>
            </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden flex">
            
            {/* Gallery Grid */}
            <div className={clsx(
                "flex-shrink-0 border-r border-neutral-800 transition-all duration-300 flex flex-col bg-neutral-900/20",
                selectedImage ? "w-[280px]" : "w-full"
            )}>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    {images.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8">
                            <Dropzone onFilesAdded={handleFilesAdded} className="w-full max-w-lg h-64 border-neutral-800 bg-neutral-900/50" />
                        </div>
                    ) : (
                        <div className={clsx(
                            "grid gap-3",
                            selectedImage ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                        )}>
                            <Dropzone 
                                onFilesAdded={handleFilesAdded} 
                                className="h-40 border border-neutral-800 bg-neutral-900/30 hover:bg-neutral-800/50 opacity-70 hover:opacity-100" 
                             />
                             
                            {images.map(img => (
                                <div 
                                    key={img.id}
                                    onClick={() => setSelectedImageId(img.id)}
                                    className={clsx(
                                        "relative group aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-200",
                                        selectedImageId === img.id 
                                            ? "border-primary ring-2 ring-primary/50 shadow-lg shadow-primary/10" 
                                            : "border-neutral-800 hover:border-neutral-600"
                                    )}
                                >
                                    <img src={img.resultUrl || img.previewUrl} className="w-full h-full object-cover" alt="thumb" />
                                    
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                         <button 
                                            onClick={(e) => handleRemoveImage(e, img.id)}
                                            className="p-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600"
                                         >
                                            <Trash2 size={16} />
                                         </button>
                                    </div>
                                    
                                    {/* View Angle Badge (Mini) */}
                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white uppercase backdrop-blur-sm">
                                        {img.viewAngle?.charAt(0)}
                                    </div>

                                    {img.qualityMetrics && (
                                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-mono text-white border border-white/10">
                                            Q:{(img.qualityMetrics.overall * 100).toFixed(0)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed View */}
            {selectedImage && (
                <div className="flex-1 bg-[#050505] flex flex-col min-w-0 relative">
                    <div className="flex-1 p-6 flex items-center justify-center overflow-hidden">
                        <div 
                            className="relative shadow-2xl shadow-black border border-neutral-800 rounded-lg overflow-hidden"
                            style={{ 
                                aspectRatio: currentPlatform.aspectRatio.replace(':', '/'),
                                maxHeight: '80vh',
                                maxWidth: '100%'
                            }}
                        >
                            {selectedImage.status === 'completed' && selectedImage.resultUrl ? (
                                <ComparisonSlider 
                                    original={selectedImage.previewUrl} 
                                    processed={selectedImage.resultUrl}
                                    className="w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-900 flex items-center justify-center relative group">
                                    <img 
                                        src={selectedImage.previewUrl} 
                                        className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity blur-sm" 
                                        alt="Preview" 
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                         {selectedImage.status === 'processing' ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 size={48} className="text-primary animate-spin" />
                                                <p className="text-neutral-300 font-medium tracking-wide animate-pulse">AI Generating...</p>
                                            </div>
                                         ) : selectedImage.status === 'failed' ? (
                                            <div className="flex flex-col items-center gap-2 text-red-400">
                                                <AlertCircle size={48} />
                                                <p>Generation Failed.</p>
                                            </div>
                                         ) : (
                                            <div className="flex flex-col items-center gap-3 text-neutral-500">
                                                <ImageIcon size={48} />
                                                <p className="font-medium">Ready to Process</p>
                                            </div>
                                         )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata & Quality Footer */}
                    <div className="h-28 border-t border-neutral-800 bg-surface px-8 flex items-center justify-between">
                         <div className="flex items-center gap-8">
                             <div>
                                 <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">File Name</div>
                                 <div className="text-sm text-neutral-200 font-medium truncate max-w-[150px]">{selectedImage.originalName}</div>
                             </div>
                             
                             {/* View Angle Selector */}
                             <div>
                                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Angle / Pose</div>
                                <div className="relative">
                                    <select 
                                        value={selectedImage.viewAngle} 
                                        onChange={(e) => handleUpdateViewAngle(selectedImage.id, e.target.value as any)}
                                        className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded px-2 py-1.5 pr-6 outline-none focus:border-primary appearance-none w-32"
                                    >
                                        {VIEW_ANGLES.map(v => (
                                            <option key={v.value} value={v.value}>{v.label}</option>
                                        ))}
                                    </select>
                                    <Camera size={12} className="absolute right-2 top-2 text-neutral-500 pointer-events-none" />
                                </div>
                             </div>

                             {selectedImage.qualityMetrics && (
                                 <div className="flex items-center gap-6 border-l border-neutral-700 pl-8">
                                     <div className="flex flex-col gap-1">
                                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Overall Quality</div>
                                        <div className="text-xl font-bold text-white flex items-center gap-1">
                                            {(selectedImage.qualityMetrics.overall * 100).toFixed(0)}
                                            <span className="text-[10px] text-neutral-500 font-normal">/100</span>
                                        </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                         
                         <div className="flex items-center gap-4">
                             <button 
                                onClick={() => setSelectedImageId(null)}
                                className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-sm transition-colors"
                             >
                                Close
                             </button>
                             {selectedImage.status === 'completed' && (
                                 <button 
                                    onClick={() => handleDownload(selectedImage)}
                                    className="px-6 py-2.5 bg-white text-black rounded-lg hover:bg-neutral-200 font-bold text-xs uppercase tracking-wide flex items-center gap-2 transition-colors shadow-lg shadow-white/10"
                                 >
                                    <Download size={14} /> Download
                                 </button>
                             )}
                         </div>
                    </div>
                </div>
            )}

        </div>
      </main>
    </div>
  );
}

export default App;