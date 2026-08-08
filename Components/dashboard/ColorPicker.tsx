"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Settings2, Palette, X } from "lucide-react";

interface ColorConfig {
  type: "solid" | "linear" | "radial" | "conical";
  colors: string[];
  gradientParams?: {
    angle?: number;
    position?: string;
  };
}

interface ColorPickerProps {
  config: ColorConfig;
  onChange: (newConfig: ColorConfig) => void;
}

// Professional color picker popup component with Alpha support
function ColorPickerPopup({ color, onChange, onClose }: { 
  color: string; 
  onChange: (color: string) => void; 
  onClose: () => void;
}) {
  // Parse initial color
  const parseInitialColor = (c: string) => {
    let r = 99, g = 102, b = 241, a = 100;
    let hexVal = c;

    if (c.startsWith("#")) {
      const val = c.substring(1);
      if (val.length === 3) {
        r = parseInt(val[0] + val[0], 16);
        g = parseInt(val[1] + val[1], 16);
        b = parseInt(val[2] + val[2], 16);
      } else if (val.length === 6) {
        r = parseInt(val.substring(0, 2), 16);
        g = parseInt(val.substring(2, 4), 16);
        b = parseInt(val.substring(4, 6), 16);
      } else if (val.length === 8) {
        r = parseInt(val.substring(0, 2), 16);
        g = parseInt(val.substring(2, 4), 16);
        b = parseInt(val.substring(4, 6), 16);
        a = Math.round((parseInt(val.substring(6, 8), 16) / 255) * 100);
      }
    }
    return { r, g, b, a, hex: c };
  };

  const initialValues = parseInitialColor(color);
  const [rgb, setRgb] = useState({ r: initialValues.r, g: initialValues.g, b: initialValues.b });
  const [alpha, setAlpha] = useState(initialValues.a);
  const [hex, setHex] = useState(color);
  
  // Convert RGB to HSV
  const rgbToHsv = (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const delta = max - min;
    let h = 0;
    let s = 0;
    let v = max;

    if (delta !== 0) {
      s = delta / max;
      const rr = (r / 255 - min) / delta;
      const gg = (g / 255 - min) / delta;
      const bb = (b / 255 - min) / delta;

      if (max === r / 255) h = 60 * (bb - gg);
      else if (max === g / 255) h = 60 * (2 + rr - bb);
      else h = 60 * (4 + gg - rr);
      if (h < 0) h += 360;
    }

    return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
  };

  const [hsv, setHsv] = useState(rgbToHsv(initialValues.r, initialValues.g, initialValues.b));
  const popupRef = useRef<HTMLDivElement>(null);

  // Convert HSV to RGB
  const hsvToRgb = (h: number, s: number, v: number) => {
    const c = (v / 100) * (s / 100);
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;

    if (hp < 1) { r1 = c; g1 = x; b1 = 0; }
    else if (hp < 2) { r1 = x; g1 = c; b1 = 0; }
    else if (hp < 3) { r1 = 0; g1 = c; b1 = x; }
    else if (hp < 4) { r1 = 0; g1 = x; b1 = c; }
    else if (hp < 5) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }

    const m = (v / 100) - c;
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  };

  const toHex = (r: number, g: number, b: number, a: number) => {
    const rHex = r.toString(16).padStart(2, "0");
    const gHex = g.toString(16).padStart(2, "0");
    const bHex = b.toString(16).padStart(2, "0");
    const aHex = Math.round((a / 100) * 255).toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}${aHex === "ff" ? "" : aHex}`;
  };

  const updateAll = (newRgb: { r: number, g: number, b: number }, newAlpha: number, newHsv?: { h: number, s: number, v: number }) => {
    setRgb(newRgb);
    setAlpha(newAlpha);
    if (newHsv) setHsv(newHsv);
    else setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
    
    const newHex = toHex(newRgb.r, newRgb.g, newRgb.b, newAlpha);
    setHex(newHex);
    onChange(newHex);
  };

  const updateFromHex = (newHex: string) => {
    if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(newHex)) {
      const parsed = parseInitialColor(newHex);
      updateAll({ r: parsed.r, g: parsed.g, b: parsed.b }, parsed.a);
    } else {
      setHex(newHex);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div ref={popupRef} className="bg-zinc-900 rounded-3xl shadow-2xl border border-white/10 p-6 w-[340px] animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
               <Palette size={16} />
             </div>
             <h5 className="text-white text-sm font-black uppercase tracking-widest">Color Studio</h5>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-full transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Saturation/Value picker */}
        <div 
          className="relative w-full h-44 rounded-2xl mb-6 cursor-crosshair overflow-hidden border border-white/5"
          style={{ background: `hsl(${hsv.h}, 100%, 50%)` }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
            const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
            const s = Math.round((x / rect.width) * 100);
            const v = Math.round(100 - (y / rect.height) * 100);
            const newRgb = hsvToRgb(hsv.h, s, v);
            updateAll(newRgb, alpha, { h: hsv.h, s, v });
          }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent)' }} />
          <div 
            className="absolute w-4 h-4 border-2 border-white rounded-full shadow-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-1 ring-black/20"
            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
          />
        </div>

        <div className="space-y-5">
          {/* Hue slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <span>Hue</span>
              <span>{hsv.h}&deg;</span>
            </div>
            <div className="relative w-full h-3 rounded-full cursor-pointer"
              style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
                const h = Math.round((x / rect.width) * 360);
                const newRgb = hsvToRgb(h, hsv.s, hsv.v);
                updateAll(newRgb, alpha, { h, s: hsv.s, v: hsv.v });
              }}
            >
              <div className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full -top-0.5 shadow-xl -translate-x-1/2 pointer-events-none"
                style={{ left: `${(hsv.h / 360) * 100}%` }}
              />
            </div>
          </div>

          {/* Alpha slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <span>Alpha / Opacity</span>
              <span>{alpha}%</span>
            </div>
            <div className="relative w-full h-3 rounded-full cursor-pointer overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-size-[10px_10px]"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
                updateAll(rgb, Math.round((x / rect.width) * 100), hsv);
              }}
            >
              <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, rgb(${rgb.r},${rgb.g},${rgb.b}))` }} />
              <div className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full -top-0.5 shadow-xl -translate-x-1/2 pointer-events-none"
                style={{ left: `${alpha}%` }}
              />
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-4 gap-3 mt-8">
          <div className="col-span-2 space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Hex Code</span>
            <input
              type="text"
              value={hex.toUpperCase()}
              onChange={(e) => updateFromHex(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition-colors uppercase"
            />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">R</span>
            <input
              type="number"
              value={rgb.r}
              onChange={(e) => updateAll({ ...rgb, r: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) }, alpha)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 text-white text-xs text-center focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">G</span>
            <input
              type="number"
              value={rgb.g}
              onChange={(e) => updateAll({ ...rgb, g: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) }, alpha)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 text-white text-xs text-center focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">B</span>
            <input
              type="number"
              value={rgb.b}
              onChange={(e) => updateAll({ ...rgb, b: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) }, alpha)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 text-white text-xs text-center focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Alpha</span>
            <input
              type="number"
              value={alpha}
              onChange={(e) => updateAll(rgb, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 text-white text-xs text-center focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="col-span-2 flex items-end">
             <div 
               className="w-full h-8 rounded-xl border border-white/10 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-size-[10px_10px] overflow-hidden"
             >
                <div className="w-full h-full shadow-inner" style={{ backgroundColor: hex }} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ColorPicker({ config, onChange }: ColorPickerProps) {
  const [activeTab, setActiveTab] = useState(config.type || "solid");
  const [colors, setColors] = useState(config.colors || ["#6366F1"]);
  const [params, setParams] = useState(config.gradientParams || { angle: 45, position: "center" });
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const canHaveMultipleColors = activeTab !== "solid";

  useEffect(() => {
    onChange({ type: activeTab, colors, gradientParams: params });
  }, [activeTab, colors, params, onChange]);

  const addColor = () => {
    if (canHaveMultipleColors) setColors([...colors, "#ffffff"]);
  };

  const removeColor = (index: number) => {
    if (canHaveMultipleColors && colors.length > 1) {
      const newColors = [...colors];
      newColors.splice(index, 1);
      setColors(newColors);
    }
  };

  const updateColor = (index: number, value: string) => {
    const newColors = [...colors];
    newColors[index] = value;
    setColors(newColors);
  };

  const getPreviewStyle = () => {
    if (activeTab === "solid") return { backgroundColor: colors[0] };
    if (activeTab === "linear") return { background: `linear-gradient(${params.angle}deg, ${colors.join(", ")})` };
    if (activeTab === "radial") return { background: `radial-gradient(circle at ${params.position}, ${colors.join(", ")})` };
    if (activeTab === "conical") return { background: `conic-gradient(from ${params.angle || 0}deg, ${colors.join(", ")})` };
    return {};
  };

  return (
    <div className="space-y-6 p-6 bg-zinc-900/50 border border-white/5 rounded-3xl backdrop-blur-xl">
      {pickerIndex !== null && (
        <ColorPickerPopup
          color={colors[pickerIndex]}
          onChange={(newColor) => updateColor(pickerIndex, newColor)}
          onClose={() => setPickerIndex(null)}
        />
      )}

      <div className="flex items-center gap-4 mb-4">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
          <Palette size={20} />
        </div>
        <h4 className="text-lg font-bold text-white tracking-tight">Appearance & Theme</h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/5 pb-6">
        {(["solid", "linear", "radial", "conical"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setActiveTab(type);
              if (type === "solid" && colors.length > 1) setColors([colors[0]]);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === type 
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                : "bg-white/5 text-gray-500 hover:text-white"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Mobile: Preview on top, Desktop: Side by side */}
      <div className="flex flex-col-reverse lg:flex-row gap-8">
        {/* Preview Section - Shows first on mobile */}
        <div className="w-full lg:w-[150px] flex flex-col items-center justify-center gap-4 lg:order-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Preview</span>
          <div 
            className="w-full max-w-[200px] h-32 rounded-3xl shadow-2xl border-4 border-white/10 transition-all duration-200 mx-auto lg:mx-0" 
            style={getPreviewStyle()}
          />
        </div>

        {/* Color Palette Section */}
        <div className="flex-1 space-y-6 lg:order-1 overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color Palette</span>
              {canHaveMultipleColors && (
                <button 
                  type="button"
                  onClick={addColor}
                  className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            
            {/* Fixed height container with scroll for colors */}
            <div className="max-h-[160px] overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar space-y-2">
              {colors.map((color, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5 group w-full">
                  <button
                    type="button"
                    onClick={() => setPickerIndex(idx)}
                    className="w-8 h-8 rounded-lg shadow-inner transition-all hover:scale-105 cursor-pointer border border-white/20 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="text"
                    value={color.toUpperCase()}
                    onChange={(e) => updateColor(idx, e.target.value)}
                    className="flex-1 bg-transparent text-white/90 text-xs font-mono focus:outline-none focus:ring-0 uppercase min-w-0 px-1"
                    style={{ background: 'transparent' }}
                  />
                  {canHaveMultipleColors && colors.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeColor(idx)}
                      className="p-1.5 text-gray-500 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {!canHaveMultipleColors && (
              <p className="text-[10px] text-gray-500 italic">Solid colors support only one color. Switch to gradient for multiple colors.</p>
            )}
          </div>

          {activeTab !== "solid" && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={12} /> Gradient Parameters
              </span>
              <div className="grid grid-cols-1 gap-4">
                {activeTab === "linear" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                      <span>ANGLE</span>
                      <span>{params.angle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={params.angle || 0}
                      onChange={(e) => setParams({ ...params, angle: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}
                {activeTab === "radial" && (
                  <div className="grid grid-cols-1 gap-2">
                    <span className="text-[10px] font-bold text-gray-500">ORIGIN POINT</span>
                    <select
                      value={params.position || "center"}
                      onChange={(e) => setParams({ ...params, position: e.target.value })}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer appearance-none shadow-xl"
                    >
                      <option value="center">Center Focus</option>
                      <option value="top">North Alignment</option>
                      <option value="top left">North-West Angle</option>
                      <option value="top right">North-East Angle</option>
                      <option value="bottom">South Horizon</option>
                      <option value="bottom left">South-West Angle</option>
                      <option value="bottom right">South-East Angle</option>
                    </select>
                  </div>
                )}
                {activeTab === "conical" && (
                  <div className="grid grid-cols-1 gap-2">
                    <span className="text-[10px] font-bold text-gray-500">START ANGLE</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={params.angle || 0}
                      onChange={(e) => setParams({ ...params, angle: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}