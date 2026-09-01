# 第三方素材记录

本文件记录 `dsh-kinich-theme 0.4.0` 实际使用或审阅过的素材。它是来源清单，不构成授权证明或法律意见。

## 实际嵌入浏览器包的素材

| 包内用途 | 本地源文件 | 来源 | 处理方式 | 默认状态 |
| --- | --- | --- | --- | --- |
| 阿乔品牌标记 | `assets/originals/mascot/ajaw-pixel.png` | Bilibili UP 主“公公的日常”提供/发布的素材集 | 去除透明留白、最近邻缩放至 112×112 PNG，作为 data URI 嵌入 Client Bundle | 开启 |
| 阿乔待机动画 | `assets/originals/mascot/ajaw-idle-source.png` | Bilibili UP 主“公公的日常”提供/发布的素材集 | 从纵向五帧源图最近邻缩放至 128×485 无损 WebP，作为 data URI 嵌入 Client Bundle | 开启 |
| 基尼奇角色装饰 | `assets/originals/character/kinich-illustration.png` | 米游社《【原神档案室】丨基尼奇》：https://www.miyoushe.com/ys/article/58586903 | 保留透明通道、缩放至 520×520、转 WebP；UI 中降低不透明度并做底部遮罩 | 关闭 |
| 纳塔边角装饰 | `assets/originals/ornaments/natlan-corner-source.png` | 米游社《【原神】纳塔角色立绘～新背景图》：https://www.miyoushe.com/ys/article/55171368 | 裁切、去白底、缩放并转透明 WebP；UI 中按日夜模式低透明度混合 | 开启 |

## 审阅但未打包使用的素材

- `Kinich_theme.png`：来自萌娘百科；未用于 `0.4.0` 的源码或发布包。
- 除 `ajaw-idle-source.png` 外的其余基尼奇/阿乔像素动画帧：来自 Bilibili UP 主“公公的日常”；未用于 `0.4.0` 的源码或发布包。

## 原创实现

- 像素几何网格、燃素色光晕及响应式遮罩由插件 CSS 原创生成，不使用外部纹理图片。
- 主题色板为针对 DSH 语义 Token 编写的原创配置。

## 公开发布前必须复核

1. 保存每项素材作者或权利人的明确再分发许可记录。
2. 核实是否允许修改、压缩、透明化及嵌入 npm 包。
3. 按许可补充作者署名、作品链接、许可名称和版权声明。
4. 如任一素材没有公开再分发许可，公开版应替换为自制或明确授权素材。
5. 复核“原神”、角色及相关视觉元素的商标、同人内容与平台规则。
