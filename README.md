# Remotion 动画工程合集

本仓库收录 `opus` 与「动画」两个工作目录下的 Remotion 动画项目源码与素材，用于版本管理与后续迭代。

## 目录结构

```
opus/
├── dark-forest/            「黑暗森林法则」科普动画（Three.js / Canvas2D 渲染）
├── love-beat/              歌曲卡点 MV（音频节拍驱动的视觉卡点）
├── remotion-skills/        Remotion 官方 skills 文档副本（见下方来源说明）
└── remotion-skill-packages/  skills 打包产物（.skill 文件）

动画/
├── particle-test/          主实验工程，含 particles / film / beyond / dark-forest 四个组合
├── docs/                   脚本与提示词文档
└── ref/                    分镜参考图与静帧对照
```

### opus/dark-forest

- 入口：`src/Root.tsx`，主 Composition：`DarkForest`
- 场景在 `src/scenes/`，公共组件在 `src/lib/`（`Nebula`、`Canvas2D`、`ScrambleText`、`three` 等）
- 时间线：`src/timeline.ts`；音频由 `scripts/make_audio.py` 生成，成品在 `public/audio/score.wav`
- 渲染：`npm install` 后 `npm run dev` 预览，`npm run render` 出片

### opus/love-beat

- 入口：`src/index.tsx` / `src/Root.tsx`，节拍数据在 `src/beats.json`
- 音乐素材 `public/song.mp3`，字体在 `public/fonts/`
- 分块渲染脚本：`render-chunk.mjs`、`render-all.sh`

### 动画/particle-test

主实验工程，`src/` 下按主题拆分：

| 目录 | 内容 |
| --- | --- |
| `particles/` | 粒子与声波画布实验（ParticleCanvas、SoundwaveCanvas） |
| `film/` | 「假如给我三天光明」系列（多版：无声版 V3、动效版 Kinetic、V2 等）、镜头/字幕/旁白数据 |
| `beyond/` | Beyond 主题（着色器与构图） |
| `dark-forest/` | 黑暗森林主题的场景与世界搭建、节奏与故事 JSON |

- 预览：`npm run dev`；校验：`npm run lint`
- `scripts/` 内含 TTS、配乐生成、分镜校验、批量 QA 等脚本
- 字体 `public/NotoSerifSC-VF.ttf`，音频与旁白资源位于 `public/film/`、`public/dark-forest/`、`public/beyond/`

## 运行环境

- Node.js：`^20.19.0 || ^22.13.0 || >=24`
- Remotion 4.0.541，React 19.3.1

各工程独立安装依赖：

```bash
cd opus/dark-forest && npm install && npm run dev
cd opus/love-beat && npm install && npx remotion studio
cd 动画/particle-test && npm install && npm run dev
```

## 未纳入本仓库的内容

| 内容 | 原因 |
| --- | --- |
| `node_modules/` | 依赖包，可通过 `npm install` 还原 |
| `out/` 渲染产物 | 体积过大：`particle-test/out` 约 2.5 GB，`love-beat/out` 约 568 MB |
| 根目录成片 `*.mp4` | 渲染成片，单文件超过 GitHub 100 MB 限制 |
| `动画/.vendor/` | 第三方素材镜像（约 290 MB，含第三方仓库的 `.git`），版权归原作者 |

## 来源说明

`opus/remotion-skills` 与 `opus/remotion-skill-packages` 来自 Remotion 官方的 skills 包（`remotion-dev/remotion` 的 `packages/skills`），版权与许可归 Remotion 项目所有，此处仅作为写作参考保留。
