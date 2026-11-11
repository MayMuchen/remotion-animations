# BEYOND / 越过永夜

64 秒原创程序化科幻短片，1920×1080，30 fps，120 BPM，D 小调。

## 播放

项目目录：`D:\AI\动画\particle-test`。

运行 `node node_modules/@remotion/cli/remotion-cli.js studio`，选择 **Beyond**。
本次预览地址：`http://localhost:3000/Beyond`。
按空格播放；首次播放需要浏览器允许声音。

## 画面与声音

| 时间 | 画面 | 节奏 |
| --- | --- | --- |
| 00–08 | 蓝色日食、片名 | 深空低频、玻璃音序 |
| 08–16 | 红蓝体积星云 | 渐进鼓组、上升音效 |
| 16–24 | 黑洞、吸积盘、引力光环 | 首次重低音爆发 |
| 24–32 | 扭曲空间光速隧道 | 连续八分音符、粒子光轨 |
| 32–40 | 双环金属雕塑 | 悬浮段、立体声回声 |
| 40–48 | 异星地表、沙丘与夕照 | 第二次低频爆发、和声展开 |
| 48–56 | 未来城市纵深穿行 | 密集踩镲、高音合成器 |
| 56–64 | 行星曙光、BEYOND | 终章和弦、自然收束 |

每拍 15 帧，每小节 60 帧，每章节 240 帧。画面脉冲与音乐共用 120 BPM 网格。
转场组合包括径向虹膜、镜头加速、旋转推近、横向光扫、柔焦叠化和低强度光晕。
所有动态由 `useCurrentFrame()` 驱动，可任意跳帧并复现。
着色器内部采样为 1440×810，输出画布与文字为 1920×1080。

画面由原创 GLSL 噪声、体积积分、SDF 光线步进与解析着色生成；配乐由原创 Python 音频合成脚本生成，无外部音乐素材。

## 文件

- `Beyond.tsx`：独立可编辑场景、标题、转场、音乐和电影画幅。
- `shaders.ts`：八组着色器场景。
- `../../scripts/beyond-score.py`：原创音乐与音效的确定性生成器。
- `../../public/beyond/cue-sheet.json`：统一节拍和章节时间。
- `../../scripts/qa-beyond.cjs`：关键帧检查。
- `../../scripts/qa-beyond-studio.cjs`：Studio 加载检查。
- `../../out/beyond/`：关键帧与检查结果。

## 参考与来源

用户提供的参考片：《我从未见过太阳》，Bilibili BV1b9ad6xEnD。
通过 Bilibili 公开元数据和关键帧缩略图了解其黑场微光、粒子纵深、空间穿行和日出构图。
未提取或复制其音乐、旁白、视频片段。

按用户要求阅读了工作区已有的 GitHub 项目：

- https://github.com/yihui-dev/awesome-opus5-5-videos ：阅读 `prasenx-693512` 与 `monokern-832979` 的 GLSL/Canvas 和原创卡点配乐提示词。此库主要提供作品与提示词，并非所有作品都提供源码。
- https://github.com/lemomo-ai/lemo-opuscar ：阅读 `styles/glass-product/STYLE.md`、`demo/studio.js` 与 `demo/music/score.py`，参考暗场条形光源、材质反射、分段音乐与共享 cue 的制作方法。

新片的故事、画面代码、标题与合成配乐均独立编写；未直接复制上述项目的代码或媒体素材。

本次交付以可交互 Studio 工程为准，未导出整片 MP4。
