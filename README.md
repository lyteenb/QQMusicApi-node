## 感谢 [fovepig](https://github.com/fovepig) 对本项目的帮助和支持*★,°*:.☆(￣▽￣)/$:*.°★* 。

## 使用AI声明

本项目代码主要由 AI 修改与整理，大概率存在不稳定、不完善或潜在问题。使用前请自行检查、测试并承担可能风险。😔

## QQmusic-API 当前改动

- QQ 音乐 API 已由原 Python 版迁移为 Node.js/TypeScript 版。
- 支持 QQ 音乐扫码登录。
- 支持搜索、歌词、歌单、播放地址、VIP 判断和试听片段。
- 登录凭证由调用方传入，不作为服务端共享登录态保存。
- 默认服务端口为 8899。

## QQmusic-API 启动方式

安装依赖：

    pnpm install

构建项目：

    pnpm -r build

进入 Web 服务目录并启动：

    cd packages/web
    node dist/index.js

默认服务地址：

    http://127.0.0.1:8899
    
## 免责声明
本项目仅用于学习、研究与个人使用，请勿用于商业用途或任何违反相关法律法规、平台规则的场景。项目中涉及的内容版权归原版权方所有，使用者应自行承担使用本项目所产生的相关风险与责任。
请尊重版权，支持正版。

## 致谢
感谢原作者及相关开源项目、社区贡献者提供的思路与基础实现。本项目在此基础上做了一些调整、迁移和功能适配。
<div align="center">
    <a>
        <img src="https://socialify.git.ci/L-1124/QQMusicApi/image?font=JetBrains+Mono&language=1&name=1&pattern=Transparent&theme=Auto&logo=https%3A%2F%2Fraw.githubusercontent.com%2FL-1124%2FQQMusicApi%2Frefs%2Fheads%2Fmain%2Fassets%2Fqq-music.svg" alt="QQMusicApi" width="640" height="320" />
    </a>
    <br/>
    <a href="https://www.python.org">
        <img src="https://img.shields.io/badge/Python-3.10|3.11|3.12|3.13|3.14-blue" alt="Python">
    </a>
    <a href="https://github.com/l-1124/QQMusicApi/blob/main/LICENSE">
        <img src="https://img.shields.io/github/license/l-1124/QQMusicApi" alt="GitHub license">
    </a>
    <a href="https://github.com/l-1124/QQMusicApi/stargazers">
        <img src="https://img.shields.io/github/stars/l-1124/QQMusicApi?color=yellow&label=Github%20Stars" alt="STARS">
    </a>
    <a href="https://github.com/l-1124/QQMusicApi/actions/workflows/testing.yml">
        <img src="https://github.com/l-1124/QQMusicApi/actions/workflows/testing.yml/badge.svg?branch=main" alt="Testing">
    </a>
    <a href="https://deepwiki.com/luren-dc/QQMusicApi">
        <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki">
    </a>
</div>

---

> [!IMPORTANT]
> **音乐平台不易, 请尊重版权, 支持正版**。

---

## 📚 快速链接

* **[📖 完整文档](https://l-1124.github.io/QQMusicApi)**

## 📖 介绍

使用 Python 编写的用于调用 [QQ音乐](https://y.qq.com/) 各种 API 的库。

## ✨ 项目特色

* 🎵 涵盖常见 API
* 🚀 调用简便，函数命名易懂，代码注释详细
* ⚡ 完全异步操作

## 📄 许可证

本项目当前采用 **[GNU General Public License v3.0 or later](https://github.com/l-1124/QQMusicApi/blob/main/LICENSE)**。

本项目仅用于对技术可行性的探索及研究，请勿将其用于任何商业用途或侵犯版权的行为。

## ⚠️ 免责声明

由于使用本项目产生的包括由于本协议或由于使用或无法使用本项目而引起的任何性质的任何直接、间接、特殊、偶然或结果性损害（包括但不限于因商誉损失、停工、计算机故障或故障引起的损害赔偿，或任何及所有其他商业损害或损失）由使用者负责。

## 👥 贡献者

[![Contributor](https://contrib.rocks/image?repo=l-1124/QQMusicApi)](https://github.com/l-1124/QQMusicApi/graphs/contributors)
