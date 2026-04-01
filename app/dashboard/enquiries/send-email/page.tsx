"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Bold,
  Italic,
  Underline,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  Undo2,
  Redo2,
  X,
  User,
  MessageSquare,
  Check,
  Loader2,
  Eye,
  Code,
  Layout as LayoutIcon,
  Maximize2,
  Square,
  Type as TypeIcon,
  Monitor,
  Zap,
  ExternalLink,
  Pencil,
  Palette,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notify } from "@/lib/notify";

const BLOCK_TAGS = [
  "DIV",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "SECTION",
  "ARTICLE",
  "BLOCKQUOTE",
];
const FONT_FAMILIES = [
  { name: "Default", value: "system-ui, sans-serif" },
  { name: "Serif", value: "'Times New Roman', serif" },
  { name: "Mono", value: "'JetBrains Mono', monospace" },
];

function EmailComposerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const enquiryName = searchParams?.get("name") || "Valued Client";
  const enquiryEmail = searchParams?.get("email") || "client@example.com";
  const enquiryMessage = searchParams?.get("message") || "No message provided.";

  const [subject, setSubject] = useState("");
  useEffect(() => {
    if (enquiryName) setSubject(`Re: Your Enquiry - ${enquiryName}`);
  }, [enquiryName]);

  const [editorHtml, setEditorHtml] = useState("");
  const [activeTab, setActiveTab] = useState<
    "layout" | "spacing" | "surface" | "text"
  >("layout");
  const [isCssPanelOpen, setIsCssPanelOpen] = useState(false);
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [isLinkPanelOpen, setIsLinkPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isHistoryAction = useRef(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const savedSelection = useRef<Range | null>(null);

  const [hoveredLink, setHoveredLink] = useState<{
    el: HTMLAnchorElement;
    rect: DOMRect;
  } | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const [linkData, setLinkData] = useState({
    url: "https://",
    text: "",
    isButton: false,
    bg: "#000000",
    color: "#ffffff",
    radius: "8",
  });

  const [css, setCss] = useState({
    display: "block",
    flexDir: "column",
    flexWrap: "nowrap",
    align: "stretch",
    justify: "flex-start",
    gap: "",
    pt: "",
    pr: "",
    pb: "",
    pl: "",
    mt: "",
    mr: "",
    mb: "",
    ml: "",
    rtl: "",
    rtr: "",
    rbr: "",
    rbl: "",
    btw: "",
    brw: "",
    bbw: "",
    blw: "",
    bs: "solid",
    btc: "",
    brc: "",
    bbc: "",
    blc: "",
    bg: "",
    color: "",
    fw: "400",
    fs: "16px",
    ff: FONT_FAMILIES[0].value,
    width: "100%",
    height: "auto",
    zIndex: "1",
    pos: "static",
    t: "",
    r: "",
    b: "",
    l: "",
    custom: "",
  });

  const [activePicker, setActivePicker] = useState<string | null>(null);
  const colors = [
    "#000000",
    "#ffffff",
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#d946ef",
    "#1e293b",
    "transparent",
  ];

  useEffect(() => {
    const initialHtml = `
      <div style="background-color: #0c0c0c; color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px; font-family: sans-serif; font-weight: 800; letter-spacing: 1px;">STUDIO HUB</h2>
      </div>
      <div style="background-color: #ffffff; color: #111111; padding: 35px; border-radius: 0 0 8px 8px; font-family: sans-serif; line-height: 1.6; font-size: 14px;">
        <p>Acknowledge: <strong>${enquiryName}</strong></p>
        <p>Your signal data is being synchronized. Context:</p>
        <div style="border-left: 4px solid #0c0c0c; background: #f9f9f9; padding: 20px; font-style: italic; margin: 25px 0; color: #444;">"${enquiryMessage}"</div>
        <p>Transmission awaiting primary uplink finalize.</p>
      </div>
    `;
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
      syncToIframe();
      setUndoStack([initialHtml]);
    }
  }, [enquiryName, enquiryMessage]);

  const saveHistory = useCallback((html: string) => {
    if (isHistoryAction.current) return;
    setUndoStack((prev) => [...prev.slice(-49), html]);
    setRedoStack([]);
  }, []);

  const syncToIframe = (skipHistory = false) => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    setEditorHtml(currentHtml);
    if (!skipHistory) saveHistory(currentHtml);
  };

  const handleUndo = () => {
    if (undoStack.length <= 1) return notify.error("Root Reach.");
    isHistoryAction.current = true;
    const current = undoStack[undoStack.length - 1];
    const prev = undoStack[undoStack.length - 2];
    setRedoStack((r) => [current, ...r]);
    setUndoStack((u) => u.slice(0, -1));
    if (editorRef.current) {
      editorRef.current.innerHTML = prev;
      setEditorHtml(prev);
    }
    setTimeout(() => {
      isHistoryAction.current = false;
    }, 50);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    isHistoryAction.current = true;
    const next = redoStack[0];
    setRedoStack((r) => r.slice(1));
    setUndoStack((u) => [...u, next]);
    if (editorRef.current) {
      editorRef.current.innerHTML = next;
      setEditorHtml(next);
    }
    setTimeout(() => {
      isHistoryAction.current = false;
    }, 50);
  };

  const exec = (cmd: string, val: string | undefined = undefined) => {
    if (typeof document === "undefined") return;
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    syncToIframe();
  };

  const openLinkPanel = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
      setLinkData({ ...linkData, text: sel.toString() });
    }
    setIsLinkPanelOpen(true);
  };

  const insertLink = () => {
    const sel = window.getSelection();
    if (!sel || !linkData.url) return;
    if (savedSelection.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
    const range = sel.getRangeAt(0);
    const link = document.createElement("a");
    link.href = linkData.url;
    link.innerText = linkData.text || "Direct Link";

    // Matrix Style
    const bg = linkData.isButton ? linkData.bg : "transparent";
    const clr = linkData.color;
    const rad = linkData.isButton ? `${linkData.radius}px` : "0";
    const pad = linkData.isButton ? "10px 20px" : "0";
    const td = linkData.isButton ? "none" : "underline";
    const fw = linkData.isButton ? "700" : "400";
    const disp = linkData.isButton ? "inline-block" : "inline";

    link.setAttribute(
      "style",
      `display:${disp};padding:${pad};background-color:${bg};color:${clr};text-decoration:${td};border-radius:${rad};font-weight:${fw};`,
    );

    range.deleteContents();
    range.insertNode(link);
    setLinkData({
      url: "https://",
      text: "",
      isButton: false,
      bg: "#000000",
      color: "#ffffff",
      radius: "8",
    });
    setIsLinkPanelOpen(false);
    syncToIframe();
  };

  const applyMatrixCss = (isWrap = false) => {
    const s: string[] = [];
    const unit = (val: string) => {
      if (!val) return "";
      if (/^\d+$/.test(val)) return val + "px";
      return val;
    };
    const pushIf = (k: string, v: string, isUnit = false) => {
      if (v) s.push(`${k}:${isUnit ? unit(v) : v}`);
    };

    pushIf("display", css.display);
    if (css.display === "flex" || css.display === "grid") {
      pushIf("flex-direction", css.flexDir);
      pushIf("flex-wrap", css.flexWrap);
      pushIf("align-items", css.align);
      pushIf("justify-content", css.justify);
      pushIf("gap", css.gap, true);
    }
    pushIf("width", css.width, true);
    pushIf("height", css.height, true);
    pushIf("padding-top", css.pt, true);
    pushIf("padding-right", css.pr, true);
    pushIf("padding-bottom", css.pb, true);
    pushIf("padding-left", css.pl, true);
    pushIf("margin-top", css.mt, true);
    pushIf("margin-right", css.mr, true);
    pushIf("margin-bottom", css.mb, true);
    pushIf("margin-left", css.ml, true);
    pushIf("border-top-left-radius", css.rtl, true);
    pushIf("border-top-right-radius", css.rtr, true);
    pushIf("border-bottom-right-radius", css.rbr, true);
    pushIf("border-bottom-left-radius", css.rbl, true);
    pushIf("border-top-width", css.btw, true);
    pushIf("border-right-width", css.brw, true);
    pushIf("border-bottom-width", css.bbw, true);
    pushIf("border-left-width", css.blw, true);
    pushIf("border-top-color", css.btc);
    pushIf("border-right-color", css.brc);
    pushIf("border-bottom-color", css.bbc);
    pushIf("border-left-color", css.blc);
    pushIf("border-style", css.bs);
    pushIf("background-color", css.bg);
    pushIf("color", css.color);
    pushIf("position", css.pos);
    if (css.pos !== "static") {
      pushIf("top", css.t, true);
      pushIf("right", css.r, true);
      pushIf("bottom", css.b, true);
      pushIf("left", css.l, true);
      pushIf("z-index", css.zIndex);
    }
    pushIf("font-family", css.ff);
    pushIf("font-size", css.fs, true);
    pushIf("font-weight", css.fw);
    const styleStr = s.join(";");
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    if (isWrap) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("style", styleStr);
      try {
        sel.getRangeAt(0).surroundContents(wrapper);
      } catch {
        notify.error("Context matrix limited.");
      }
    } else {
      let n: Node | null = sel.anchorNode;
      while (n && n !== editorRef.current) {
        if (
          n.nodeType === 1 &&
          BLOCK_TAGS.includes((n as HTMLElement).tagName)
        ) {
          (n as HTMLElement).setAttribute("style", styleStr);
          break;
        }
        n = n.parentNode;
      }
    }
    syncToIframe();
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/enquiry/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: enquiryEmail,
          subject,
          html: editorRef.current?.innerHTML,
        }),
      });
      if (res.ok) {
        notify.success("Relayed.");
        setSent(true);
        setTimeout(() => router.push("/dashboard/enquiries"), 2000);
      } else notify.error("Failed.");
    } catch {
      notify.error("Relay Lost.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPreviewVisible && iframeRef.current) {
      const doc =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
                <style>
                  body { margin: 0; padding: 20px; font-family: sans-serif; background: #e2e8f0; display: flex; flex-direction: column; align-items: center; min-height: 100vh; overflow-y: auto !important; }
                  .sim-wrap { width: 100%; max-width: 500px; background: white; margin: 40px auto; border-radius: 8px; box-shadow: 0 40px 100px rgba(0,0,0,0.1); }
                </style>
                <div class="sim-wrap">${editorRef.current?.innerHTML || ""}</div>
            `);
        doc.close();
      }
    }
  }, [isPreviewVisible, editorHtml]);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "A" && editorRef.current?.contains(target)) {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        setHoveredLink({
          el: target as HTMLAnchorElement,
          rect: target.getBoundingClientRect(),
        });
      } else {
        hideTimeout.current = setTimeout(() => {
          setHoveredLink(null);
        }, 300);
      }
    };
    window.addEventListener("mouseover", handleMouse);
    return () => window.removeEventListener("mouseover", handleMouse);
  }, []);

  return (
    <div className="bg-[#050505] text-zinc-100 font-sans min-h-screen relative overflow-x-hidden pb-12">
      {/* 🔴 FIXED SIDEBAR-AWARE CORE */}
      <div className="fixed top-0 left-0 lg:left-64 right-0 z-200 py-3 pointer-events-none">
        <div className="max-w-4xl mx-auto px-6 pointer-events-auto">
          <div className="bg-[#080808]/98 backdrop-blur-3xl border border-white/10 rounded-xl p-1.5 px-3 flex items-center justify-between gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="size-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-600 border border-white/5 shadow-inner"
              >
                <ArrowLeft size={16} />
              </button>
            </div>
            <div className="flex bg-zinc-900 p-0.5 rounded-lg gap-0.5 border border-white/5 shadow-inner">
              <ToolBtn onClick={() => exec("bold")} icon={<Bold size={13} />} />
              <ToolBtn
                onClick={() => exec("italic")}
                icon={<Italic size={13} />}
              />
              <ToolBtn
                onClick={() => exec("underline")}
                icon={<Underline size={13} />}
              />
              <Separator />
              <ToolBtn
                onClick={() => exec("justifyLeft")}
                icon={<AlignLeft size={13} />}
              />
              <ToolBtn
                onClick={() => exec("justifyCenter")}
                icon={<AlignCenter size={13} />}
              />
              <ToolBtn
                onClick={() => exec("justifyRight")}
                icon={<AlignRight size={13} />}
              />
              <Separator />
              <ToolBtn
                active={isLinkPanelOpen}
                onClick={openLinkPanel}
                icon={<Link2 size={13} />}
              />
              <ToolBtn
                active={isCssPanelOpen}
                onClick={() => setIsCssPanelOpen(!isCssPanelOpen)}
                icon={<Settings2 size={13} />}
              />
              <ToolBtn
                active={isCodeEditorOpen}
                onClick={() => setIsCodeEditorOpen(!isCodeEditorOpen)}
                icon={<Code size={13} />}
              />
              <Separator />
              <ToolBtn onClick={handleUndo} icon={<Undo2 size={13} />} />
              <ToolBtn onClick={handleRedo} icon={<Redo2 size={13} />} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPreviewVisible(true)}
                className="bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:text-white transition-all"
              >
                <Eye size={12} />
              </button>
              <button
                onClick={handleSend}
                disabled={loading || sent}
                className="bg-emerald-500 text-black px-4 py-1.5 rounded-lg text-[8px] font-black uppercase shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
              </button>
            </div>
          </div>

          {/* CSS SCROLLABLE CORE PANEL */}
          <AnimatePresence>
            {isCssPanelOpen && (
              <motion.div
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                className="bg-zinc-950/98 border border-white/10 rounded-xl mt-2 p-3 flex gap-4 shadow-2xl max-h-[45vh] overflow-hidden backdrop-blur-3xl"
              >
                <div className="flex flex-col gap-1.5 shrink-0 bg-white/5 p-1 rounded-lg border border-white/5">
                  <TabSlim
                    active={activeTab === "layout"}
                    onClick={() => setActiveTab("layout")}
                    icon={<LayoutIcon size={13} />}
                  />
                  <TabSlim
                    active={activeTab === "spacing"}
                    onClick={() => setActiveTab("spacing")}
                    icon={<Maximize2 size={13} />}
                  />
                  <TabSlim
                    active={activeTab === "surface"}
                    onClick={() => setActiveTab("surface")}
                    icon={<Square size={13} />}
                  />
                  <TabSlim
                    active={activeTab === "text"}
                    onClick={() => setActiveTab("text")}
                    icon={<TypeIcon size={13} />}
                  />
                  <button
                    onClick={() => applyMatrixCss(false)}
                    className="size-8 rounded bg-emerald-500 text-black hover:bg-emerald-400 flex items-center justify-center transition-all mt-1 shadow-lg shadow-emerald-500/30"
                  >
                    <Zap size={14} />
                  </button>
                </div>
                <div className="flex-1 px-3 border-l border-white/10 py-1 overflow-y-auto custom-scrollbar no-scrollbar scroll-smooth">
                  {activeTab === "layout" && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 animate-in slide-in-from-top-1">
                      <CssSel
                        label="Display Style"
                        options={["block", "flex", "grid", "inline-block"]}
                        value={css.display}
                        onChange={(v) => setCss({ ...css, display: v })}
                      />
                      <CssSel
                        label="Direction"
                        options={[
                          "row",
                          "column",
                          "row-reverse",
                          "column-reverse",
                        ]}
                        value={css.flexDir}
                        onChange={(v) => setCss({ ...css, flexDir: v })}
                      />
                      <CssSel
                        label="Align Items"
                        options={[
                          "stretch",
                          "center",
                          "flex-start",
                          "flex-end",
                        ]}
                        value={css.align}
                        onChange={(v) => setCss({ ...css, align: v })}
                      />
                      <CssSel
                        label="Justify"
                        options={[
                          "flex-start",
                          "center",
                          "flex-end",
                          "space-around",
                          "space-between",
                        ]}
                        value={css.justify}
                        onChange={(v) => setCss({ ...css, justify: v })}
                      />
                      <CssInp
                        label="Gap"
                        placeholder="10"
                        value={css.gap}
                        onChange={(v) => setCss({ ...css, gap: v })}
                      />
                    </div>
                  )}
                  {activeTab === "spacing" && (
                    <div className="grid grid-cols-2 gap-10 animate-in slide-in-from-top-1 pb-4">
                      <div className="space-y-3">
                        <label className="text-[7.5px] font-black text-emerald-500 uppercase px-1">
                          Padding Matrix
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          <CssInp
                            label="T"
                            placeholder="0"
                            value={css.pt}
                            onChange={(v) => setCss({ ...css, pt: v })}
                          />
                          <CssInp
                            label="R"
                            placeholder="0"
                            value={css.pr}
                            onChange={(v) => setCss({ ...css, pr: v })}
                          />
                          <CssInp
                            label="B"
                            placeholder="0"
                            value={css.pb}
                            onChange={(v) => setCss({ ...css, pb: v })}
                          />
                          <CssInp
                            label="L"
                            placeholder="0"
                            value={css.pl}
                            onChange={(v) => setCss({ ...css, pl: v })}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[7.5px] font-black text-blue-500 uppercase px-1">
                          Margin Matrix
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          <CssInp
                            label="T"
                            placeholder="0"
                            value={css.mt}
                            onChange={(v) => setCss({ ...css, mt: v })}
                          />
                          <CssInp
                            label="R"
                            placeholder="0"
                            value={css.mr}
                            onChange={(v) => setCss({ ...css, mr: v })}
                          />
                          <CssInp
                            label="B"
                            placeholder="0"
                            value={css.mb}
                            onChange={(v) => setCss({ ...css, mb: v })}
                          />
                          <CssInp
                            label="L"
                            placeholder="0"
                            value={css.ml}
                            onChange={(v) => setCss({ ...css, ml: v })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "surface" && (
                    <div className="grid grid-cols-2 gap-x-10 gap-y-5 animate-in slide-in-from-top-1 pb-4">
                      <div className="grid grid-cols-4 gap-2.5 border border-white/5 p-3.5 rounded-xl bg-white/5">
                        <CssInp
                          label="Border T"
                          placeholder="1"
                          value={css.btw}
                          onChange={(v) => setCss({ ...css, btw: v })}
                        />
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <label className="text-[6px] uppercase font-black text-zinc-600">
                            T
                          </label>
                          <button
                            onClick={() =>
                              setActivePicker(
                                activePicker === "btc" ? null : "btc",
                              )
                            }
                            className="size-6 rounded border border-white/10"
                            style={{ background: css.btc || "#111" }}
                          />
                        </div>
                        <CssInp
                          label="Border R"
                          placeholder="1"
                          value={css.brw}
                          onChange={(v) => setCss({ ...css, brw: v })}
                        />
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <label className="text-[6px] uppercase font-black text-zinc-600">
                            R
                          </label>
                          <button
                            onClick={() =>
                              setActivePicker(
                                activePicker === "brc" ? null : "brc",
                              )
                            }
                            className="size-6 rounded border border-white/10"
                            style={{ background: css.brc || "#111" }}
                          />
                        </div>
                        <CssInp
                          label="Border B"
                          placeholder="1"
                          value={css.bbw}
                          onChange={(v) => setCss({ ...css, bbw: v })}
                        />
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <label className="text-[6px] uppercase font-black text-zinc-600">
                            B
                          </label>
                          <button
                            onClick={() =>
                              setActivePicker(
                                activePicker === "bbc" ? null : "bbc",
                              )
                            }
                            className="size-6 rounded border border-white/10"
                            style={{ background: css.bbc || "#111" }}
                          />
                        </div>
                        <CssInp
                          label="Border L"
                          placeholder="1"
                          value={css.blw}
                          onChange={(v) => setCss({ ...css, blw: v })}
                        />
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <label className="text-[6px] uppercase font-black text-zinc-600">
                            L
                          </label>
                          <button
                            onClick={() =>
                              setActivePicker(
                                activePicker === "blc" ? null : "blc",
                              )
                            }
                            className="size-6 rounded border border-white/10"
                            style={{ background: css.blc || "#111" }}
                          />
                        </div>
                        {activePicker &&
                          ["btc", "brc", "bbc", "blc"].includes(
                            activePicker as string,
                          ) && (
                            <div className="absolute z-300 top-24 left-32">
                              <ColorPic
                                colors={colors}
                                onSelect={(c) => {
                                  const k = activePicker as any;
                                  setCss({ ...css, [k]: c });
                                  setActivePicker(null);
                                }}
                              />
                            </div>
                          )}
                      </div>
                      <div className="space-y-4">
                        <div className="relative pt-1">
                          <label className="text-[7.5px] font-black text-zinc-700 uppercase block mb-1.5">
                            Surface Tint
                          </label>
                          <button
                            onClick={() =>
                              setActivePicker(
                                activePicker === "bg" ? null : "bg",
                              )
                            }
                            className="w-full h-9 rounded-xl border border-white/10 text-[10px] font-mono text-zinc-600 flex items-center justify-center"
                            style={{ background: css.bg || "#000" }}
                          >
                            {css.bg || "SELECT"}
                          </button>
                          {activePicker === "bg" && (
                            <div className="absolute z-300 top-14 right-0">
                              <ColorPic
                                colors={colors}
                                onSelect={(c) => {
                                  setCss({ ...css, bg: c });
                                  setActivePicker(null);
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => applyMatrixCss(true)}
                          className="w-full bg-zinc-800 text-zinc-400 py-3 rounded-xl text-[9px] font-black uppercase border border-white/5 hover:text-white transition-all shadow-xl"
                        >
                          Engage Wrap
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === "text" && (
                    <div className="grid grid-cols-4 gap-5 animate-in slide-in-from-top-1">
                      <CssSel
                        label="Font Case"
                        options={FONT_FAMILIES.map((f) => f.value)}
                        value={css.ff}
                        onChange={(v) => setCss({ ...css, ff: v })}
                      />
                      <CssInp
                        label="Text size"
                        placeholder="16"
                        value={css.fs}
                        onChange={(v) => setCss({ ...css, fs: v })}
                      />
                      <CssSel
                        label="Weight"
                        options={["400", "700", "900"]}
                        value={css.fw}
                        onChange={(v) => setCss({ ...css, fw: v })}
                      />
                      <div className="relative pt-1">
                        <label className="text-[7.5px] font-black text-zinc-700 uppercase block mb-1.5">
                          Ink Color
                        </label>
                        <button
                          onClick={() =>
                            setActivePicker(
                              activePicker === "text" ? null : "text",
                            )
                          }
                          className="w-full h-9 rounded-xl border border-white/10 text-[10px] font-mono text-zinc-600 flex items-center justify-center"
                          style={{ background: css.color || "#fff" }}
                        >
                          {css.color || "SELECT"}
                        </button>
                        {activePicker === "text" && (
                          <div className="absolute z-300 top-14 right-0">
                            <ColorPic
                              colors={colors}
                              onSelect={(c) => {
                                setCss({ ...css, color: c });
                                setActivePicker(null);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 pt-28 space-y-7 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-[1.2rem] flex items-center gap-4">
            <div className="size-10 rounded-lg bg-zinc-950 flex items-center justify-center text-emerald-500 border border-white/5 shadow-2xl">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-zinc-100 uppercase leading-none">
                {enquiryName}
              </h2>
              <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mt-1.5">
                {enquiryEmail}
              </p>
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-[1.2rem] flex items-center justify-end text-zinc-700 italic text-[11px] leading-relaxed">
            "{enquiryMessage}"
          </div>
        </div>

        <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex items-center gap-4 shadow-2xl relative">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent border-none text-xl font-black text-white outline-none placeholder:text-zinc-900"
            placeholder="SUBJECT..."
          />
          <div className="text-[8px] font-black text-zinc-800 uppercase pl-4 border-l border-white/10">
            Active Simulation
          </div>
        </div>

        <div className="bg-[#0b0b0b] border border-white/5 rounded-4xl overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.8)] relative">
          <div className="p-2">
            <div className="bg-white rounded-[1.8rem] min-h-[800px] p-16 shadow-inner selection:bg-emerald-500/15">
              <div
                ref={editorRef}
                contentEditable
                onInput={() =>
                  Object.assign(isHistoryAction, { current: false }) ||
                  syncToIframe()
                }
                onMouseUp={() => syncToIframe(true)}
                onKeyUp={() => syncToIframe(true)}
                className="outline-none text-base leading-relaxed text-zinc-900 min-h-[900px]"
                spellCheck="false"
              />
            </div>
          </div>
        </div>
      </main>

      {/* 🔴 OVERLAYS (HARD SCROLL FIXES) */}
      <AnimatePresence>
        {isLinkPanelOpen && (
          <div className="fixed inset-0 z-5000 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl pointer-events-auto">
            <div
              className="absolute inset-0 z-10"
              onClick={() => setIsLinkPanelOpen(false)}
            />
            <div
              onWheel={(e) => e.stopPropagation()}
              className="bg-[#0b0b0b] border border-white/15 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl relative z-20 pointer-events-auto overflow-hidden"
              style={{ maxHeight: "70vh" }}
            >
              <div className="p-4 shrink-0 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 size={15} className="text-emerald-500" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">
                    Connect Matrix
                  </h3>
                </div>
                <button
                  onClick={() => setIsLinkPanelOpen(false)}
                  className="text-zinc-600 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 pointer-events-auto overscroll-contain">
                <div className="space-y-4">
                  <CssInpHub
                    label="Link URL"
                    placeholder="https://"
                    value={linkData.url}
                    onChange={(v) => setLinkData({ ...linkData, url: v })}
                  />
                  <CssInpHub
                    label="Link Text"
                    placeholder="Visit..."
                    value={linkData.text}
                    onChange={(v) => setLinkData({ ...linkData, text: v })}
                  />
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[8px] text-zinc-800 uppercase font-bold">
                        Ink
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setActivePicker(
                              activePicker === "linkText" ? null : "linkText",
                            )
                          }
                          className="size-7 rounded-lg border border-white/10"
                          style={{ background: linkData.color }}
                        />{" "}
                        {activePicker === "linkText" && (
                          <div className="absolute z-10000 mt-10">
                            <ColorPic
                              colors={colors}
                              onSelect={(c) => {
                                setLinkData({ ...linkData, color: c });
                                setActivePicker(null);
                              }}
                            />
                          </div>
                        )}{" "}
                        <span className="text-[9px] font-mono text-zinc-600">
                          {linkData.color}
                        </span>
                      </div>
                    </div>
                    {linkData.isButton && (
                      <div className="space-y-1.5">
                        <label className="text-[8px] text-zinc-800 uppercase font-bold">
                          Shell
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setActivePicker(
                                activePicker === "linkBg" ? null : "linkBg",
                              )
                            }
                            className="size-7 rounded-lg border border-white/10"
                            style={{ background: linkData.bg }}
                          />{" "}
                          {activePicker === "linkBg" && (
                            <div className="absolute z-10000 mt-10">
                              <ColorPic
                                colors={colors}
                                onSelect={(c) => {
                                  setLinkData({ ...linkData, bg: c });
                                  setActivePicker(null);
                                }}
                              />
                            </div>
                          )}{" "}
                          <span className="text-[9px] font-mono text-zinc-600">
                            {linkData.bg}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <label
                    onClick={() =>
                      setLinkData({ ...linkData, isButton: !linkData.isButton })
                    }
                    className="flex items-center gap-3 cursor-pointer group bg-zinc-900/50 p-3 rounded-lg border border-white/5 hover:border-emerald-500/20 transition-all"
                  >
                    <div
                      className={`size-4 rounded-md border border-white/15 flex items-center justify-center ${linkData.isButton ? "bg-emerald-500" : "bg-transparent"}`}
                    >
                      {linkData.isButton && (
                        <Check size={10} className="text-black" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white uppercase leading-none">
                        Format as Button
                      </span>
                    </div>
                  </label>
                </div>
                <div className="h-6" />
              </div>
              <div className="p-4 shrink-0 border-t border-white/5 bg-[#0b0b0b]">
                <button
                  onClick={insertLink}
                  className="w-full bg-white text-black py-3 rounded-lg font-black uppercase text-[9px] hover:bg-emerald-500 transition-all shadow-xl"
                >
                  Apply Matrix
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCodeEditorOpen && (
          <div className="fixed inset-0 z-6000 flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[75vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                  Matri-Code Core
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (editorRef.current) {
                        editorRef.current.innerHTML = editorHtml;
                        syncToIframe();
                        setIsCodeEditorOpen(false);
                        notify.success("Materialized.");
                      }
                    }}
                    className="bg-emerald-500 text-black px-4 py-2 rounded-lg text-[9px] font-black uppercase shadow-xl hover:bg-emerald-400 transition-all"
                  >
                    Compile
                  </button>
                  <button
                    onClick={() => setIsCodeEditorOpen(false)}
                    className="bg-zinc-800 text-zinc-600 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <textarea
                className="flex-1 bg-transparent p-10 text-zinc-500 font-mono text-[11px] outline-none leading-relaxed resize-none selection:bg-zinc-800 select-text"
                value={editorHtml}
                onChange={(e) => setEditorHtml(e.target.value)}
                spellCheck="false"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔴 PREVIEW HARD SCROLL FIX */}
      {isPreviewVisible && (
        <div className="fixed inset-0 z-7000 bg-black/95 backdrop-blur-3xl flex flex-col items-center p-4 lg:p-10 pointer-events-auto">
          <div
            className="absolute inset-0 z-[-1]"
            onClick={() => setIsPreviewVisible(false)}
          />

          <div
            onWheel={(e) => e.stopPropagation()}
            className="max-w-2xl mx-auto w-full h-full flex flex-col gap-4 pointer-events-auto"
          >
            <div className="flex items-center justify-between bg-zinc-900 border border-white/10 p-4 px-6 rounded-2xl shadow-2xl shrink-0">
              <h3 className="text-[9px] font-black text-white uppercase tracking-[0.4em]">
                Simulation Status: Online
              </h3>
              <button
                onClick={() => setIsPreviewVisible(false)}
                className="size-8 rounded-lg bg-zinc-800 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-xl"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 bg-zinc-800/10 rounded-4xl p-6 lg:p-10 overflow-y-auto custom-scrollbar shadow-inner pointer-events-auto overscroll-contain">
              <div className="w-full max-w-sm mx-auto bg-white rounded-xl overflow-hidden shadow-2xl min-h-[900px] pointer-events-auto relative">
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-none pointer-events-auto absolute inset-0"
                  title="Simulation"
                  style={{ height: "2000px" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// ATOMIC COMPONENTS
function ToolBtn({
  onClick,
  icon,
  active = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`size-7 rounded transition-all flex items-center justify-center border ${active ? "bg-emerald-500 text-black border-emerald-400 shadow-xl" : "bg-transparent text-zinc-700 border-transparent hover:text-white"}`}
    >
      {icon}
    </button>
  );
}

function TabSlim({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`size-9 rounded-xl transition-all flex items-center justify-center border ${active ? "bg-white/10 text-emerald-500 border-white/10 shadow-inner" : "bg-transparent text-zinc-500 border-transparent hover:text-white hover:bg-white/5"}`}
    >
      {icon}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-zinc-950 mx-1.5" />;
}

function ColorPic({
  colors,
  onSelect,
}: {
  colors: string[];
  onSelect: (c: string) => void;
}) {
  return (
    <div className="bg-[#050505] border border-white/20 shadow-2xl rounded-xl p-3 grid grid-cols-4 gap-1.5 duration-200 pointer-events-auto">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="size-5 rounded shadow-inner border border-white/10 hover:scale-110 transition-all"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function CssSel({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[8px] text-zinc-750 uppercase font-black px-1 leading-none">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="bg-black w-full rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 border border-white/5 outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CssInp({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[8px] text-zinc-750 uppercase font-black px-1 leading-none">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-black w-full rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 outline-none border border-white/5"
        placeholder={placeholder}
      />
    </div>
  );
}

function CssInpHub({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[8px] text-zinc-800 uppercase font-black px-2 leading-none">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-950 w-full rounded-lg px-3.5 py-2.5 text-[11px] font-semibold text-zinc-100 outline-none border border-white/10 transition-all focus:border-emerald-500/20 shadow-inner select-text pointer-events-auto"
        placeholder={placeholder}
      />
    </div>
  );
}

export default function EmailComposerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#050505] flex items-center justify-center md:pl-64">
          <Loader2 className="size-12 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <EmailComposerContent />
    </Suspense>
  );
}
