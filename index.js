import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import Config from './components/Config.js'

const { enabled } = Config.getConfig('api')

// 启动API服务
if (enabled) {
  import('./server/index.js')
    .then(module => {
      const startServer = module.startServer
      startServer()
    })
    .catch(err => {
      logger.error(chalk.red('[memz-plugin] 加载 MEMZ-API 服务失败:', err))
    })
} else {
  logger.warn(chalk.cyan('[memz-plugin] MEMZ-API服务未启用'))
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appsDir = path.join(__dirname, 'apps')

// 彩色分隔线
const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
const coloredDashes = Array.from({ length: 23 }, () => {
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  return chalk[randomColor]('*')
}).join('')

// 加载统计
const startTime = Date.now()
const apps = {}
let successCount = 0
let failureCount = 0

logger.info(chalk.cyan('MEMZ插件载入中...'))

async function scanDirectory (directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const tasks = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      tasks.push(...(await scanDirectory(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      tasks.push({
        name: path.basename(entry.name, '.js'),
        filePath: pathToFileURL(fullPath).href
      })
    }
  }

  return tasks
}

async function loadModule (name, filePath) {
  const loadStartTime = Date.now()
  try {
    const moduleExports = await import(filePath)

    // 获取所有导出的类
    const exportedClasses = Object.values(moduleExports).filter(exp => {
      return typeof exp === 'function' &&
             exp.prototype &&
             exp.prototype.constructor &&
             exp.prototype instanceof plugin
    })

    if (exportedClasses.length === 0) {
      // 如果没有继承自plugin的类,使用默认导出或第一个导出
      const defaultExport = moduleExports?.default || moduleExports[Object.keys(moduleExports)[0]]
      if (!defaultExport) {
        logger.debug(`[memz-plugin] 模块 ${name} 没有有效的导出内容`)
        return
      }
      apps[name] = defaultExport
      const loadTime = Date.now() - loadStartTime
      logger.debug(chalk.green(`[memz-plugin] 成功载入模块：${name}，耗时 ${loadTime}ms`))
      successCount++
    } else {
      // 如果有多个继承自plugin的类,都加载
      exportedClasses.forEach((ExportedClass, index) => {
        const className = ExportedClass.name
        const key = exportedClasses.length === 1 ? name : `${name}_${className}`
        apps[key] = ExportedClass
      })
      const loadTime = Date.now() - loadStartTime
      logger.debug(chalk.green(`[memz-plugin] 成功载入模块：${name} (${exportedClasses.length} 个插件类)，耗时 ${loadTime}ms`))
      successCount += exportedClasses.length
    }
  } catch (error) {
    logger.error(chalk.red(`[memz-plugin] 加载模块失败：${name}`))
    logger.error(error)
    failureCount++
  }
}

try {
  const modules = await scanDirectory(appsDir)
  logger.debug(`[memz-plugin] 发现模块：${modules.length} 个`)

  // 加载
  await Promise.all(
    modules.map(({ name, filePath }) => loadModule(name, filePath))
  )

  // 加载统计
  const endTime = Date.now()
  const elapsedTime = endTime - startTime

  logger.info(coloredDashes)
  logger.info(chalk.green('MEMZ插件载入完成'))
  logger.info(`成功加载：${chalk.green(successCount)} 个`)
  logger.info(`加载失败：${chalk.red(failureCount)} 个`)
  logger.info(`总耗时：${chalk.yellow(elapsedTime)} 毫秒`)
  logger.info(coloredDashes)
} catch (error) {
  logger.error(chalk.red(`[memz-plugin] 插件加载失败：${error.message}`))
  logger.debug(error)
}

export { apps }
