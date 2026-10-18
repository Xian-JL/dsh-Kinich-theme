# Xiao 1.3.0 配套开发记录

- 开发基线：Kinich 2.0.2；配套验收候选现为 **2.0.3-rc.1**，仍未发布或覆盖当前 Desktop。不得把历史本地测试包当作 registry 已发布 2.0.2。版本策略允许 2.0.3 的 RC，但 stable 2.0.3 仍未获验收确认，不能标记 confirmed。
- 新增默认开启的主题总开关 `enabled`，与已有 `dynamicWallpaperEnabled` 分开。关闭总开关卸载视觉内容组件、释放品牌与交互效果，不清除壁纸、参数、历史或动效设置。
- 设置写入经过互斥边界：开启 Kinich 前关闭 Xiao；不能关闭就不启用 Kinich。Xiao 提供宿主持久化协调，两边客户端在旧冲突中固定最多显示一个。
- 原生欢迎页样式仅在 Kinich 生效时应用。关闭时原生标题、输入区与品牌不再受此样式影响。
- 本地 DSH 0.2.1-rc.2 的隔离 Profile 使用两边最新构建，验证旧配置冲突修复、两种单选状态的重启保持及页面客户端清单。没有对用户 Desktop 安装或修改配置，也未做 Computer Use 视觉验收。
- 检查：build、check、test:settings、test:presentation、test:interaction、test:dsh017、test:release-201-ui、test:wallpaper-switch；Xiao 的 test:upgrade 覆盖共享互斥模块。
- 规格更新为 1.0.8，详细规则见同级 specification 的 THEME-EXCLUSIVE-01～03，以及 Xiao 的 docs/UPGRADE_1.3.0_SPECIFICATION.md。
