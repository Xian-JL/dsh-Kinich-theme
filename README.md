# dsh-Kinich-theme

A Kinich-themed enhanced day/night UI plugin for DeepSeek Harness Web.

基于《原神》基尼奇视觉元素制作的 DeepSeek Harness Web 日夜双模式增强主题插件。

## Compatibility / 兼容性

- DeepSeek Harness: `0.1.1-rc.2`
- Profile: `web`
- Node.js: `^22.19.0 || >=24.0.0`

Other DSH versions have not been verified.

仅验证 DeepSeek Harness `0.1.1-rc.2`，其他版本不保证兼容。

## Features / 功能

- Kinich-inspired light and dark semantic theme tokens.
- Ajaw branding and continuous pixel animation.
- Drag-and-drop Ajaw positioning with persisted coordinates.
- Ajaw 0–360° rotation and horizontal mirroring.
- Optional Kinich character art with position and transparency controls.
- Optional Natlan ornament and pixel texture with intensity controls.
- Responsive hiding of large decorations on narrow screens.

## Install / 安装

Clone or download this repository, then run the following commands from its
root directory:

克隆或下载本仓库，在仓库根目录执行：

```powershell
pnpm install --prod
dsh plugin --profile web add .
dsh web
```

No build step is required for this runtime-only repository. The compiled Host
and Client bundles are included in `lib/`; `pnpm install --prod` installs the
two Host runtime dependencies.

本仓库已包含 `lib/` 运行文件，无需自行构建；`pnpm install --prod` 用于安装
两个 Host 运行依赖。

## Use / 使用

- Use **Settings → Appearance** to switch between light, dark, and system modes.
- Use **Settings → General → Kinich theme** to configure decorations.
- Drag Ajaw directly on the page to change its position; release to save.

## License and assets / 许可与素材

Original plugin code is provided under the terms in [LICENSE](./LICENSE).
Third-party visual assets are excluded from that code license. Sources and
processing notes are listed in [THIRD_PARTY_ASSETS.md](./THIRD_PARTY_ASSETS.md).

公开再分发前，请确认第三方素材的授权范围。素材已嵌入 `lib/client.js`，因此
不上传原始图片并不能消除素材再分发要求。

Genshin Impact and its related characters and visual elements belong to their
respective rights holders. This is an unofficial fan-made plugin and is not
affiliated with or endorsed by HoYoverse.

## Credits

Maintained by [Xian-JL](https://github.com/Xian-JL). Developed with assistance
from OpenAI Codex.
