# 学习数据回归测试

在项目根目录运行：

```sh
node --experimental-vm-modules --test frontend/tests/study-regressions.test.cjs
```

需要支持 `node:test` 的 Node.js 和 Vue 3。测试依次从 `VUE_RUNTIME_DIR` 指定的项目目录、`frontend`、本机 HBuilderX 的 `uniapp-cli-vite` 目录解析 Vue。例如已有 Vue 项目可使用：

```sh
VUE_RUNTIME_DIR=/absolute/path/to/vue-project node --experimental-vm-modules --test frontend/tests/study-regressions.test.cjs
```

测试通过 Node VM 加载实际 composable、校验器和页面脚本，使用真实 Vue 响应式运行时。只替换 uni 存储、事件、时钟和 API 边界；不连接数据库，不修改 App 的持久化数据。Node 的 VM Modules 实验性提示不表示测试失败。

18 项测试覆盖：

- 首次同步、账号隔离、失败重试、旧请求返回、并发上传、旧版数据归属迁移。
- 手工答案完整性、数字/公式/英文答案显示、过期翻译响应隔离。
- 到期卡片自动刷新与计时器停止。
- 错误备份拒绝、写入失败回滚、旧版可选字段兼容。
- 恢复后的任务、卡片、个人资料、学习时长与计时器状态，以及恢复后继续编辑。

浏览器流程及截图见 [修复验证报告](../../.gstack/qa-reports/2026-09-19-fixes/report.md)。
