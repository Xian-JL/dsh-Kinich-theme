# 第三方素材记录

> v1.7.1 未新增或修改第三方素材；设置预览继续复用包内已记录的基尼奇处理后立绘。

本文件记录 `dsh-kinich-theme 1.0.0` 实际使用的视觉素材、当前仓库中的处理后文件及其来源说明。它是来源清单，不构成授权证明或法律意见。

v1.0.0 延续既有 的素材恢复方案：此前只存在于 `lib/client.js` data URI 中的处理后素材恢复为独立文件；`npm run build` 会从这些文件重新生成完全自包含的 Client Bundle。

## 实际嵌入浏览器包的素材

| 包内用途 | v1.0.0 处理后文件 | 来源 | 处理方式 | 默认状态 |
| --- | --- | --- | --- | --- |
| 阿乔品牌标记 | `assets/mascot/ajaw-mark.png` | Bilibili UP 主“公公的日常”提供/发布的素材集 | 去除透明留白、最近邻缩放至 112×112 PNG，构建时作为 data URI 嵌入 Client Bundle | 开启 |
| 阿乔待机动画 | `assets/mascot/ajaw-idle.webp` | Bilibili UP 主“公公的日常”提供/发布的素材集 | 从纵向五帧源图最近邻缩放至 128×485 无损 WebP，构建时作为 data URI 嵌入 Client Bundle | 开启 |
| 基尼奇角色装饰 | `assets/character/kinich-character.webp` | 米游社《【原神档案室】丨基尼奇》：https://www.miyoushe.com/ys/article/58586903 | 保留透明通道、缩放至 520×520、转 WebP；UI 中降低不透明度并做底部遮罩 | 关闭 |
| 纳塔边角装饰 | `assets/ornaments/natlan-corner.webp` | 米游社《【原神】纳塔角色立绘～新背景图》：https://www.miyoushe.com/ys/article/55171368 | 裁切、去白底、缩放并转透明 WebP；UI 中按日夜模式低透明度混合 | 开启 |

## 处理后文件校验值

- `ajaw-mark.png`: `e28cc6f7d740508985d5796797710521905c3fb39614724cc5d31ef872ec538e`
- `ajaw-idle.webp`: `df3ade3f54f0e5c7623999f0e8af33ce565d018d49210e1e4acaa85036fee59e`
- `kinich-character.webp`: `3b8aed011da5cbad0bce197938b8c316e74e4d656a2bf06045469b335caad702`
- `natlan-corner.webp`: `c6b945094e477ea02d342ef13a348bbee3214231e957bb6fa258681aedd34f3d`

这些文件字节与 v1.0.0 Client Bundle 中的四个 data URI 完全一致；v1.0.0 仍沿用这些处理后素材。

## 原始素材路径记录（历史）

重构前文档记录的原始工作文件包括：

- `assets/originals/mascot/ajaw-pixel.png`
- `assets/originals/mascot/ajaw-idle-source.png`
- `assets/originals/character/kinich-illustration.png`
- `assets/originals/ornaments/natlan-corner-source.png`

这些原始工作文件不在本次上传的 v0.8.0 ZIP 内，因此当前项目仍仅保留实际嵌入运行包的处理后文件，没有凭空补造原始素材。

## 原创实现

- 像素几何网格、燃素色光晕及响应式遮罩由插件 CSS 原创生成，不使用外部纹理图片。
- 主题色板为针对 DSH 语义 Token 编写的原创配置。

## 既有素材说明

上表继续记录插件既有 Kinich/Ajaw 视觉素材的来源与实际处理方式。本次壁纸工作的来源记录不以授权调查、商标调查或额外许可审查作为开发前置条件。

## 复杂动态壁纸设计参考（2026-10-08）

- 视觉与交互参考：[Camille Mormal](https://camillemormal.com/)，包括 Work、项目详情、About、加载及过渡模板。
- 网站 About 署名的 Motion & Development：[Aristide Benoist](https://www.aristidebenoist.com/)。
- 网站 About 署名的字体：Klim Type Foundry **Söhne Buch**，来源：[Söhne 字体页面](https://klim.co.nz/retail-fonts/soehne)。
- 参考截图、观察方法和文件 URL 清单位于 `docs/wallpaper-reference/2026-10-08/`；规格为 `docs/KINICH_COMPLEX_WALLPAPER_SPECIFICATION.md`。
- `assets/wallpapers/camille-reference/images/` 中实际随插件包分发 277 张 JPEG，来源均为 Camille Mormal 网站公开的 `https://camillemormal.com/static/media/d/...` 图像：25 张加载拼图、8 个项目各自的首页图与 Hero 图，以及八项目完整详情画廊的大图/缩略图各 118 张。另随包分发 1 个 Söhne Buch WOFF2 字体文件 `https://camillemormal.com/static/font/s.woff2`。每个原始 URL、文件相对路径和内容 SHA-256 逐项列于 `assets/wallpapers/camille-reference/source-map.json`；包加载器启动时逐项校验哈希，默认壁纸离线可用。
- 八项目详情图的顺序、alt 文案、图像尺寸、40/320 px 间隔及下一项目目标取自各项目公开页面 HTML，固化在 `assets/wallpapers/camille-reference/project-reference-data.json`。`scripts/import-camille-reference.mjs` 可从原页面重新生成资源清单；执行前会核对公开渲染脚本 SHA-256 与固定规格快照。图像和字体在本机归一化前保持原始字节，不在 Client Bundle 中放入站点脚本或运行时远端加载入口。
- 用户已确认该壁纸工作不以素材授权调查作为前置事项；采用内容在此记录，不把授权调查设为开发门槛。
- 壁纸 ZIP 容器采用 `fflate` 0.8.3（MIT），仅用于受限 `.kinich-wallpaper.zip` 的压缩与解压；项目源代码与官方说明：[fflate GitHub](https://github.com/101arrowz/fflate)。

如有侵权，联系删除
