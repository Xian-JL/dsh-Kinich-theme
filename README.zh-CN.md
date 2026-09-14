# Kinich Theme for DeepSeek Harness

面向 DeepSeek Harness Web 的 **基尼奇（Kinich）& 阿乔（Ajaw）交互主题插件**。

- GitHub：https://github.com/Xian-JL/dsh-Kinich-theme
- npm：`dsh-kinich-theme`
- 正式版本：`1.0.0`
- 目标运行环境：`@deepseek-ai/dsh@0.1.5-rc.1` Web

> 本项目是独立社区插件，与 DeepSeek、HoYoverse 无官方关联，也不代表其认可或背书。

## 安装

```powershell
dsh plugin --profile web add dsh-kinich-theme
```

随后启动：

```powershell
dsh web
```

普通用户无需克隆仓库、运行构建或安装 esbuild；npm 包中已经包含预构建的 `lib/index.js` 与 `lib/client.js`。

## 更新

```powershell
dsh plugin --profile web add dsh-kinich-theme@latest
```

## 卸载

```powershell
dsh plugin --profile web remove dsh-kinich-theme
```

## 主要功能

### 三套完整视觉模式

- **Jungle**：深绿雨林、自然环境氛围与萤火动态。
- **Phlogiston**：深色 + 荧光绿/橙色的燃素能量语言。
- **Sunlit**：浅石色、金绿配色，适合长时间阅读。

### 视觉强度

视觉模式之外，可独立选择 **Minimal / Balanced / Immersive** 三档表现强度。

### Ajaw Companion 2.0

- Idle / Hover / Reacting / Dragging 状态。
- 根据 DSH 会话运行与完成状态反馈。
- 支持拖拽、镜像、旋转、复位。
- 双击互动与轻量随机待机状态。

### 原生 DSH 集成

- Sidebar Kinich/Ajaw 品牌区域。
- 空白会话 Hero 品牌视觉。
- 原生 Settings 设置项。
- DSH Semantic Token 实时覆盖。
- 动态环境效果，并支持 `prefers-reduced-motion`。

## 设置入口

进入 **Settings → General → Kinich Theme**，可调整：

- Jungle / Phlogiston / Sunlit
- Minimal / Balanced / Immersive
- 基尼奇角色层
- 阿乔伙伴
- 纳塔边角装饰与纹理
- 动态环境效果

## 兼容性

`v1.0.0` 正式面向：

```text
@deepseek-ai/dsh 0.1.5-rc.1
Node.js ^22.19.0 || >=24.0.0
```

DeepSeek Harness 仍处于快速迭代阶段。未来 DSH API 发生变化时，请使用明确声明兼容对应 DSH 版本的 Kinich Theme 版本。

## 开发

```powershell
npm install
npm run verify
```

源码位于 `src/`，使用 esbuild 生成 `lib/` 中的 Host / Client 预构建运行文件。

## 素材与署名

详见 [`THIRD_PARTY_ASSETS.md`](./THIRD_PARTY_ASSETS.md)。MIT 许可仅覆盖本项目原创代码和文档；第三方角色、图片、商标及视觉素材仍受各自权利和条款约束。

## License

原创插件代码及文档采用 MIT License，详见 [`LICENSE`](./LICENSE)。
