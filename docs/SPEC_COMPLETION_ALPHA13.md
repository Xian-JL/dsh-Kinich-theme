# Kinich 规格实施收尾与人工验收交接

2026-10-13，Asia/Shanghai。Specification 1.0.4；候选 2.0.0-alpha.13。

本轮按用户指示完成代码核对、缺口修正、自动检查和本地候选包准备，不使用 Computer Use，不操作实际 Desktop Profile，不恢复用户已清除的动态壁纸历史，不发布 alpha.13。此前用户确认的三组人工验收保持完成。

## 本轮完成的代码

1. 轮播按实际经过时间推进，不因单帧超过 50ms 延长节奏停留。模拟 renderer 在稀疏帧条件下检查 R=1/25/50/75/100 的 600000/24000/12000/6000/4000ms；冻结与关闭开关保持独立。
2. 明确选择项目时清除原轮播偏移，目标项目立即正确显示；不为参数、会话或普通刷新重建 renderer。
3. About 以 CSS 视口高度判断进入视口的文字行，修正内部画布倍率与设备倍率不一致；R=0 明确滚动后，微缩栏保持完整静态显示，后续重绘不再次隐藏。
4. 设置 06 增加“重试壁纸显示”；数据读取失败时，即使还有上次成功数据，也提供重新加载入口。重试不修改素材、四项参数、强调色或壁纸历史。
5. 当前、历史和索引读取遵守 Profile 事务锁，不能抢先恢复仍在提交的 journal。Client 只接受相同 revision 的当前/历史组合，遇到另一窗口写入重读，持续冲突保留已有数据并显示可重试错误。
6. 导出准备在锁内完成，快照和包描述保留不可变副本；流式导出使用临时素材引用，清当前或清历史不破坏正在下载的包。正常完成或取消释放引用，取消不会留下持续等待的 ZIP 生产循环。引用不是历史，导出不会复活已清记录。崩溃留下的引用在对应进程不存在后可回收。
7. 已有动态开关仍按 Profile 独立保存，默认开启。关闭卸下动态实例；静态、可见度、一次采色及旧动效不受改写。

## 条款 → 实现 → 检查 → 人工状态

下列是代码覆盖及检查追踪，不把源码/模拟检查扩写为真实 Desktop 验收。前三组用户人工确认来自 2026-10-13 的明确反馈；本轮新增/变化需用户复核。

| 条款/AC | 主要实现 | 自动/包检查 | 人工状态 |
| --- | --- | --- | --- |
| G-01–03，DATA/PROFILE，AC-01、48 | Host routes/store、profileContext、共享配置 | 真实文件夹 Profile 隔离、Host 路由与传输检查 | 原管理组已确认；新锁逻辑待复核 |
| G-04，BG/PLAY/HOST，AC-02–03 | overlay、stage、session bridge | 单实例与帧调度 source harness | 原显示组已确认；本轮未重新进行 Desktop 检查 |
| REF/V/M/EXP，AC-04–05、07–12 | builtin、固定 source-map/project-reference-data、geometry/stage | 八项目/278 素材、比例/裁切/图库/页脚 source harness | 原视觉组已确认；项目选择/About 修正待复核 |
| CTL-R/A/E/V，AC-14–15、17–19、21–23、30–31 | shared/wallpaper、stage、tokens | 零值、节奏时长、裁切、数量、可见度、独立开关 source harness | 原参数组已确认；稀疏帧计时修正待复核 |
| CTL-03、AC-24、36 | RangeControl、use-wallpaper、Host revision | 参数/配置拒绝、revision 原子边界 | 原参数/管理组已确认 |
| MODE/UI，AC-25–26 | use-wallpaper、Settings 05/06、store | none/static/dynamic、幂等恢复、历史保护 | 原显示/管理组已确认 |
| COLOR，AC-27–29 | background/palette、tokens、store.capturePalette | 已采色/灰度标记、浅深派生色、恢复不重采 | 原显示组已确认；新重试仍不重采 |
| HIST/TX，AC-35、37–38、49–50 | store/archive、read-state | 独立素材、损坏记录、并发导入/清理、检查点故障、新锁读取 | 原管理组已确认；并发读取修正待复核 |
| IO，AC-39–43 | image/bundle-builder、Host archive/assets | 分卷往返、15 类拒绝输入、选定/全部导出、新导出清理与取消检查 | 原管理组已确认；导出并发修正待复核 |
| MIG/G-05–06，AC-44–47 | ensure/迁移备份、Profile 耐久路径 | 旧 WebP 迁移幂等；实际 tarball 回滚→重新升级→卸载→重装，数据哈希与已安装 Host 恢复检查 | 包级检查不证明旧版真实 Desktop 视觉，用户最终复核 |
| AC-51，MODE-02 | stage context/fallback、renderRevision | context lost/restored、显式重试重建、同一完整素材快照保留 | 新重试入口待复核 |
| READ，AC-53 | 语义 tokens、overlay/stage | 背景 alpha/强调色 source 检查 | 原浅深/显示组已确认，摄影可读性不由单元检查代替 |
| IO/G，AC-56 | 完整本地包与受限 Host 素材服务 | 安装后的 278 素材逐项读取与哈希，无参考站/CDN下载依赖 | 原离线组已确认 |
| AC-58–59 | package/lock/generated bundle、Third Party | build/check/version、pack 文件清单/通知/哈希 | alpha.13 候选；最终 v2.0 未确认 |
| ENABLE-01–07，AC-60 | Profile 配置、use-wallpaper、stage、Settings 06 | 开关关闭/开启、配置重读、真实 store 重新打开、RAF/GPU层清理和静态独立 | 开关的真实桌面显示/重启由用户复核 |

取消项：AC-06、13、16、20、32–34、52、54、55、57。保持 cancelled，不补做或宣称通过。1.0.4 只将已定义的 AC-60 补入总矩阵/DONE，不增加功能范围或恢复取消门槛。

## 检查结果与证据类型

- build、check、test:version、test:settings。
- test:wallpaper：完整参考包、Profile、分卷、revision、提交检查点与恢复。
- test:wallpaper-boundaries：非法输入保持原数据、重复/同名不同包、缺卷、字体角色、旧 WebP 迁移与 none 重启。
- test:wallpaper-consistency：Client revision 配对、同 Profile 两 store 并发 journal、导出期间清当前/历史、取消及引用清理。
- test:wallpaper-renderer：模拟 WebGL/Canvas/RAF，新增稀疏帧 R 停留、明确项目选择与 render retry；不声称真实 GPU/Desktop 已测。
- test:wallpaper-switch 与 test-wallpaper-desktop-transport.mjs：隔离配置/store 重读和实际 Request/Response 传输边界，不是 Computer Use。
- test-packed-lifecycle-alpha13.ps1：在 Kinich_archive 内新建独立 Profile，使用实际 npm 安装包管理与已安装 lib/index.js。Host 服务容器为受控测试替身，不是正在运行的 DSH 应用。当前/历史/参数/采色、完整素材和文件哈希在回滚、重升、卸载、重装中保持；证据为本地 PACKED_LIFECYCLE_ALPHA13.json。

精确包哈希和成功检查见本地候选机器记录。包级数据检查不替代任何仍需用户目视确认的行为。

## 交给用户复核

代码收尾已完成；新增开关与本轮变化的真实桌面验收由用户执行。建议核对：关闭/开启/重启；R=0 选择不同项目和 About 滚动；渲染异常后的重试；两窗口修改/刷新；导出期间清理或取消。无需重做已取消专项或重新验收此前已确认的全部模板。

本机及前次官方核查仍为 DSH 0.2.0-rc.2，稳定版 0.2.0 条件没有因代码完成而变为通过。未升级宿主，未修改该条件。最终插件 2.0.0 仍等待用户最后验收与确认；本轮不将候选改为正式版。
