# 该项目已废弃，勿安装

# MEMZ-Plugin

## 📋介绍

Yunzai系列Bot插件,本插件基于TRSS-Yunzai作为开发环境,其他框架可能有不支持的地方,可提issue适配

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/MEMLTS/memz-plugin?style=social)
![GitHub forks](https://img.shields.io/github/forks/MEMLTS/memz-plugin?style=social)
![GitHub issues](https://img.shields.io/github/issues/MEMLTS/memz-plugin)
![GitHub pull requests](https://img.shields.io/github/issues-pr/MEMLTS/memz-plugin)

<img src="https://count.getloli.com/@MEMZ-Plugin?name=MEMZ-Plugin&theme=random&padding=7&offset=0&align=top&scale=1&pixelated=0&darkmode=auto" />

</div>

## 安装插件

### 安装

#### 使用GitHub安装

```bash
git clone --depth=1 https://github.com/MEMLTS/memz-plugin.git ./plugins/memz-plugin/
```

如果无法访问GitHub,可以使用**Ghproxy**进行安装

```bash
git clone --depth=1 https://ghfast.top/https://github.com/MEMLTS/memz-plugin.git ./plugins/memz-plugin/
```

#### ~~使用Gitee安装~~

### 安装依赖

```bash
pnpm install --filter=memz-plugin
```

## 使用

发送 `#MEMZ帮助`查看插件部分功能

如果需要使用API功能,请确保已开启**MEMZ-API**服务后安装API拓展包

```bash
git clone --depth=1 https://github.com/MEMLTS/memz-api.git ./plugins/memz-plugin/server/api/
```

开启MEMZ-API服务后可访问<http://ip:host/index>查看API文档

## 设置

发送 `#MEMZ设置`可进行部分功能快捷设置

完整设置请通过[锅巴面板](https://gitee.com/guoba-yunzai/guoba-plugin)或[YePanel](https://github.com/XasYer/YePanel)等管理面板进行设置

### 基础功能

| 功能 | 命令 | 权限 | 需要@ | 说明 |
|------|------|------|-------|------|
| 帮助 | #memz帮助 | 所有人 | 否 | 获取插件帮助图 |
| API帮助 | #memzapi帮助 | 所有人 | 否 | 获取API功能帮助 |
| 更新日志 | #memz更新日志 | 所有人 | 否 | 获取Git提交信息 |
| 更新插件 | #memz更新 | 主人 | 否 | 更新插件 |
| Redis状态 | #redis状态(pro) | 主人/开放 | 否 | 查看Redis状态，支持自定义ip,端口,密码 |
| 系统状态 | #系统状态(pro)(max) | 主人/开放 | 否 | 查看系统状态，不建议promax |
| 检查更新 | #memz检查更新 | 主人 | 否 | 获取最新提交并发送给主人 |
| 清空Redis | #Redis一键清空(dbx) | 主人 | 否 | 清空Redis数据库 |

### QQ功能

| 功能 | 命令 | 权限 | 需要@ | 说明 |
|------|------|------|-------|------|
| 查询Q龄 | #查q龄 | 主人/开放 | 否 | 查询QQ注册时间，支持@或QQ号 |
| 全体假禁言 | #全体假禁 | 主人 | 否 | 发送假的全体禁言提示 |

### 群聊功能

| 功能 | 命令 | 权限 | 需要@ | 说明 |
|------|------|------|-------|------|
| 一键艾特全体 | #一键召唤全体 | 主人 | 否 | 逐个@群成员，慎用 |
| 谁艾特我 | #谁艾特我 | 所有人 | 否 | 查看24小时内谁@过你 |
| 清除艾特数据 | #清理艾特数据 | 所有人 | 否 | 清理自己的被@记录 |
| 清除全部艾特数据 | #清除全部艾特数据 | 主人 | 否 | 清理群内所有@记录 |
| 一键打卡 | #一键打卡 | 主人 | 否 | 群聊打卡 |
| 群发消息 | #一键群发+内容 | 主人 | 否 | 向所有群发送消息 |
| 保存群员名单 | #保存(全部)?群员名单(+群号) | 主人 | 否 | 保存群成员列表到本地 |
| 一键禁言 | #一键加害QQ 秒 | 主人 | 否 | 在所有群禁言指定成员 |
| 私发消息 | #一键私发+内容 | 主人 | 否 | 私聊发送消息 |
| 召唤用户 | #召唤@某人(x次)?(撤回) | 主人 | 否 | 多次@指定用户 |

### 搜索功能

| 功能 | 命令 | 权限 | 需要@ | 说明 |
|------|------|------|-------|------|
| 搜索游戏 | #搜游戏+游戏关键词 | 主人/开放 | 否 | 搜索破解游戏资源 |
| 资源统计 | #资源统计 | 所有人 | 否 | 查看游戏资源统计信息 |
| 磁力搜索 | #磁力搜索+关键词 | 主人/开放 | 否 | 搜索磁力资源(不建议开启) |
| 影视搜索 | #搜影视+影视关键词 | 主人/开放 | 否 | 搜索影视资源 |
| 清理搜索缓存 | #清理搜游戏缓存 | 主人 | 否 | 清理游戏搜索缓存 |

### 网站工具

| 功能 | 命令 | 权限 | 需要@ | 说明 |
|------|------|------|-------|------|
| 网站测速 | #ping/http/tcping+网站 | 主人/开放 | 否 | 测试网站连通性 |
| SEO查询 | #seo+链接 | 主人/开放 | 否 | 查询网站SEO信息 |
| 编码解码 | #(unicode/url/ascii)(编码/解码) | 主人/开放 | 否 | 常见编码解码转换 |
| Whois查询 | #whois+域名 | 主人/开放 | 否 | 查询域名Whois信息 |
| 域名备案 | #域名备案查询+域名 | 主人/开放 | 否 | 查询域名备案信息 |
| 网页截图 | #网页截图+链接 | 主人/开放 | 否 | 获取网页截图 |
| 域名查询 | #域名查询+域名 | 主人/开放 | 否 | 查询域名注册情况 |
| HTTP状态 | #http状态查询+链接 | 主人/开放 | 否 | 查询网站HTTP状态 |
| SSL证书 | #ssl证书查询+链接 | 主人/开放 | 否 | 查询网站SSL证书 |
| 网站图标 | #网站图标+链接 | 主人/开放 | 否 | 获取网站favicon |
| IP信息 | #ipinfo + 域名/ip | 主人/开放 | 否 | 查询IP详细信息 |
| 进制转换 | #进制转换原始数 起始进制 目标进制 | 主人/开放 | 否 | 数字进制转换 |

注意：

1. "主人"权限指在 Yunzai-Bot 配置文件中设置的主人账号
2. "主人/开放"表示该功能默认主人可用，可通过配置开放给其他用户
3. 部分功能可能需要额外配置，请查看具体说明

## 交流与反馈

你可以提issue或者PR

## 免责声明

1. 功能仅限内部交流与小范围使用，严禁将 `memz-plugin` 用于任何商业用途或盈利
2. 图片与其他素材均来自于网络，仅供交流学习使用，如有侵权请联系 `197728340@qq.com`删除
3. 本插件仅用于学习交流，开发者不对因使用本插件而造成的任何损失负责

## 贡献者

> 🌟 星光闪烁，你们的智慧如同璀璨的夜空。感谢所有为 **MEMZ-Plugin** 做出贡献的人！

<img src="https://contrib.rocks/image?repo=MEMLTS/memz-plugin" />

![Alt](https://repobeats.axiom.co/api/embed/0eea68609d581f6655d5dba90c5cd07ae2495084.svg "Repobeats analytics image")

## 鸣谢

- [ChatGPT](https://chatgpt.com)
- [ws-plugin](https://gitee.com/xiaoye12123/ws-plugin)
- [TRSS-Yunzai](../../TimeRainStarSky/Yunzai)
- [Yunzai-Bot](https://gitee.com/Le-niao/Yunzai-Bot)
