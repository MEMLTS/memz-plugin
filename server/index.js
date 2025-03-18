import logger from './lib/logger.js'
import express from 'express'
import http from 'http'
import https from 'https'
import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { pathToFileURL } from 'url'
import Redis from 'ioredis'
import cors from 'cors'
import { PluginPath, isFramework } from '../components/Path.js'
import Config from '../components/Config.js'
import { RedisConfig } from '../components/Redis.js'
import { generateMarkdownDocs, clearApiDocsCache } from './model/apiDocs.js'
import chokidar from 'chokidar'
// 本地调试函数，471行使用
// import setupDebugRoutes from './tools/route-debugger.js'

// 导入前端页面处理函数
import { web } from './web/index.js'

const config = Config.getConfig('api')
const app = express()

// 创建Redis客户端
let redis = null
let redisAvailable = false

// 初始化Redis连接
async function initRedis () {
  if (!config.redisEnabled) {
    logger.info(chalk.yellow('[Redis] Redis功能已禁用'))
    return
  }

  try {
    redis = new Redis({
      host: config.redisHost || RedisConfig.host || 'localhost',
      port: config.redisPort || RedisConfig.port || 6379,
      username: config.redisUsername || RedisConfig.username || '',
      password: config.redisPassword || RedisConfig.password || '',
      db: config.redisDB || RedisConfig.db || 2,
      connectTimeout: 5000, // 5秒连接超时
      retryStrategy: (times) => {
        if (times > 3) {
          return false // 3次重试后放弃
        }
        return Math.min(times * 1000, 3000)
      }
    })

    redis.on('connect', () => {
      redisAvailable = true
      logger.info(chalk.green('[Redis] 连接成功'))
    })

    redis.on('error', (err) => {
      redisAvailable = false
      logger.warn(chalk.yellow(`[Redis] 连接失败: ${err.message}`))
      logger.warn(chalk.yellow('[Redis] 统计功能将被禁用'))
    })

    // 测试连接
    await redis.ping()
    redisAvailable = true
  } catch (err) {
    redisAvailable = false
    logger.warn(chalk.yellow(`[Redis] 初始化失败: ${err.message}`))
    logger.warn(chalk.yellow('[Redis] 统计功能将被禁用'))
  }
}

const apiHandlersCache = {}
const loadStats = { success: 0, failure: 0, totalTime: 0, routeTimes: [], skipped: 0 }
const REDIS_STATS_KEY = 'MEMZ/API'

// 开发模式监听器
let watcher = null

// 重载单个API模块
async function reloadApiModule (filePath) {
  try {
    const relativePath = path.relative(path.join(PluginPath, 'server', 'api'), filePath)
    // 使用 path.posix 确保路径分隔符统一为 /
    const route = '/' + relativePath.replace(/\\/g, '/').replace(/\.js$/, '')
    const normalizedRoute = route.replace(/\/+/g, '/')

    // 清除模块缓存和旧路由
    const moduleUrl = pathToFileURL(filePath).href
    delete apiHandlersCache[normalizedRoute]
    clearApiDocsCache()

    // 尝试移除现有路由
    app._router.stack = app._router.stack.filter(layer => {
      if (layer.route && layer.route.path === normalizedRoute) {
        logger.info(chalk.yellow(`[DEV] 移除已存在的路由: ${normalizedRoute}`))
        return false
      }
      return true
    })

    // 重新加载模块
    const startTime = Date.now()
    const handlerModule = await import(`${moduleUrl}?update=${Date.now()}`)
    const handler = handlerModule.default

    if (typeof handler === 'function') {
      apiHandlersCache[normalizedRoute] = handler
      const loadTime = Date.now() - startTime

      // 注册路由
      const method = handlerModule.method || 'GET'
      const lowercaseMethod = method.toLowerCase()

      if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(lowercaseMethod)) {
        app[lowercaseMethod](normalizedRoute, async (req, res) => {
          try {
            await handler(req, res)
          } catch (err) {
            logger.error(`[API错误] ${normalizedRoute}: ${err.message}`)
            res.status(500).json({ error: '服务器内部错误', message: err.message })
          }
        })
        logger.info(chalk.green(`[DEV] 注册路由: ${lowercaseMethod.toUpperCase()} ${normalizedRoute}`))
      } else {
        app.get(normalizedRoute, async (req, res) => {
          try {
            await handler(req, res)
          } catch (err) {
            logger.error(`[API错误] ${normalizedRoute}: ${err.message}`)
            res.status(500).json({ error: '服务器内部错误', message: err.message })
          }
        })
        logger.info(chalk.green(`[DEV] 注册路由: GET ${normalizedRoute} (默认)`))
      }

      logger.info(chalk.green(`[DEV] 重载模块成功: ${normalizedRoute}`))
      logger.info(chalk.blue(`[DEV] 重载耗时: ${loadTime}ms`))

      // 输出模块信息
      const moduleInfo = {
        title: handlerModule.title,
        method: handlerModule.method || 'GET',
        params: handlerModule.key || {},
        description: handlerModule.description
      }
      logger.info(chalk.cyan('[DEV] 模块信息:'))
      logger.info(chalk.cyan(JSON.stringify(moduleInfo, null, 2)))

      // 重新生成文档
      const apiDoc = await generateMarkdownDocs()
      await fs.writeFile(path.join(PluginPath, 'API.md'), apiDoc, 'utf8')
    } else {
      logger.warn(chalk.yellow(`[DEV] 模块 ${normalizedRoute} 未导出有效的处理函数`))
    }
  } catch (error) {
    logger.error(chalk.red(`[DEV] 重载模块失败: ${error.message}`))
    logger.error(chalk.red(error.stack))
  }
}

// 启动开发模式监听
function startDevMode () {
  const apiDir = path.join(PluginPath, 'server', 'api')

  logger.info(chalk.green('[DEV] 开发模式已启动'))
  logger.info(chalk.blue(`[DEV] 监听目录: ${apiDir}`))

  watcher = chokidar.watch(apiDir, {
    ignored: /(^|[/\\])\../, // 忽略隐藏文件
    persistent: true,
    ignoreInitial: true
  })

  watcher
    .on('change', async filePath => {
      logger.info(chalk.yellow(`[DEV] 检测到文件变更: ${filePath}`))
      await reloadApiModule(filePath)
    })
    .on('add', async filePath => {
      logger.info(chalk.yellow(`[DEV] 检测到新文件: ${filePath}`))
      await reloadApiModule(filePath)
    })
    .on('unlink', async filePath => {
      const relativePath = path.relative(apiDir, filePath)
      const route = '/' + relativePath.replace(/\\/g, '/').replace(/\.js$/, '')

      delete apiHandlersCache[route]
      logger.info(chalk.yellow(`[DEV] 移除模块: ${route}`))

      // 重新生成文档
      const apiDoc = await generateMarkdownDocs()
      await fs.writeFile(path.join(PluginPath, 'API.md'), apiDoc, 'utf8')
      logger.info(chalk.green('[DEV] API文档已更新'))
    })
    .on('error', error => {
      logger.error(chalk.red(`[DEV] 监听错误: ${error}`))
    })
}

// 停止开发模式监听
function stopDevMode () {
  if (watcher) {
    watcher.close()
    watcher = null
    logger.info(chalk.yellow('[DEV] 开发模式已停止'))
  }
}

// 生成Token
if (config.token === '') {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const length = 32 // 32是不是有点大?
  logger.warn(chalk.yellow('[Token] Token 未设置，将自动生成一个随机 Token'))
  let token = ''
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  Config.modify('api', 'token', token)
}

// 更新请求统计的函数改为可选
const updateRequestStats = async (ip, route) => {
  if (!redisAvailable) return

  const normalizedIp = ip.replace(/:/g, '.')
  const ipKey = `${REDIS_STATS_KEY}:Stats:${normalizedIp}`

  try {
    const pipeline = redis.multi()
    pipeline.hincrby(ipKey, route, 1)
    pipeline.hincrby(ipKey, 'total', 1)

    if (config.redisExpire > 0) {
      pipeline.expire(ipKey, config.redisExpire)
    }

    await pipeline.exec()
  } catch (err) {
    logger.debug(`[请求统计] Redis更新失败: ${err.message}`)
  }
}

// 修改鉴权检查函数
export const checkAuthAndBlacklist = async (req, res, token) => {
  const ip = req.headers['x-forwarded-for'] || req.ip

  // 如果Redis不可用,只检查token
  if (!redisAvailable) {
    if (token !== config.token) {
      return res.status(401).json({ error: '无效的访问令牌' })
    }
    return true
  }

  // Redis可用时
  try {
    // IP黑名单检查
    const blacklisted = await redis.sismember(`${REDIS_STATS_KEY}:blacklistedIPs`, ip)
    if (blacklisted) {
      return res.status(403).json({ error: '您的IP已被黑名单限制访问' })
    }

    // 检查失败次数
    const failKey = `${REDIS_STATS_KEY}:fail_attempts:${ip}`
    const failData = await redis.hgetall(failKey)

    // 获取失败次数
    let failCount = 0
    if (failData && failData.count) {
      failCount = parseInt(failData.count, 10)
    }

    // 如果失败次数达到设定次数且时间在设定窗口内，则返回限制
    if (failCount >= config.maxFailAttempts && Date.now() - failData.timestamp < config.timeWindow) {
      return res.status(403).json({
        error: `多次失败尝试，您的IP已被临时限制访问（超过 ${config.maxFailAttempts} 次失败，限制时长 ${config.timeWindow / 1000 / 60} 分钟）`
      })
    }

    // token 验证
    if (token !== config.token) {
      if (failData) {
        failCount = failCount + 1
        await redis.hset(failKey, 'count', failCount, 'timestamp', Date.now())
      } else {
        await redis.hset(failKey, 'count', 1, 'timestamp', Date.now())
      }

      return res.status(401).json({ error: '无效的访问令牌' })
    }

    if (failData) {
      await redis.del(failKey)
    }

    return true
  } catch (err) {
    // Redis出错时只检查token
    logger.debug(`[鉴权检查] Redis操作失败: ${err.message}`)
    if (token !== config.token) {
      return res.status(401).json({ error: '无效的访问令牌' })
    }
    return true
  }
}

// 请求日志记录中间件
const requestLogger = async (req, res, next) => {
  const startTime = Date.now()

  let ip = req.ip
  if (config.cdn) {
    ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip
  }

  // 处理多个 X-Forwarded-For 头部中的多个 IP 地址，取最右边的 IP
  if (ip && ip.includes(',')) {
    ip = ip.split(',').pop().trim()
  }

  // 如果 IP 是 IPv6 映射的 IPv4 地址，去掉 "::ffff:" 前缀
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '')
  }

  // 黑名单和白名单检查
  if (config.blacklistedIPs.includes(ip)) {
    logger.warn(`[黑名单 IP] ${ip}`)
    return res.status(403).send('403 禁止访问：您的 IP 已被列入黑名单')
  }

  if (config.whitelistedIPs.length > 0 && !config.whitelistedIPs.includes(ip)) {
    return res.status(403).send('403 禁止访问：您的 IP 不在白名单中')
  }

  const route = req.path
  logger.debug(`[请求调试] 收到请求: IP=${ip}, URL=${req.url}, Method=${req.method}, Headers=${JSON.stringify(req.headers)}`)

  // 记录请求日志
  const log = [`[请求日志] IP: ${ip} 路由: ${route}`]
  if (Object.keys(req.query).length > 0) {
    const paramString = Object.entries(req.query).map(([key, value]) => `${key}:${value}`).join(',')
    log.push(`参数: ${paramString}`)
  }
  logger.info(log.join(' '))
  await updateRequestStats(ip, route)

  // 监控响应完成时间
  res.on('finish', () => {
    const endTime = Date.now()
    logger.info(`[请求完成] IP: ${ip} 路由: ${route} 响应时间: ${endTime - startTime}ms`)
  })

  next()
}

// 获取公网 IP
async function getPublicIP () {
  const apiUrls = [
    'https://v4.ip.zxinc.org/info.php?type=json',
    'https://ipinfo.io/json'
  ]

  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(apiUrl)
      const data = await response.json()
      const ip = apiUrl === 'https://v4.ip.zxinc.org/info.php?type=json'
        ? data?.data?.myip
        : data?.ip

      logger.debug(`从 ${apiUrl} 获取的公网 IP: ${ip}`)

      if (ip) {
        return ip
      } else {
        logger.debug(`未从 ${apiUrl} 获取到公网 IP`)
      }
    } catch (error) {
      logger.error(`无法从 ${apiUrl} 获取公网 IP`, error)
    }
  }

  logger.debug('所有 API 请求都失败，返回空的公网 IP')
  return ''
}

// 获取本地IP
const getLocalIPs = async () => {
  const localIPs = Object.values(os.networkInterfaces())
    .flat()
    .filter((details) => details.family === 'IPv4' || details.family === 'IPv6')
    .map((details) => details.address)

  const publicIP = await getPublicIP()

  return {
    local: localIPs,
    public: publicIP
  }
}

// 注册所有应用级中间件
app.set('trust proxy', config.cdn)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 配置CORS
if (config.corsenabled) {
  app.use(cors({
    origin: config.corsorigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
}

// 请求日志中间件
app.use(requestLogger)

const apiRouter = express.Router()

export async function startServer () {
  try {
    await initRedis()

    const startTime = Date.now()

    // 基础路由注册
    app.get('/', (req, res) => web(req, res))
    app.get('/health', (req, res) => res.json({ status: '服务正常', time: new Date().toLocaleString() }))
    app.get('/favicon.ico', async (req, res) => {
      try {
        const faviconPath = path.join(PluginPath, 'server', 'favicon.ico')
        const favicon = await fs.readFile(faviconPath)
        res.setHeader('Content-Type', 'image/x-icon').send(favicon)
      } catch (err) {
        res.status(404).send('404 未找到：favicon.ico')
      }
    })

    // 统计信息路由
    app.get('/stats', async (req, res) => {
      if (!redisAvailable) {
        return res.status(503).json({ error: 'Redis 不可用，无法获取统计信息' })
      }

      try {
        // 获取所有IP统计键
        const keys = await redis.keys(`${REDIS_STATS_KEY}:Stats:*`)
        const allStats = {}

        // 遍历所有IP统计数据
        for (const key of keys) {
          const ip = key.split(':').pop()
          const stats = await redis.hgetall(key)
          allStats[ip] = stats
        }

        res.json({
          message: '获取统计数据成功',
          stats: allStats
        })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    // 设置调试路由,非本地调试不建议使用
    // setupDebugRoutes(app)

    // API路由器挂载 - 确保在加载API前挂载
    app.use('/api', apiRouter)

    // 加载API模块
    const apiDir = path.join(PluginPath, 'server', 'api')
    await loadApiHandlersRecursively(apiDir)

    loadStats.totalTime = Date.now() - startTime

    // 验证路由加载
    const routes = app._router.stack
      .filter(layer => layer.route)
      .map(layer => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }))

    logger.debug(chalk.cyan(`直接注册的路由数量: ${routes.length}`))

    // 输出API路由器中的路由
    const apiRoutes = apiRouter.stack
      .filter(layer => layer.route)
      .map(layer => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }))

    logger.debug(chalk.cyan(`API路由器中的路由数量: ${apiRoutes.length}`))

    logger.info(chalk.greenBright('**********************************'))
    logger.info(chalk.green('MEMZ-API 服务载入完成'))
    logger.info(chalk.greenBright(`成功加载：${loadStats.success} 个`))
    logger.info(chalk.yellowBright(`加载失败：${loadStats.failure} 个`))
    logger.info(chalk.greenBright(`黑名单列表：${loadStats.skipped || 0} 个`))
    logger.info(chalk.cyanBright(`总耗时：${loadStats.totalTime} 毫秒`))
    loadStats.routeTimes.forEach(({ route, time }) => {
      logger.info(chalk.magentaBright(`路由: ${route}, 加载时间: ${time}ms`))
    })
    logger.info(chalk.greenBright('**********************************'))

    // 拼写纠正中间件
    app.use((req, res, next) => {
      const commonTypos = {
        '/text': '/test',
        '/debug/routes': '/api/debug/routes'
      }

      if (commonTypos[req.path]) {
        logger.info(`[自动纠正] 将 ${req.path} 重定向到 ${commonTypos[req.path]}`)
        return res.redirect(commonTypos[req.path])
      }

      next()
    })

    // 404处理器
    app.use((req, res) => {
      logger.warn(`[404] 路由不存在: ${req.path}`)
      res.status(404).json({
        code: 404,
        message: '接口不存在',
        path: req.path
      })
    })

    // 错误处理中间件
    app.use((err, req, res, next) => {
      logger.error(`[服务器错误] ${err.message}`)
      logger.error(err.stack)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        error: err.message
      })
    })

    // 生成API文档
    const apiDoc = await generateMarkdownDocs()
    await fs.writeFile(path.join(PluginPath, 'API.md'), apiDoc, 'utf8')

    // 启动开发模式
    if (config.dev) {
      startDevMode()
    }

    // 创建HTTP/HTTPS服务器
    let server
    if (config.httpsenabled) {
      const httpsOptions = {
        key: await fs.readFile(config.httpskey),
        cert: await fs.readFile(config.httpscert)
      }
      server = https.createServer(httpsOptions, app)
    } else {
      server = http.createServer(app)
    }

    // 启动服务器
    server.listen(config.port, config.host || '0.0.0.0', async () => {
      const protocol = config.httpsenabled ? 'https' : 'http'

      try {
        const result = await getLocalIPs()
        logger.info('############################################################')
        logger.info(chalk.greenBright('MEMZ-API 已使用 ' + (config.httpsenabled ? 'HTTPS' : 'HTTP') + ' 协议启动'))
        logger.info(chalk.blueBright('- 公网 IP 地址 '))
        logger.info(chalk.yellowBright(`- ${protocol}://${result.public}:${config.port}`))

        if (result.local.length > 0) {
          const ipv4 = result.local.filter((ip) => !ip.includes(':'))
          const ipv6 = result.local.filter((ip) => ip.includes(':'))

          if (ipv4.length > 0) {
            logger.info(chalk.magentaBright('- 本地 IPv4 地址'))
            ipv4.forEach((ip) => {
              const formattedIP = ip.includes(':') ? `[${ip}]` : ip
              logger.info(chalk.yellowBright(`- ${protocol}://${formattedIP}:${config.port}`))
            })
          }
          if (ipv6.length > 0) {
            logger.info(chalk.cyanBright('- 本地 IPv6 地址'))
            ipv6.forEach((ip) => {
              const formattedIP = ip.includes(':') ? `[${ip}]` : ip
              logger.info(chalk.yellowBright(`- ${protocol}://${formattedIP}:${config.port}`))
            })
          }
        }
        if (config.apidomain) {
          let apidomain = config.apidomain.startsWith('http') ? config.apidomain.replace(/^https?:\/\//, '') : config.apidomain
          if (apidomain === 'localhost' || apidomain === '127.0.0.1') {
            apidomain += `:${config.port}`
          }
          logger.info(chalk.magenta('- 自定义域名'))
          logger.info(chalk.yellowBright(`- ${protocol}://${apidomain}`))
          logger.info('############################################################')
        }
      } catch (error) {
        logger.error(chalk.red('获取本地 IP 地址时出错:', error))
      }
    })

    // 关闭处理
    process.on('SIGINT', () => {
      stopDevMode()
      server.close()
      process.exit()
    })

    return server
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.error(`文件未找到: ${error.path}。请检查配置文件中的路径是否正确。`)
    } else {
      logger.error(`启动服务器时发生错误: ${error.message}`)
      logger.error(error.stack)
    }
  }
}

// 加载 API 服务
const loadApiHandler = async (filePath, routePrefix = '') => {
  try {
    const routePath = path.basename(filePath, '.js')
    // 构建API路由路径，确保格式正确
    let route
    if (!routePrefix || routePrefix === '/') {
      route = `/${routePath}`
    } else {
      route = `${routePrefix}/${routePath}`
    }

    // 确保路由以 / 开头并规范化
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`
    // 进一步规范化，避免连续斜杠
    const cleanedRoute = normalizedRoute.replace(/\/+/g, '/')

    const startTime = Date.now()

    if (!global.apiList) {
      global.apiList = []
    }

    // 黑名单API
    if (config.blackApiList.includes(cleanedRoute)) {
      logger.info(chalk.yellow(`API加载跳过[黑名单]: ${cleanedRoute}`))
      loadStats.skipped = (loadStats.skipped || 0) + 1
      return
    }

    const handlerModule = await import(pathToFileURL(filePath))
    const handler = handlerModule.default

    if (typeof handler === 'function') {
      apiHandlersCache[cleanedRoute] = handler
      global.apiList.push({ path: cleanedRoute, title: handlerModule.title || null })

      // 获取模块支持的方法
      const method = handlerModule.method || 'GET'
      const lowercaseMethod = method.toLowerCase()

      // 定义API路径（去掉前导斜杠，因为apiRouter已挂载在/api下）
      // 处理路径以适应apiRouter
      const apiPath = cleanedRoute.startsWith('/') ? cleanedRoute.substring(1) : cleanedRoute

      // 调试日志
      logger.debug(chalk.gray(`注册API: 文件=${path.basename(filePath)}, 路径前缀=${routePrefix}, 最终路径=${apiPath}`))

      // 确保是有效的HTTP方法
      if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(lowercaseMethod)) {
        logger.warn(chalk.yellow(`无效的HTTP方法 ${method} 用于路由 ${cleanedRoute}，将默认使用GET`))

        // 注册到apiRouter
        apiRouter.get(apiPath, async (req, res) => {
          try {
            await handler(req, res)
          } catch (err) {
            logger.error(`[API错误] ${cleanedRoute}: ${err.message}`)
            res.status(500).json({ error: '服务器内部错误', message: err.message })
          }
        })

        // 同时注册一个不带前缀的路由用于调试
        app.get(`/api/${apiPath}`, async (req, res) => {
          try {
            await handler(req, res)
          } catch (err) {
            logger.error(`[API错误] ${cleanedRoute}: ${err.message}`)
            res.status(500).json({ error: '服务器内部错误', message: err.message })
          }
        })

        logger.info(chalk.blue(`注册API路由: GET /api/${apiPath}`))
      } else {
        // 注册到apiRouter
        apiRouter[lowercaseMethod](apiPath, async (req, res) => {
          try {
            await handler(req, res)
          } catch (err) {
            logger.error(`[API错误] ${cleanedRoute}: ${err.message}`)
            res.status(500).json({ error: '服务器内部错误', message: err.message })
          }
        })

        // 同时注册一个不带前缀的路由用于调试
        app[lowercaseMethod](`/api/${apiPath}`, async (req, res) => {
          try {
            await handler(req, res)
          } catch (err) {
            logger.error(`[API错误] ${cleanedRoute}: ${err.message}`)
            res.status(500).json({ error: '服务器内部错误', message: err.message })
          }
        })

        logger.info(chalk.blue(`注册API路由: ${lowercaseMethod.toUpperCase()} /api/${apiPath}`))
      }

      const loadTime = Date.now() - startTime
      loadStats.routeTimes.push({ route: cleanedRoute, time: loadTime })

      // 加载成功
      logger.info(chalk.blueBright(`API加载完成 路由: ${cleanedRoute}, 耗时: ${loadTime}ms`))
      loadStats.success++
    } else {
      // 无效文件
      logger.warn(chalk.yellow(`API服务跳过无效文件: ${filePath}`))
      loadStats.failure++
    }
  } catch (err) {
    // 捕获错误的堆栈信息
    const stackTrace = err.stack ? err.stack.split('\n') : []
    stackTrace.forEach(line => {
      if (line.includes('at ')) {
        logger.error(chalk.red(`错误位置: ${line}`))
      }
    })

    logger.error(`[加载调试] 错误详情:\n${err.stack}`)
    loadStats.failure++
  }
}

// 递归加载 API 服务
const loadApiHandlersRecursively = async (directory, routePrefix = '') => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    const loadPromises = entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        const dirName = entry.name

        let newPrefix
        if (!routePrefix || routePrefix === '/') {
          newPrefix = `/${dirName}`
        } else {
          newPrefix = `${routePrefix}/${dirName}`
        }

        // 规范化处理
        const normalizedPrefix = newPrefix.replace(/\/+/g, '/')

        logger.debug(chalk.gray(`处理API子目录: ${dirName}, 路径前缀: ${normalizedPrefix}`))

        return loadApiHandlersRecursively(fullPath, normalizedPrefix)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        return loadApiHandler(fullPath, routePrefix)
      }
    })
    await Promise.all(loadPromises)
  } catch (err) {
    logger.error(chalk.red(`加载API目录失败: ${directory} - ${err.message}`))
  }
}

// 如果是单跑就直接启动服务器
if (!isFramework) {
  startServer()
}
