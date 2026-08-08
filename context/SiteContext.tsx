"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { webData } from "@/constants/webData";
import { notify } from "@/lib/notify";
import { AnimationConfig, DEFAULT_ANIMATION } from "@/lib/animations";

export interface SiteSettingsData {
  websiteName: string;
  title: string;
  description: string;
  faviconUrl: string;
  faviconStorageKey?: string;
  email: string;
  phone: string;
  address: string;
  socials: { name: string; url: string; icon: string }[];
  footerLinks: { name: string; url: string }[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export type StyleMap = Record<string, CSSProperties>;

export interface LinkConfig {
  href: string;
  newTab: boolean;
  enabled: boolean;
}
export type LinkMap = Record<string, LinkConfig>;

export type AnimMap = Record<string, AnimationConfig>;

/** The element currently picked in the visual editor. */
export interface Selection {
  key: string;
  label: string;
  /** "text" elements can also have their words edited in place. */
  editableText: boolean;
  el: HTMLElement;
}

interface SiteContextType {
  settings: SiteSettingsData;
  refreshSettings: () => Promise<void>;

  content: Record<string, string>;
  getText: (key: string, fallback: string) => string;

  styles: StyleMap;
  /** Stored style + any unsaved edit, ready to spread into `style={}`. */
  getStyle: (key: string) => CSSProperties | undefined;

  links: LinkMap;
  /** Stored link + any unsaved edit for this element. */
  getLink: (key: string) => LinkConfig | undefined;
  updateLink: (key: string, patch: Partial<LinkConfig>) => void;
  removeLink: (key: string) => void;

  animations: AnimMap;
  getAnimation: (key: string) => AnimationConfig | undefined;
  updateAnimation: (key: string, patch: Partial<AnimationConfig>) => void;
  removeAnimation: (key: string) => void;

  /** Edit mode is only available to the owner while maintenance mode is ON. */
  canEdit: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;

  selection: Selection | null;
  select: (sel: Selection | null) => void;

  dirtyCount: number;
  registerEdit: (key: string, value: string) => void;
  updateStyle: (key: string, patch: CSSProperties) => void;
  resetStyle: (key: string) => void;
  saveEdits: () => Promise<boolean>;
  discardEdits: () => void;
  /** Bumps on every style tweak — consumers re-read getStyle(). */
  contentVersion: number;
  /**
   * Bumps ONLY on save/discard. Text elements remount on this so their DOM
   * resets cleanly, without losing the caret every time a style changes.
   */
  resetToken: number;
  saving: boolean;
}

const defaultSettings: SiteSettingsData = {
  websiteName: webData.websiteName,
  title: `${webData.websiteName} | Portfolio`,
  description: webData.hero.subheading,
  faviconUrl: "",
  email: webData.email,
  phone: webData.phone,
  address: webData.address,
  socials: webData.footer.socials,
  footerLinks: [],
  maintenanceMode: false,
  maintenanceMessage: "",
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({
  children,
  initialSettings,
  initialContent,
  initialStyles,
  initialLinks,
  initialAnimations,
  isOwner = false,
}: {
  children: ReactNode;
  /** Rendered on the server so saved text/styles paint immediately. */
  initialSettings?: Partial<SiteSettingsData> | null;
  initialContent?: Record<string, string> | null;
  initialStyles?: StyleMap | null;
  initialLinks?: LinkMap | null;
  initialAnimations?: AnimMap | null;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettingsData>({
    ...defaultSettings,
    ...(initialSettings || {}),
  });
  const [content, setContent] = useState<Record<string, string>>(
    initialContent || {},
  );
  const [styles, setStyles] = useState<StyleMap>(initialStyles || {});
  const [links, setLinks] = useState<LinkMap>(initialLinks || {});
  const [animations, setAnimations] = useState<AnimMap>(initialAnimations || {});

  const [isEditing, setIsEditingState] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [contentVersion, setContentVersion] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [saving, setSaving] = useState(false);

  const pendingText = useRef<Record<string, string>>({});
  const pendingStyles = useRef<StyleMap>({});
  const pendingLinks = useRef<Record<string, LinkConfig | null>>({});
  const pendingAnims = useRef<Record<string, AnimationConfig | null>>({});

  const canEdit = isOwner && settings.maintenanceMode;

  const refreshSettings = useCallback(async () => {
    try {
      const res = await axios.get("/api/site-settings");
      if (res.data.success && res.data.settings) {
        const s = res.data.settings;
        setSettings({
          websiteName: s.websiteName || defaultSettings.websiteName,
          title: s.title || defaultSettings.title,
          description: s.description || defaultSettings.description,
          faviconUrl: s.faviconUrl || "",
          faviconStorageKey: s.faviconStorageKey || "",
          email: s.email || defaultSettings.email,
          phone: s.phone || defaultSettings.phone,
          address: s.address || defaultSettings.address,
          socials: s.socials?.length ? s.socials : defaultSettings.socials,
          footerLinks: s.footerLinks?.length ? s.footerLinks : [],
          maintenanceMode: !!s.maintenanceMode,
          maintenanceMessage: s.maintenanceMessage || "",
        });
      }
    } catch {
      // keep whatever we already have — the public site must never break
    }
  }, []);

  // Server props are the source of truth; re-sync if they change on navigation
  useEffect(() => {
    if (initialSettings)
      setSettings((prev) => ({ ...prev, ...initialSettings }));
  }, [initialSettings]);
  useEffect(() => {
    if (initialContent) setContent(initialContent);
  }, [initialContent]);
  useEffect(() => {
    if (initialStyles) setStyles(initialStyles);
  }, [initialStyles]);
  useEffect(() => {
    if (initialLinks) setLinks(initialLinks);
  }, [initialLinks]);
  useEffect(() => {
    if (initialAnimations) setAnimations(initialAnimations);
  }, [initialAnimations]);

  // Leaving edit mode must always clear the selection outline
  const setIsEditing = useCallback((v: boolean) => {
    setIsEditingState(v);
    if (!v) setSelection(null);
  }, []);

  const getText = useCallback(
    (key: string, fallback: string) => {
      const v = content[key];
      return v !== undefined && v !== "" ? v : fallback;
    },
    [content],
  );

  const getStyle = useCallback(
    (key: string): CSSProperties | undefined => {
      const saved = styles[key];
      const pending = pendingStyles.current[key];
      if (!saved && !pending) return undefined;
      return { ...(saved || {}), ...(pending || {}) };
    },
    // contentVersion forces a re-read after live style edits
    [styles, contentVersion],
  );

  const getLink = useCallback(
    (key: string): LinkConfig | undefined => {
      if (key in pendingLinks.current) {
        return pendingLinks.current[key] ?? undefined;
      }
      return links[key];
    },
    [links, contentVersion],
  );

  const getAnimation = useCallback(
    (key: string): AnimationConfig | undefined => {
      if (key in pendingAnims.current) {
        return pendingAnims.current[key] ?? undefined;
      }
      return animations[key];
    },
    [animations, contentVersion],
  );

  const bumpDirty = () =>
    setDirtyCount(
      Object.keys(pendingText.current).length +
        Object.keys(pendingStyles.current).length +
        Object.keys(pendingLinks.current).length +
        Object.keys(pendingAnims.current).length,
    );

  const updateAnimation = useCallback(
    (key: string, patch: Partial<AnimationConfig>) => {
      const base =
        (key in pendingAnims.current
          ? pendingAnims.current[key]
          : animations[key]) || DEFAULT_ANIMATION;
      pendingAnims.current[key] = { ...base, ...patch };
      bumpDirty();
      setContentVersion((v) => v + 1);
    },
    [animations],
  );

  const removeAnimation = useCallback((key: string) => {
    pendingAnims.current[key] = null;
    bumpDirty();
    setContentVersion((v) => v + 1);
  }, []);

  const updateLink = useCallback(
    (key: string, patch: Partial<LinkConfig>) => {
      const base =
        (key in pendingLinks.current
          ? pendingLinks.current[key]
          : links[key]) || { href: "", newTab: false, enabled: true };
      pendingLinks.current[key] = { ...base, ...patch };
      bumpDirty();
      setContentVersion((v) => v + 1);
    },
    [links],
  );

  const removeLink = useCallback((key: string) => {
    pendingLinks.current[key] = null;
    bumpDirty();
    setContentVersion((v) => v + 1);
  }, []);

  const registerEdit = useCallback((key: string, value: string) => {
    pendingText.current[key] = value;
    bumpDirty();
  }, []);

  const updateStyle = useCallback((key: string, patch: CSSProperties) => {
    const merged = {
      ...(styles[key] || {}),
      ...(pendingStyles.current[key] || {}),
      ...patch,
    };
    // Empty strings mean "unset this property"
    Object.keys(patch).forEach((k) => {
      if ((patch as any)[k] === "") delete (merged as any)[k];
    });
    pendingStyles.current[key] = merged;
    bumpDirty();
    setContentVersion((v) => v + 1);
  }, [styles]);

  const resetStyle = useCallback((key: string) => {
    pendingStyles.current[key] = {};
    bumpDirty();
    setContentVersion((v) => v + 1);
  }, []);

  /**
   * Mirrors on-page footer edits into the settings document.
   *
   * Keys look like `footer.nav.2.label` / `footer.nav.2.link`; the index is
   * the position in the rendered list, which is the same order the settings
   * array uses.
   */
  const syncFooterLinks = useCallback(
    async (
      textUpdates: Record<string, string>,
      linkUpdates: Record<string, LinkConfig | null>,
    ) => {
      const touched = new Map<number, { name?: string; url?: string }>();

      for (const [key, value] of Object.entries(textUpdates)) {
        const m = key.match(/^footer\.nav\.(\d+)\.label$/);
        if (!m) continue;
        const i = Number(m[1]);
        touched.set(i, { ...touched.get(i), name: value });
      }
      for (const [key, value] of Object.entries(linkUpdates)) {
        const m = key.match(/^footer\.nav\.(\d+)\.link$/);
        if (!m || !value?.href) continue;
        const i = Number(m[1]);
        touched.set(i, { ...touched.get(i), url: value.href });
      }

      if (touched.size === 0) return;

      const current = settings.footerLinks.length
        ? [...settings.footerLinks]
        : [];
      let changed = false;

      for (const [index, patch] of touched) {
        // Only rows that already exist in settings — the on-page list may be
        // falling back to the bundled defaults, and inventing rows from that
        // would silently create a footer the owner never configured.
        if (!current[index]) continue;
        current[index] = {
          name: patch.name ?? current[index].name,
          url: patch.url ?? current[index].url,
        };
        changed = true;
      }

      if (!changed) return;
      const res = await axios.put("/api/site-settings", {
        ...settings,
        footerLinks: current,
      });
      if (res.data?.success) {
        setSettings((prev) => ({ ...prev, footerLinks: current }));
      }
    },
    [settings],
  );

  const saveEdits = useCallback(async () => {
    const textUpdates = { ...pendingText.current };
    const styleUpdates = { ...pendingStyles.current };
    const linkUpdates = { ...pendingLinks.current };
    const animUpdates = { ...pendingAnims.current };
    const hasText = Object.keys(textUpdates).length > 0;
    const hasStyles = Object.keys(styleUpdates).length > 0;
    const hasLinks = Object.keys(linkUpdates).length > 0;
    const hasAnims = Object.keys(animUpdates).length > 0;

    if (!hasText && !hasStyles && !hasLinks && !hasAnims) {
      setIsEditing(false);
      return true;
    }

    try {
      setSaving(true);
      const calls: Promise<any>[] = [];
      if (hasText)
        calls.push(axios.put("/api/site-content", { updates: textUpdates }));
      if (hasStyles)
        calls.push(axios.put("/api/site-styles", { updates: styleUpdates }));
      if (hasLinks)
        calls.push(axios.put("/api/site-links", { updates: linkUpdates }));
      if (hasAnims)
        calls.push(
          axios.put("/api/site-animations", { updates: animUpdates }),
        );

      const results = await Promise.all(calls);
      const failed = results.find((r) => !r.data?.success);
      if (failed) {
        notify.error("Save failed", failed.data?.message);
        return false;
      }

      // The link API refuses unsafe hrefs — tell the owner instead of
      // silently dropping what they typed. (Find it by shape, not position:
      // the number of calls varies.)
      const linkResult = results.find((r) => Array.isArray(r?.data?.rejected));
      if (linkResult?.data?.rejected?.length) {
        notify.warning(
          "Some links were rejected",
          `Unsupported URL on: ${linkResult.data.rejected.join(", ")}`,
        );
      }

      if (hasText) setContent((prev) => ({ ...prev, ...textUpdates }));
      if (hasStyles)
        setStyles((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(styleUpdates)) {
            if (Object.keys(v).length === 0) delete next[k];
            else next[k] = v;
          }
          return next;
        });
      if (hasLinks)
        setLinks((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(linkUpdates)) {
            if (!v || !v.href) delete next[k];
            else next[k] = v;
          }
          return next;
        });
      if (hasAnims)
        setAnimations((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(animUpdates)) {
            if (!v || v.type === "none") delete next[k];
            else next[k] = v;
          }
          return next;
        });

      // Footer links live in two places: the on-page editor writes content
      // and link records, while the dashboard's Settings screen manages the
      // `footerLinks` array. Editing one and leaving the other stale made
      // the two screens disagree, so a footer edit is mirrored across.
      await syncFooterLinks(textUpdates, linkUpdates).catch(() => {});

      pendingText.current = {};
      pendingStyles.current = {};
      pendingLinks.current = {};
      pendingAnims.current = {};
      setDirtyCount(0);
      setIsEditing(false);
      setContentVersion((v) => v + 1);
      setResetToken((v) => v + 1);
      notify.success(
        "Changes saved",
        `${Object.keys(textUpdates).length} text · ${Object.keys(styleUpdates).length} style · ${Object.keys(linkUpdates).length} link · ${Object.keys(animUpdates).length} motion`,
      );
      // Refresh the server-rendered copy so a hard reload shows the same thing
      router.refresh();
      return true;
    } catch (error: any) {
      notify.error(
        "Save failed",
        error.response?.data?.message || error.message,
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [router, setIsEditing, syncFooterLinks]);

  const discardEdits = useCallback(() => {
    pendingText.current = {};
    pendingStyles.current = {};
    pendingLinks.current = {};
    pendingAnims.current = {};
    setDirtyCount(0);
    setIsEditing(false);
    setContentVersion((v) => v + 1);
    setResetToken((v) => v + 1);
  }, [setIsEditing]);

  return (
    <SiteContext.Provider
      value={{
        settings,
        refreshSettings,
        content,
        getText,
        styles,
        getStyle,
        links,
        getLink,
        updateLink,
        removeLink,
        animations,
        getAnimation,
        updateAnimation,
        removeAnimation,
        canEdit,
        isEditing,
        setIsEditing,
        selection,
        select: setSelection,
        dirtyCount,
        registerEdit,
        updateStyle,
        resetStyle,
        saveEdits,
        discardEdits,
        contentVersion,
        resetToken,
        saving,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSite = () => {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
};
