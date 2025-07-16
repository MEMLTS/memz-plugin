# MEMZ-Plugin API 文档

## API 说明
MEMZ-Plugin 提供了一系列 HTTP API 接口。所有接口均返回 JSON 格式数据(除特殊说明)。

## API文档
- 接口: `/index`
- 方法: `GET`
- 说明: 获取所有API接口的文档信息

## Mail 相关接口

### 发送邮件
- 接口: `/mail/send`
- 方法: `POST`
- 参数:
  - `mailId`: 邮箱ID(可选,默认使用配置中的smtpMailId)
  - `to`: 收件人邮箱
  - `subject`: 邮件主题(可选)
  - `content`: 邮件内容
- 说明: 发送邮件

## One 相关接口

### 一言API
- 接口: `/one/yiyan`
- 方法: `GET`
- 参数:
  - `type`: text/json 返回格式
- 说明: 随机返回一条句子

## Qq 相关接口

### Gfs 相关接口

#### 群文件信息
- 接口: `/qq/gfs/df`
- 方法: `GET`
- 参数:
  - `group`: 需要查询的群号
- 说明: 获取群文件信息

#### 群文件目录
- 接口: `/qq/gfs/dir`
- 方法: `GET`
- 参数:
  - `group`: 需要查询的群号
  - `pid`: 需要查询的文件ID
- 说明: 获取群文件目录

#### 群文件下载
- 接口: `/qq/gfs/download`
- 方法: `GET`
- 参数:
  - `group`: 需要查询的群号
  - `fid`: 需要查询的文件ID
- 说明: 下载群文件

### Info 相关接口

#### QQ注册时间查询
- 接口: `/qq/info/age`
- 方法: `GET`
- 参数:
  - `qq`: QQ号码
- 说明: QQ注册时间查询

#### QQ信息查询
- 接口: `/qq/info/info`
- 方法: `GET`
- 参数:
  - `qq`: QQ号
- 说明: QQ信息查询

#### QQ音乐分享卡片
- 接口: `/qq/info/music`
- 方法: `POST`
- 参数:
  - `type`: 类型
  - `title`: 标题
  - `content`: 内容
  - `singer`: 歌手
  - `image`: 图片
- 说明: QQ音乐分享卡片

#### QQ头像查询
- 接口: `/qq/info/qlogo`
- 方法: `GET`
- 参数:
  - `qq`: QQ号码
- 说明: QQ头像查询

## Search 相关接口

### 磁力搜索
- 接口: `/search/cili`
- 方法: `GET`
- 参数:
  - `key`: 需要搜索的关键词
- 说明: 搜索磁力资源

### 游戏搜索
- 接口: `/search/game`
- 方法: `GET`
- 参数:
  - `key`: 需要搜索的关键词
- 说明: 搜索游戏资源

## Steam 相关接口

### Steam 热门游戏榜单
- 接口: `/steam/hot`
- 方法: `GET`
- 参数:
  - `type`: text/json 返回格式
- 说明: 获取 Steam 热门游戏排行

## Tools 相关接口

### 跳转
- 接口: `/tools/new`
- 方法: `GET`
- 参数:
  - `url`: 需要跳转的URL
- 说明: URL重定向

## Webtool 相关接口

### ICP备案查询
- 接口: `/webtool/icp`
- 方法: `GET`
- 参数:
  - `domain`: 需要查询的域名
- 说明: ICP备案查询

### Ip 相关接口

#### Info 相关接口

##### IP查询-CIPCC
- 接口: `/webtool/ip/info/cipcc`
- 方法: `GET`
- 参数:
  - `ip`: 需要查询的IP
- 说明: 查询IP地址的信息

### SEO查询
- 接口: `/webtool/seo`
- 方法: `GET`
- 参数:
  - `url`: 需要查询的URL
- 说明: SEO查询

### Whois查询
- 接口: `/webtool/whois`
- 方法: `GET`
- 参数:
  - `domain`: 需要查询的域名
- 说明: Whois查询

## 通用说明

1. 所有接口返回数据格式(除特殊说明外):
```json
{
    "code": 0,        // 状态码,0表示成功
    "message": "",    // 状态信息
    "title": "",      // 接口标题
    "time": "",       // 响应时间
    "data": {},       // 数据主体
    "copyright": ""   // 版权信息
}
```

2. 常见错误码:
- 200: 请求成功
- 400: 请求参数错误
- 404: 未找到相关数据
- 405: 请求方法不允许
- 500: 服务器内部错误

3. 所有接口支持跨域访问(CORS)
