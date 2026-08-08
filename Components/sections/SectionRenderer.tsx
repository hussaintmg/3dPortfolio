"use client";

import { useState } from "react";
import { ArrowRight, Plus, Minus, ImageIcon } from "lucide-react";
import EditableText from "@/Components/editable/EditableText";
import EditableBox from "@/Components/editable/EditableBox";
import ContactFormSection from "./ContactFormSection";
import { cn } from "@/lib/cn";

export interface SectionData {
  _id: string;
  page: string;
  template: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
}

/** Renders one owner-added section. Every string is editable in place. */
export default function SectionRenderer({ section }: { section: SectionData }) {
  const k = (field: string) => `section:${section._id}.${field}`;
  const c = section.content || {};

  switch (section.template) {
    case "heading":
      return (
        <div className="max-w-3xl space-y-5">
          <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-8 h-px bg-indigo-400/50" />
            <EditableText k={k("eyebrow")} label="Eyebrow">Section</EditableText>
          </h2>
          <EditableText
            k={k("title")}
            as="h3"
            label="Title"
            className="text-4xl md:text-6xl font-black text-white tracking-tighter block"
          >
            A headline that sets the scene
          </EditableText>
          <EditableText
            k={k("subtitle")}
            as="p"
            label="Subtitle"
            className="text-lg text-slate-400 font-medium leading-relaxed block"
          >
            One or two sentences that explain what this part of the page is about.
          </EditableText>
        </div>
      );

    case "text":
      return (
        <div className="max-w-3xl space-y-5">
          <EditableText
            k={k("title")}
            as="h3"
            label="Title"
            className="text-3xl md:text-4xl font-black text-white tracking-tighter block"
          >
            About this
          </EditableText>
          <EditableText
            k={k("body")}
            as="p"
            label="Body"
            className="text-lg text-slate-400 font-medium leading-relaxed block"
          >
            Write anything here — the whole block is editable in place.
          </EditableText>
        </div>
      );

    case "features":
      return (
        <div className="space-y-14">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-8 h-px bg-indigo-400/50" />
              <EditableText k={k("eyebrow")} label="Eyebrow">What you get</EditableText>
            </h2>
            <EditableText
              k={k("title")}
              as="h3"
              label="Title"
              className="text-4xl md:text-5xl font-black text-white tracking-tighter block"
            >
              Built to do the job
            </EditableText>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <EditableBox
                key={n}
                k={k(`f${n}.card`)}
                label={`Feature card ${n}`}
                className="group rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl p-8 space-y-4 transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/30"
              >
                <div className="size-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black">
                  {n}
                </div>
                <EditableText
                  k={k(`f${n}t`)}
                  as="h4"
                  label={`Feature ${n} title`}
                  className="text-xl font-black text-white tracking-tight block"
                >
                  {`Feature ${n}`}
                </EditableText>
                <EditableText
                  k={k(`f${n}b`)}
                  as="p"
                  label={`Feature ${n} text`}
                  className="text-sm text-slate-400 font-medium leading-relaxed block"
                >
                  Describe this benefit in a sentence or two.
                </EditableText>
              </EditableBox>
            ))}
          </div>
        </div>
      );

    case "imageText":
      return (
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center",
            c.flip && "lg:[&>*:first-child]:order-2",
          )}
        >
          <EditableBox
            k={k("image.box")}
            label="Image frame"
            className="relative aspect-4/3 rounded-4xl overflow-hidden border border-white/8 bg-white/2"
          >
            {c.imageUrl ? (
              <img
                src={c.imageUrl}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-700">
                <ImageIcon size={34} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Add an image from the section menu
                </span>
              </div>
            )}
          </EditableBox>

          <div className="space-y-5">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em]">
              <EditableText k={k("eyebrow")} label="Eyebrow">Case in point</EditableText>
            </h2>
            <EditableText
              k={k("title")}
              as="h3"
              label="Title"
              className="text-4xl md:text-5xl font-black text-white tracking-tighter block"
            >
              Show the work
            </EditableText>
            <EditableText
              k={k("body")}
              as="p"
              label="Body"
              className="text-lg text-slate-400 font-medium leading-relaxed block"
            >
              Pair a screenshot with the story behind it.
            </EditableText>
            <EditableBox
              k={k("cta.box")}
              label="Button"
              as="a"
              href="#"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <EditableText k={k("cta")} label="Button text">Learn more</EditableText>
              <ArrowRight size={14} />
            </EditableBox>
          </div>
        </div>
      );

    case "stats":
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <EditableBox
              key={n}
              k={k(`s${n}.card`)}
              label={`Stat ${n}`}
              className="rounded-3xl border border-white/8 bg-white/2 p-7 space-y-2 text-center"
            >
              <EditableText
                k={k(`s${n}v`)}
                as="p"
                label={`Stat ${n} value`}
                className="text-4xl font-black text-white tracking-tighter block"
              >
                00
              </EditableText>
              <EditableText
                k={k(`s${n}l`)}
                as="p"
                label={`Stat ${n} label`}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 block"
              >
                Label
              </EditableText>
            </EditableBox>
          ))}
        </div>
      );

    case "cta":
      return (
        <EditableBox
          k={k("wrap")}
          label="CTA panel"
          className="rounded-4xl border border-white/8 bg-linear-to-br from-indigo-500/10 to-purple-500/5 p-12 md:p-16 text-center space-y-6"
        >
          <EditableText
            k={k("title")}
            as="h3"
            label="Title"
            className="text-4xl md:text-5xl font-black text-white tracking-tighter block"
          >
            Ready when you are
          </EditableText>
          <EditableText
            k={k("body")}
            as="p"
            label="Body"
            className="text-lg text-slate-400 font-medium max-w-xl mx-auto block"
          >
            Tell me what you're building and I'll tell you how I can help.
          </EditableText>
          <EditableBox
            k={k("button.box")}
            label="CTA button"
            as="a"
            href="/contact"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
          >
            <EditableText k={k("button")} label="Button text">
              Start a conversation
            </EditableText>
            <ArrowRight size={15} />
          </EditableBox>
        </EditableBox>
      );

    case "faq":
      return <FaqBlock k={k} />;

    case "gallery": {
      const images: string[] = Array.isArray(c.images) ? c.images : [];
      return (
        <div className="space-y-10">
          <EditableText
            k={k("title")}
            as="h3"
            label="Title"
            className="text-3xl md:text-4xl font-black text-white tracking-tighter block"
          >
            Gallery
          </EditableText>
          {images.length === 0 ? (
            <div className="rounded-4xl border border-dashed border-white/10 bg-white/2 py-20 text-center space-y-3">
              <ImageIcon size={30} className="mx-auto text-slate-700" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Add images from the section menu
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {images.map((src, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-3xl overflow-hidden border border-white/8 bg-white/2"
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "contact":
      return (
        <div className="space-y-10">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em]">
              <EditableText k={k("eyebrow")} label="Eyebrow">Get in touch</EditableText>
            </h2>
            <EditableText
              k={k("title")}
              as="h3"
              label="Title"
              className="text-4xl md:text-5xl font-black text-white tracking-tighter block"
            >
              Tell me about your project
            </EditableText>
            <EditableText
              k={k("subtitle")}
              as="p"
              label="Subtitle"
              className="text-slate-400 font-medium block"
            >
              I read every message and usually reply the same day.
            </EditableText>
          </div>
          <ContactFormSection k={k} />
        </div>
      );

    case "spacer":
      return (
        <div style={{ height: Number(c.height) || 96 }} className="w-full flex items-center">
          {c.line !== false && (
            <div className="w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
          )}
        </div>
      );

    default:
      return (
        <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-xs font-bold text-slate-600 uppercase tracking-widest">
          Unknown section template: {section.template}
        </div>
      );
  }
}

/** FAQ needs local open/closed state, so it lives in its own component. */
function FaqBlock({ k }: { k: (f: string) => string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <EditableText
        k={k("title")}
        as="h3"
        label="Title"
        className="text-4xl md:text-5xl font-black text-white tracking-tighter text-center block"
      >
        Questions, answered
      </EditableText>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => {
          const isOpen = open === n;
          return (
            <EditableBox
              key={n}
              k={k(`q${n}.card`)}
              label={`FAQ item ${n}`}
              className="rounded-3xl border border-white/8 bg-white/2 overflow-hidden transition-colors hover:border-white/15"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : n)}
                className="w-full flex items-center justify-between gap-5 px-7 py-5 text-left"
              >
                <EditableText
                  k={k(`q${n}`)}
                  as="span"
                  label={`Question ${n}`}
                  className="text-base font-black text-white tracking-tight"
                >
                  {`Question ${n}`}
                </EditableText>
                <span className="size-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-accent">
                  {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <EditableText
                    k={k(`a${n}`)}
                    as="p"
                    label={`Answer ${n}`}
                    className="px-7 pb-6 text-sm text-slate-400 font-medium leading-relaxed block"
                  >
                    The answer goes here.
                  </EditableText>
                </div>
              </div>
            </EditableBox>
          );
        })}
      </div>
    </div>
  );
}
