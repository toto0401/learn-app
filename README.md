# 辅助学习 APP

uni-app 前端与 FastAPI 后端，提供资料搜索、翻译、单词卡、学习规划与账号功能。

用 HBuilderX 打开 `frontend/`。后端安装、MySQL 建库及运行见 `backend/README.md`。
首次运行必须复制 `backend/.env.example` 到 `backend/.env`，填写数据库密码、独立随机 `SECRET_KEY` 和自己的短信服务配置。
真实密钥、本地上传头像、构建产物及打包文件均不包含在此源码副本中。

## 前端验证

`node --experimental-vm-modules --test frontend/tests/study-regressions.test.cjs`

## 后端验证

在 `backend/` 中，使用本地测试环境变量运行 `pytest`，测试不发送真实短信。
