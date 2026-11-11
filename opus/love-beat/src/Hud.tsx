// Overlay / typography layer borrowed from the Dark Forest toolkit:
// letterbox HUD with timecode + progress, HUD corner brackets, glyph-scramble
// titles, gradient sweep headline, RGB glitch and cut flashes — retuned warm
// for a love-story MV.
import React from "react";
import {AbsoluteFill} from "remotion";
import {MONO, SANS, SERIF} from "./fonts";
import {EASE_OUT, hash, pad} from "./util";

export const DURATION = 176.5;
const GL = "░▒▓█▚▞▖▗01Σ#%&@$<>/\\|=+*爱恨离合并肩雨夜街灯心跳奔跑等待";

export type ActMeta = {t: number; code: string; cn: string; en: string; tag: string};
export const ACT_META: ActMeta[] = [
  {t: 0, code: "01", cn: "独行", en: "SOLO", tag: "一个人 · 走完这条街"},
  {t: 42.5, code: "02", cn: "相遇", en: "ENCOUNTER", tag: "同一盏灯下 · 第一次抬头"},
  {t: 59, code: "03", cn: "相拥", en: "TOGETHER", tag: "世界太吵 · 只剩心跳"},
  {t: 89, code: "04", cn: "分离", en: "APART", tag: "信号断了 · 夜色很长"},
  {t: 122, code: "05", cn: "狂奔", en: "RUN BACK", tag: "把整座城 · 甩在身后"},
  {t: 142, code: "06", cn: "重逢", en: "REUNION", tag: "你还在 · 就够了"},
  {t: 170, code: "07", cn: "我们", en: "US", tag: "每一拍 · 都是奔向你"},
];

const AMBER = "rgba(255,214,170,0.72)";
const AMBER_DIM = "rgba(255,214,170,0.42)";
const ROSE = "#ff6f8b";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const q = clamp01((x - a) / (b - a));
  return q * q * (3 - 2 * q);
};

// characters decode out of random glyphs into the final text, one by one
export const Scramble: React.FC<{
  text: string;
  t: number;
  start?: number;
  speed?: number;
  win?: number;
  accent?: string;
  style?: React.CSSProperties;
}> = ({text, t, start = 0, speed = 0.055, win = 0.16, accent = "rgba(255,190,140,0.95)", style}) => {
  const chars = Array.from(text);
  return (
    <span style={{whiteSpace: "pre", ...style}}>
      {chars.map((ch, i) => {
        const r = start + i * speed + win;
        if (ch === " ") return <span key={i}> </span>;
        if (t < r - win) return <span key={i} style={{opacity: 0}}>{ch}</span>;
        if (t < r) {
          const g = GL[Math.floor(hash(i * 13.7 + Math.floor(t * 30) * 3.1) * GL.length)];
          return (
            <span key={i} style={{color: accent, textShadow: `0 0 16px ${accent}`}}>
              <span style={{display: "inline-block", width: 0, overflow: "visible"}}>{g}</span>
              <span style={{opacity: 0}}>{ch}</span>
            </span>
          );
        }
        return <span key={i}>{ch}</span>;
      })}
    </span>
  );
};

// warm-gradient sweep headline that rises out of a blur
export const Headline: React.FC<{
  text: string;
  p: number; // 0..1 in
  size: number;
  style?: React.CSSProperties;
  glow?: string;
}> = ({text, p, size, style, glow = "rgba(255,160,120,0.45)"}) => {
  const sweep = -30 + p * 135;
  return (
    <div
      style={{
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: size,
        position: "relative",
        lineHeight: 1.12,
        letterSpacing: `${0.42 - 0.22 * p}em`,
        marginRight: `-${0.42 - 0.22 * p}em`,
        filter: `blur(${(1 - p) * 18}px) drop-shadow(0 0 38px ${glow}) drop-shadow(0 4px 22px rgba(0,0,0,0.85))`,
        opacity: clamp01(p * 1.6),
        backgroundImage: `linear-gradient(100deg,#fff3e6 0%,#fffdfa ${sweep - 20}%,#ffffff ${sweep}%,#fffdfa ${
          sweep + 18
        }%,#fff3e6 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        textShadow: "0 2px 26px rgba(0,0,0,0.55)",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

const Rule: React.FC<{w: number; o: number; color?: string}> = ({w, o, color = "rgba(255,214,170,0.85)"}) => (
  <div
    style={{
      width: w,
      height: 1,
      opacity: o,
      background: `linear-gradient(90deg,transparent,${color},transparent)`,
    }}
  />
);

// ---------- opening title ----------
export const TitleCard: React.FC<{t: number}> = ({t}) => {
  if (t > 3.6) return null;
  const p = smooth(0.25, 1.5, t);
  const out = 1 - smooth(2.7, 3.5, t);
  const dim = 0.52 * out;
  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", opacity: out, pointerEvents: "none"}}>
      <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse 58% 38% at 50% 50%, rgba(3,2,8,0.78), rgba(0,0,0,0.15) 72%, rgba(0,0,0,0.5) 100%)", opacity: 0.9}} />
      <div style={{position: "absolute", inset: 0, background: "#000", opacity: dim}} />
      <div
        style={{
          position: "relative",
          fontFamily: MONO,
          fontSize: 13,
          letterSpacing: "0.85em",
          marginRight: "-0.85em",
          color: "rgba(255,228,200,0.92)",
          textShadow: "0 1px 12px rgba(0,0,0,0.9)",
          opacity: smooth(0.1, 0.7, t),
          marginBottom: 20,
        }}
      >
        <Scramble text="A BEAT-SYNC STORY" t={t} start={0.15} speed={0.035} />
      </div>
      <Headline text="If I Ain't Got You" p={p} size={78} style={{marginBottom: 18}} />
      <Rule w={720 * p} o={p} />
      <div
        style={{
          position: "relative",
          fontFamily: SERIF,
          fontSize: 30,
          letterSpacing: "0.5em",
          marginRight: "-0.5em",
          color: "#fff3e4",
          opacity: smooth(1.0, 1.7, t) * 0.95,
          marginTop: 18,
        }}
      >
        卡 点 故 事
      </div>
      <div style={{position: "relative", fontFamily: MONO, fontSize: 12, letterSpacing: "0.42em", color: "rgba(255,214,170,0.55)", marginTop: 16, opacity: smooth(1.3, 2.0, t)}}>
        105 BPM · 1280×720 · 30 FPS
      </div>
    </AbsoluteFill>
  );
};

// ---------- per-act title ----------
export const ActTitle: React.FC<{t: number; idx: number}> = ({t, idx}) => {
  const m = ACT_META[idx];
  if (!m || idx === 0) return null; // the opening card owns the first seconds
  const d = t - m.t;
  if (d < 0 || d > 1.7) return null;
  const p = smooth(0, 0.45, d);
  const out = 1 - smooth(1.15, 1.65, d);
  const top = idx === 2 || idx === 5 ? 250 : 300;
  return (
    <AbsoluteFill style={{justifyContent: "flex-start", alignItems: "center", paddingTop: top, opacity: out, pointerEvents: "none"}}>
      <div style={{position: "absolute", left: "50%", top: top - 90, width: 980, height: 380, transform: "translateX(-50%)", background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(6,2,8,0.66), rgba(0,0,0,0) 72%)"}} />
      <div style={{position: "relative", fontFamily: MONO, fontSize: 12, letterSpacing: "0.6em", marginRight: "-0.6em", color: ROSE, opacity: p, textShadow: "0 1px 10px rgba(0,0,0,0.9)"}}>
        ACT {m.code} / 07
      </div>
      <Headline text={m.cn} p={p} size={64} style={{marginTop: 8, marginBottom: 10}} glow="rgba(255,110,140,0.4)" />
      <Rule w={260 * p} o={p * 0.8} />
      <div style={{position: "relative", fontFamily: MONO, fontSize: 13, letterSpacing: "0.55em", marginRight: "-0.55em", color: AMBER, marginTop: 10, opacity: p, textShadow: "0 1px 10px rgba(0,0,0,0.9)"}}>
        {m.en}
      </div>
      <div style={{position: "relative", fontFamily: SANS, fontSize: 15, letterSpacing: "0.16em", color: "rgba(255,236,222,0.92)", marginTop: 12, textShadow: "0 1px 10px rgba(0,0,0,0.9)"}}>
        <Scramble text={m.tag} t={t} start={m.t + 0.35} speed={0.045} win={0.12} accent="rgba(255,150,170,0.9)" />
      </div>
    </AbsoluteFill>
  );
};

// ---------- persistent HUD ----------
export const Hud: React.FC<{t: number; idx: number; punch: number; caption: string; sub: string; capT: number}> = ({
  t,
  idx,
  punch,
  caption,
  sub,
  capT,
}) => {
  const W = 1280;
  const H = 720;
  const appear = smooth(3.2, 4.4, t) * (1 - smooth(170.2, 171.4, t));
  if (appear <= 0.001) return null;
  const m = ACT_META[idx] ?? ACT_META[0];
  const tc = `${pad(t / 60)}:${pad(t % 60)}:${pad((t * 30) % 30)}`;
  const prog = clamp01(t / DURATION);
  const x0 = 52;
  const x1 = W - 52;
  const lineY = H - 34;
  const blink = Math.floor(t * 1.6) % 2 === 0;
  const label: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: "0.34em",
    color: AMBER,
    textShadow: "0 1px 9px rgba(0,0,0,0.95), 0 0 16px rgba(255,150,90,0.35)",
  };
  return (
    <AbsoluteFill style={{opacity: appear, pointerEvents: "none"}}>
      {/* scrims keep the HUD legible over busy art */}
      <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 104, background: "linear-gradient(180deg,rgba(0,0,0,0.62),rgba(0,0,0,0))"}} />
      <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 84, background: "linear-gradient(0deg,rgba(0,0,0,0.62),rgba(0,0,0,0))"}} />

      {/* corner brackets */}
      {[[x0, 30], [x1, 30], [x0, H - 62], [x1, H - 62]].map(([x, y], k) => {
        const L = 20;
        const sx = k % 2 ? -1 : 1;
        const sy = k < 2 ? 1 : -1;
        return (
          <svg key={k} width={L} height={L} style={{position: "absolute", left: sx > 0 ? x : x - L, top: sy > 0 ? y : y - L, opacity: 0.3}}>
            <path
              d={`M ${sx > 0 ? 0 : L} ${sy > 0 ? L : 0} L ${sx > 0 ? 0 : L} ${sy > 0 ? 0 : L} L ${sx > 0 ? L : 0} ${sy > 0 ? 0 : L}`}
              stroke={AMBER}
              strokeWidth={1.4}
              fill="none"
            />
          </svg>
        );
      })}

      {/* top-left identity */}
      <div style={{position: "absolute", left: x0 + 30, top: 22, ...label}}>
        IF I AIN'T GOT YOU <span style={{color: AMBER_DIM}}>//</span> 卡点故事
      </div>
      {/* top-right act + timecode */}
      <div style={{position: "absolute", right: x0 + 30, top: 22, display: "flex", alignItems: "center", gap: 12, ...label}}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 7,
            background: blink ? ROSE : "transparent",
            border: `1px solid ${ROSE}`,
            boxShadow: blink ? `0 0 10px ${ROSE}` : "none",
          }}
        />
        <span>
          ACT {m.code} · {m.cn} <span style={{color: AMBER_DIM}}>|</span> TC {tc}
        </span>
      </div>

      {/* narration tag for the line being sung */}
      <div style={{position: "absolute", left: x0 + 30, top: 44, ...label, fontSize: 13, letterSpacing: "0.26em"}}>
        <span style={{color: ROSE}}>◈</span> <Scramble text={caption} t={t} start={capT} speed={0.022} win={0.1} />
        <span style={{color: AMBER_DIM, marginLeft: 10, letterSpacing: "0.2em"}}><Scramble text={sub} t={t} start={capT + 0.04} speed={0.02} win={0.09} /></span>
      </div>
      {/* audio meter along the right edge */}
      <div style={{position: "absolute", right: 20, top: H / 2 - 62, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5}}>
        {Array.from({length: 11}, (_, k) => {
          const h = 8 + 26 * (punch * (0.35 + hash(k * 7.7 + Math.floor(t * 30) * 0.11)) + 0.1 * hash(k * 3.1));
          return <div key={k} style={{height: 2, width: h * 1.5, background: k > 7 ? ROSE : "rgba(255,214,170,0.6)", opacity: 0.7}} />;
        })}
      </div>

      {/* progress rail with act ticks */}
      <div style={{position: "absolute", left: x0, right: x0, top: lineY, height: 1, background: "rgba(255,255,255,0.14)"}} />
      <div
        style={{
          position: "absolute",
          left: x0,
          top: lineY - 1,
          height: 3,
          width: (W - 2 * x0) * prog,
          background: "linear-gradient(90deg,rgba(255,170,110,0.12),rgba(255,170,110,0.9))",
          boxShadow: "0 0 12px rgba(255,150,90,0.75)",
        }}
      />
      {ACT_META.map((a) => (
        <div
          key={a.code}
          style={{position: "absolute", left: x0 + (W - 2 * x0) * (a.t / DURATION), top: lineY - 4, width: 1, height: 9, background: "rgba(255,255,255,0.28)"}}
        />
      ))}
    </AbsoluteFill>
  );
};

// ---------- closing card over the galaxy ----------
export const EndCard: React.FC<{t: number}> = ({t}) => {
  if (t < 170.4) return null;
  const p = smooth(170.5, 171.6, t);
  const out = 1 - smooth(175.5, 176.45, t);
  return (
    <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", paddingBottom: 104, opacity: p * out, pointerEvents: "none"}}>
      <div style={{position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(2,1,6,0.95) 0%, rgba(2,1,6,0.88) 46%, rgba(2,1,6,0.3) 74%, rgba(0,0,0,0) 100%)"}} />
      <div style={{position: "relative", fontFamily: MONO, fontSize: 12, letterSpacing: "0.8em", marginRight: "-0.8em", color: "rgba(255,228,200,0.95)", marginBottom: 18, textShadow: "0 1px 10px rgba(0,0,0,0.9)"}}>
        <Scramble text="THE END · 谢谢观看" t={t} start={170.5} speed={0.05} />
      </div>
      <Headline text="If I Ain't Got You" p={p} size={52} style={{marginBottom: 14}} />
      <Rule w={520 * p} o={p * 0.85} />
      <div style={{position: "relative", fontFamily: SERIF, fontSize: 22, letterSpacing: "0.4em", marginRight: "-0.4em", color: "#ffe9d8", marginTop: 16, opacity: smooth(171.4, 172.6, t), textShadow: "0 1px 12px rgba(0,0,0,0.9)"}}>
        每一拍 · 都是奔向你
      </div>
      <div style={{position: "relative", fontFamily: MONO, fontSize: 11, letterSpacing: "0.34em", color: "rgba(255,214,170,0.45)", marginTop: 22, opacity: smooth(171.7, 172.6, t)}}>
        MADE WITH REMOTION · 1280×720
      </div>
    </AbsoluteFill>
  );
};