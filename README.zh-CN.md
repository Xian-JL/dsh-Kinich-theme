# Kinich Theme for DeepSeek Harness

面向 DeepSeek Harness Web / Desktop 的 **基尼奇（Kinich）& 阿乔（Ajaw）交互主题插件**。

- GitHub：https://github.com/Xian-JL/dsh-Kinich-theme
- 分发方式：npm（GitHub Release 安装包可作备用）
- 当前版本：`1.6.0`
- 目标运行环境：声明兼容范围内的 DSH Web，以及桌面端 `0.2.0-rc.2`

> 本项目是独立社区插件，与 DeepSeek、HoYoverse 无官方关联，也不代表其认可或背书。

## 安装

桌面端需先打开一次以初始化 Profile，然后完全退出。使用该桌面端安装目录内自带的 DSH CLI：

```powershell
dsh plugin --profile desktop add dsh-kinich-theme@latest
```

安装后重新启动桌面端。Web 版使用下方命令。

```powershell
dsh plugin --profile web add dsh-kinich-theme@latest
```

随后启动：

```powershell
dsh web
```

普通用户无需克隆仓库、登录 npm、运行构建或安装 esbuild；npm 包和 Release 安装包均包含预构建的 `lib/index.js` 与 `lib/client.js`。

备用的 GitHub Release 安装方式：

```powershell
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```

## 更新

```powershell
dsh plugin --profile web remove dsh-kinich-theme
dsh plugin --profile web add dsh-kinich-theme@latest
```

## 卸载

```powershell
dsh plugin --profile web remove dsh-kinich-theme
```

## Astra 优化版主要功能

### Jungle 现代界面

- 以 Jungle 为当前唯一设计目标；旧版 Phlogiston / Sunlit 配置仍可读取，但不再参与本轮视觉设计。
- 欢迎页采用左侧编辑式文案、右上菱形基尼奇立绘、下沉输入框和右下阿乔构图。
- 保留原神式暖金细线、纳塔几何纹样和克制的雨林光感。

### 视觉强度

视觉模式之外，可独立选择 **Minimal / Balanced / Immersive** 三档表现强度。

### Ajaw Companion 2.0

- Idle / Hover / Reacting / Dragging 状态。
- 根据 DSH 会话运行与完成状态反馈。
- 支持拖拽、镜像、旋转、复位。
- 聚焦阿乔后可用方向键以 8 px 步长调整位置；Shift 加速，Home 复位位置。拖动时位置即时跟随指针。
- 点击显示当前 DeepSeek 官方 API 账户余额，60 秒自动刷新。
- CNY 余额低于 `¥10` 时，阿乔只发生两项变化：整体变红、动画速度翻倍；点击、拖动、情绪和会话反馈全部照常工作。
- API Key 只在 Host 侧解析，不会发送到浏览器。

### 原生 DSH 集成

- Sidebar Kinich/Ajaw 品牌区域。
- 空白会话 Hero 品牌视觉。
- 原生 Settings 设置项。
- DSH Semantic Token 实时覆盖。
- 动态环境效果，并支持 `prefers-reduced-motion`。
- 保存、余额手动刷新和会话反馈均有明确状态文字；发送状态来自真实会话快照。

## 设置入口

进入 **Settings → General → Kinich Theme**，可调整：

- Jungle（旧模式只保留配置兼容）
- Minimal / Balanced / Immersive
- 基尼奇角色层
- 阿乔伙伴
- 纳塔边角装饰与纹理
- 动态环境效果

## 兼容性

`v1.6.0` 支持此前的 DSH Web 版本及桌面端 `0.2.0-rc.2`：

```text
@deepseek-ai/dsh ^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2
Node.js ^22.19.0 || >=24.0.0
```

0.1.6 兼容层已适配新版 `promptError`、`openError`、`lastAgentError` 会话错误字段，并按 DSH 主视图实际保留的会话隔离阿乔反馈；旧版 0.1.5 会话快照仍可正常使用。

在 DSH 0.1.7 中，基尼奇设置使用 Profile 内的实时 Config 与 `configForms` API；余额监测在 Host 侧读取当前 DeepSeek 官方 API Key 提供者的配置。旧版 DSH 继续使用原有设置接口。

DeepSeek Harness 仍处于快速迭代阶段。未来 DSH API 发生变化时，请使用明确声明兼容对应 DSH 版本的 Kinich Theme 版本。

## 开发

```powershell
npm install
npm run verify
```

源码位于 `src/`，使用 esbuild 生成 `lib/` 中的 Host / Client 预构建运行文件。
桌面端视觉与动效规则见 [`docs/DESIGN_AND_MOTION.md`](./docs/DESIGN_AND_MOTION.md)。

## 素材与署名

详见 [`THIRD_PARTY_ASSETS.md`](./THIRD_PARTY_ASSETS.md)。MIT 许可仅覆盖本项目原创代码和文档；第三方角色、图片、商标及视觉素材仍受各自权利和条款约束。

## License

原创插件代码及文档采用 MIT License，详见 [`LICENSE`](./LICENSE)。
