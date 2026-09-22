# Kinich Theme v1.3.1 上线验收记录

验收日期：2026-09-22

源码基线：v1.2.2 (`bda3794`)

候选版本：v1.3.1

验收环境：Linux x64 / Node.js 24.19.0 / DSH 0.1.6-alpha.2
用户侧环境：Windows / DSH Web（人工复验）

## 已完成项目

| 项目 | 结果 | 证据摘要 |
| --- | --- | --- |
| 构建 | PASS | Host 与 Client 由 esbuild 成功生成 |
| 静态契约检查 | PASS | Manifest、Slot、服务、设置、余额、Session、低余额与交互契约通过 |
| 余额策略测试 | PASS | CNY 阈值、Host 缓存、官方端点、无凭据和非官方地址测试通过 |
| 原交互测试 | PASS | 发送识别、坐标换算和点击队列规则通过 |
| v1.3 展示测试 | PASS | 页面相位、阿乔临时状态、点击复用池、Web Animations 与防裁剪回归契约通过 |
| DSH 0.1.6 兼容测试 | PASS | 新旧错误字段、多 Session 主视图选择和状态隔离通过 |
| tgz 内容检查 | PASS | 10 个发行文件；未包含源码缓存、Node Modules、密钥或临时文件 |
| 严格共装 | PASS | DSH 0.1.6-alpha.2 与本地 v1.3.1 tgz 在空 npm 项目中安装成功 |
| 隔离 Profile 安装 | PASS | 新 DSH_HOME 的 Web Profile 从候选 tgz 安装成功 |
| 排除旧版后的替换安装 | PASS | v1.3.1 在空 DSH Profile 安装成功；实际解析版本为 `1.3.1` |
| 隔离启动 | PASS | DSH Web 首页 HTTP 200；余额 Route HTTP 200；无凭据返回 `unbound` |
| 浏览器资源装载前置检查 | PASS | 组合 Client Bundle HTTP 200；包含 `entering-hero`、`data-page-phase` 与 WAAPI 调用标记 |
| 点击反馈裁剪回归 | PASS | 安装包中错误的 `contain: layout style paint` 数量为 0，点击起点明确保持 `overflow: visible` |
| Windows 浏览器人工验收 | PASS | 用户完成六项验收；v1.3.0 第五项白点问题在 v1.3.1 修复后复验通过，并确认可以发布 |
| 启动错误扫描 | PASS | 未出现 plugin tree failed、loader import failed 或 ERR_MODULE_NOT_FOUND |
| 功能冻结差异检查 | PASS | Host、Balance、Session、Shared Settings、Decode、Interaction Bridge 与 Slot 注册未修改 |

执行的自动验证：

```text
npm run verify
npm pack --dry-run
git diff --check（排除上传包中已存在的 workflow CRLF 差异）
DSH 0.1.6-alpha.2 + dsh-kinich-theme-1.3.1.tgz 严格共装
临时 DSH_HOME 安装与启动探测
空 DSH_HOME 排除旧版后，仅安装 v1.3.1 并重新启动探测
鉴权后加载组合 Client Bundle 并检查 v1.3 转场/点击反馈标记
检查发行 Bundle 不含会把 1 px 点击起点变成绘制裁剪区的规则
```

本轮替换安装结果：

```text
resolved Kinich version: 1.3.1
v1.3.0 visual finding: click ring, arc, and fragments clipped to the 1 px origin
v1.3.1 clipping rule count: 0
Kinich nodes in composed profile: 1
DSH Web root: HTTP 200
/api/kinich-balance: HTTP 200 (unbound)
combined Client Bundle: HTTP 200
startup blocking errors: 0
```

## 发布阻断项

无。自动化验证、隔离安装与启动、前端资源检查及用户侧 Windows 浏览器六项人工验收均已通过。

## 当前结论

自动化、打包、严格共装、隔离启动和用户侧 Windows 浏览器复验均通过。v1.3.0 的点击反馈裁剪问题已在 v1.3.1 修复并完成复验。

**最终结论：可以正式上线。**

发布目标为 GitHub Tag `v1.3.1`、GitHub Release、版本化 tgz、长期 `dsh-kinich-theme-latest.tgz` 与 SHA-256 校验文件；不发布 npm。
