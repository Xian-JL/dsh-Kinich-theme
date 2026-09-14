# 第三方素材记录

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

## 公开发布前必须复核

1. 保存每项素材作者或权利人的明确再分发许可记录。
2. 核实是否允许修改、压缩、透明化及嵌入 npm 包。
3. 按许可补充作者署名、作品链接、许可名称和版权声明。
4. 如任一素材没有公开再分发许可，公开版应替换为自制或明确授权素材。
5. 复核“原神”、角色及相关视觉元素的商标、同人内容与平台规则。
