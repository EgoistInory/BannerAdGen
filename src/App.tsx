import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Image as ImageIcon, Layout, Settings, Link as LinkIcon, FileText, AlertCircle, Key, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const IMAGE_SIZES = ["1K", "2K", "4K"];

export default function App() {
  const [hasKey, setHasKey] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [size, setSize] = useState('1K');
  const [selectedRatios, setSelectedRatios] = useState<string[]>(['16:9', '1:1', '9:16']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{ratio: string, imageUrl?: string, error?: string, loading: boolean}[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio?.hasSelectedApiKey) {
        // @ts-ignore
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio?.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const toggleRatio = (ratio: string) => {
    setSelectedRatios(prev => 
      prev.includes(ratio) ? prev.filter(r => r !== ratio) : [...prev, ratio]
    );
  };

  const handleGenerate = async () => {
    if (!description && !url) return;
    if (selectedRatios.length === 0) {
      alert("Please select at least one aspect ratio.");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedPrompt('');
    
    const initialResults = selectedRatios.map(ratio => ({ ratio, loading: true }));
    setResults(initialResults);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      let imagePrompt = description;
      
      if (url || description) {
         const promptRes = await ai.models.generateContent({
           model: 'gemini-3.1-pro-preview',
           contents: `You are an expert art director. Write a highly detailed, visually descriptive prompt for an AI image generator to create a professional banner ad background or scene for the following product. 
           
CRITICAL RULES:
1. DO NOT include any text, words, logos, or typography in the image prompt. The image should be a clean background/scene where text will be overlaid later.
2. Focus on lighting, composition, colors, and the product/subject.
3. Keep it under 100 words.

Product Description: ${description}
URL: ${url}`,
           config: {
             tools: url ? [{ urlContext: {} }] : []
           }
         });
         if (promptRes.text) {
           imagePrompt = promptRes.text;
           setGeneratedPrompt(imagePrompt);
         }
      }

      await Promise.all(selectedRatios.map(async (ratio) => {
        try {
          const imageAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const res = await imageAi.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
              parts: [{ text: imagePrompt }]
            },
            config: {
              imageConfig: {
                aspectRatio: ratio,
                imageSize: size
              }
            }
          });
          
          let imageUrl = '';
          for (const part of res.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
          
          setResults(prev => prev.map(r => r.ratio === ratio ? { ...r, loading: false, imageUrl } : r));
        } catch (err: any) {
           console.error(`Error generating ${ratio}:`, err);
           setResults(prev => prev.map(r => r.ratio === ratio ? { ...r, loading: false, error: err.message } : r));
        }
      }));
      
    } catch (err: any) {
      console.error("Error in generation:", err);
      alert("Error generating prompt: " + err.message);
      setResults(prev => prev.map(r => ({ ...r, loading: false, error: err.message })));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-zinc-200"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-3">API Key Required</h1>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            To generate high-quality images with Gemini 3 Pro, you need to connect your Google Cloud API key with billing enabled.
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">
              Learn about billing requirements
            </a>
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Key className="w-5 h-5" />
            Select API Key
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans flex flex-col md:flex-row">
      {/* Left Sidebar - Configuration */}
      <div className="w-full md:w-[400px] lg:w-[480px] bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">AdGen Pro</h1>
          </div>
          <p className="text-sm text-zinc-500">Generate multi-format banner ads instantly.</p>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-8">
          {/* Input Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              Product Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Product URL (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/product"
                    className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Description & Vibe</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the product, target audience, and visual style..."
                  rows={4}
                  className="block w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 focus:bg-white transition-colors resize-none"
                />
              </div>
            </div>
          </section>

          {/* Settings Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              Generation Settings
            </h2>
            
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-2">Image Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                      size === s 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-zinc-700">Aspect Ratios</label>
                <span className="text-xs text-zinc-500">{selectedRatios.length} selected</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map(ratio => {
                  const isSelected = selectedRatios.includes(ratio);
                  const [w, h] = ratio.split(':').map(Number);
                  const maxDim = 20;
                  const width = w > h ? maxDim : maxDim * (w / h);
                  const height = h > w ? maxDim : maxDim * (h / w);
                  
                  return (
                    <button
                      key={ratio}
                      onClick={() => toggleRatio(ratio)}
                      className={`py-2 flex flex-col items-center justify-center gap-1.5 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div 
                          className={`border-2 rounded-sm ${isSelected ? 'border-indigo-500' : 'border-zinc-300'}`}
                          style={{ width: `${width}px`, height: `${height}px` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium">{ratio}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-zinc-200 bg-white">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!url && !description) || selectedRatios.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-medium py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Campaign...
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                Generate Banners
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Content - Results */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-12 bg-zinc-50/50">
        {results.length === 0 && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <Layout className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-xl font-medium text-zinc-900 mb-2">Ready to generate</h3>
            <p className="text-zinc-500 leading-relaxed">
              Enter a product description or URL on the left, select your desired ad formats, and we'll generate a complete campaign.
            </p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            {generatedPrompt && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm"
              >
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Generated Scene Prompt</h4>
                <p className="text-sm text-zinc-700 italic leading-relaxed">"{generatedPrompt}"</p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
              <AnimatePresence>
                {results.map((result) => (
                  <motion.div
                    key={result.ratio}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-md">
                          {result.ratio}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {size} Resolution
                        </span>
                      </div>
                      {result.imageUrl && (
                        <a 
                          href={result.imageUrl} 
                          download={`banner-${result.ratio.replace(':', 'x')}.png`}
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    
                    <div className="p-6 flex items-center justify-center bg-zinc-50/50 min-h-[300px]">
                      {result.loading ? (
                        <div className="flex flex-col items-center gap-3 text-zinc-400">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          <span className="text-sm font-medium">Generating...</span>
                        </div>
                      ) : result.error ? (
                        <div className="flex flex-col items-center gap-3 text-red-500 text-center p-4">
                          <AlertCircle className="w-8 h-8" />
                          <span className="text-sm font-medium">{result.error}</span>
                        </div>
                      ) : result.imageUrl ? (
                        <img 
                          src={result.imageUrl} 
                          alt={`Banner ${result.ratio}`}
                          className="max-w-full max-h-[500px] object-contain rounded-lg shadow-sm border border-zinc-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
