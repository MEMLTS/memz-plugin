import Redis from 'ioredis'
import { RedisConfig } from '../components/Redis.js'
import Render from '../components/Render.js'

export class RedisStatus extends plugin {
  constructor () {
    super({
      name: 'Redis',
      dsc: 'Redis',
      event: 'message',
      priority: 6,
      rule: [
        {
          reg: /^#?redis(状态|统计|狀態|統計)(\s*pro)?/i,
          fnc: 'getRedisInfo'
        },
        {
          reg: /^#*redis(一键)?(清理|释放|归零|清空)(db(\d+))?$/i,
          fnc: 'clearMemory'
        }
      ]
    })
  }

  async clearMemory (e) {
    if (!e.isMaster) {
      logger.warn('[memz-plugin] 清理内存仅限主人使用')
      return e.reply('您无权限执行此操作。')
    }

    const redisClient = new Redis({
      host: RedisConfig.host,
      port: RedisConfig.port,
      username: RedisConfig.username || null,
      password: RedisConfig.password || null
    })

    const match = e.msg.match(/^#*redis(一键)?(清理|释放|归零|清空)(db(\d+))?$/i)
    const dbNumber = match && match[4] ? parseInt(match[4], 10) : null

    try {
      if (dbNumber === null) {
        // 清空所有数据库
        await redisClient.flushall()
        await e.reply('Redis 清理成功！所有数据已被清空', true)
      } else {
        // 清空指定的数据库
        await redisClient.select(dbNumber)
        await redisClient.flushdb()
        await e.reply(`Redis 清理成功！数据库 db${dbNumber} 的数据已被清空`, true)
      }
    } catch (err) {
      logger.error('[memz-plugin] 清理 Redis 内存失败:', err)
      await e.reply(`Redis 清理失败：${err.message}`, true)
    } finally {
      redisClient.disconnect()
    }
  }

  async getRedisInfo (e) {
    if (!memz.memz.RedisStatusAll && !e.isMaster) { return logger.warn('[memz-plugin]Redis状态当前为仅主人可用') }

    const qw = e.msg.match(
      /^#?redis(状态|统计|狀態|統計)(\s*pro)?(\s*图片)?(\s*;?\s*([^;]*);\s*([^;]*);\s*([^;]*))?/i
    )

    const isPro = !!qw[2]
    const imageMode = !!qw[3]

    let redisConfig
    if (qw && qw[5]) {
      redisConfig = {
        host: qw[5],
        port: parseInt(qw[6], 10),
        password: qw[7] || ''
      }
    } else {
      redisConfig = '本体'
    }

    const redisInstance =
      redisConfig === '本体' ? redis : new Redis(redisConfig)

    try {
      const info = await redisInstance.info()
      const stats = this.parseRedisInfo(info)
      const hitRate = this.calculateHitRate(stats)
      const dbStats = this.getDbStats(stats, !imageMode)

      if (!imageMode) {
        const textResponse = isPro
          ? this.generateProTextResponse(stats, hitRate, dbStats)
          : this.generateBasicTextResponse(stats, hitRate, dbStats)
        await e.reply(textResponse, true)
      } else {
        const renderData = {
          stats,
          hitRate,
          dbStats: dbStats.databaseStats
        }

        const image = await Render.render(
          `html/redis/redis-${isPro ? 'pro' : 'basic'}.html`,
          renderData,
          {
            e,
            retType: 'base64',
            renderCfg: {
              scale: 1.4,
              viewPort: {
                width: 1800,
                height: 'auto'
              }
            }
          }
        )

        await e.reply(image, true)
      }
    } catch (error) {
      await e.reply(`获取Redis信息失败: ${error.message}`)
    } finally {
      if (redisConfig !== '本体') {
        redisInstance.disconnect()
      }
    }
  }

  parseRedisInfo (info) {
    const lines = info.split('\r\n')
    const stats = {}
    for (const line of lines) {
      if (line && line.includes(':')) {
        const [key, value] = line.split(':')
        stats[key] = value
      }
    }
    return stats
  }

  calculateHitRate (stats) {
    const keyspaceHits = parseInt(stats.keyspace_hits, 10)
    const keyspaceMisses = parseInt(stats.keyspace_misses, 10)
    return ((keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100).toFixed(2)
  }

  getDbStats (stats, textMode) {
    const categories = {
      databaseStats: [],
      generalStats: [],
      networkStats: [],
      replicationStats: [],
      aofRdbStats: []
    }

    Object.entries(stats).forEach(([key, value]) => {
      if (key.startsWith('db')) {
        categories.databaseStats.push({ key, value })
      } else if (
        key.startsWith('total_') ||
        key.startsWith('instantaneous_') ||
        key.startsWith('keyspace_')
      ) {
        categories.generalStats.push({ key, value })
      } else if (key.startsWith('total_net_')) {
        categories.networkStats.push({ key, value })
      } else if (key.startsWith('connected_slaves') || key.startsWith('role')) {
        categories.replicationStats.push({ key, value })
      } else if (
        key.startsWith('rdb') ||
        key.startsWith('aof') ||
        key.startsWith('sync')
      ) {
        categories.aofRdbStats.push({ key, value })
      }
    })

    return this.formatDbStats(categories, textMode)
  }

  formatDbStats (categories, textMode) {
    const formatCategory = (category) => {
      return category
        .map(({ key, value }) =>
          textMode
            ? `${key}: ${value}`
            : `<div><span>${key}:</span> ${value}</div>`
        )
        .join(textMode ? '\n' : '')
    }

    return {
      databaseStats: formatCategory(categories.databaseStats),
      generalStats: formatCategory(categories.generalStats),
      networkStats: formatCategory(categories.networkStats),
      replicationStats: formatCategory(categories.replicationStats),
      aofRdbStats: formatCategory(categories.aofRdbStats)
    }
  }

  generateBasicTextResponse (stats, hitRate, dbStats, redisConfig) {
    return `Redis 状态
已运行天数: ${stats.uptime_in_days} days
当前监听端口: ${stats.tcp_port}
连接的客户端数量: ${stats.connected_clients}
向操作系统申请的内存大小: ${(stats.used_memory_rss / 1024 / 1024).toFixed(2)} MB
当前 Redis 使用的内存大小: ${(stats.used_memory / 1024 / 1024).toFixed(2)} MB
Redis 的内存消耗峰值: ${(stats.used_memory_peak / 1024 / 1024).toFixed(2)} MB
Redis 实例的内存碎片化情况: ${stats.mem_fragmentation_ratio}
查找数据库键命中率: ${hitRate}%
数据库统计信息:
${dbStats.databaseStats}`
  }

  generateProTextResponse (stats, hitRate, dbStats, redisConfig) {
    return `Redis 状态PRO
已运行天数: ${stats.uptime_in_days} days
当前监听端口: ${stats.tcp_port}
连接的客户端数量: ${stats.connected_clients}
向操作系统申请的内存大小: ${(stats.used_memory_rss / 1024 / 1024).toFixed(2)} MB
当前 Redis 使用的内存大小: ${(stats.used_memory / 1024 / 1024).toFixed(2)} MB
Redis 的内存消耗峰值: ${(stats.used_memory_peak / 1024 / 1024).toFixed(2)} MB
Redis 实例的内存碎片化情况: ${stats.mem_fragmentation_ratio}
运行以来连接过的客户端的总数量: ${stats.total_connections_received}
运行以来执行过的命令的总数量: ${stats.total_commands_processed}
服务器每秒钟执行的命令数量: ${stats.instantaneous_ops_per_sec}
查找数据库键成功的次数: ${stats.keyspace_hits}
查找数据库键失败的次数: ${stats.keyspace_misses}
查找数据库键命中率: ${hitRate}%
最近一次 fork() 操作耗费的微秒数: ${stats.latest_fork_usec}
连接的从节点数量: ${stats.connected_slaves || 'N/A'}
当前实例的角色: ${stats.role || 'N/A'}
输入网络流量: ${(stats.total_net_input_bytes / 1024 / 1024).toFixed(2)} MB
输出网络流量: ${(stats.total_net_output_bytes / 1024 / 1024).toFixed(2)} MB
被拒绝的连接数量: ${stats.rejected_connections}
过期的键数量: ${stats.expired_keys}
被逐出的键数量: ${stats.evicted_keys}
Pub/Sub 频道数量: ${stats.pubsub_channels}
Pub/Sub 模式数量: ${stats.pubsub_patterns}
被阻塞的客户端数量: ${stats.blocked_clients}
正在加载数据集: ${stats.loading}
最后一次 RDB 保存状态: ${stats.rdb_last_bgsave_status}
最后一次 AOF 写入状态: ${stats.aof_last_write_status}
同步全量传输次数: ${stats.sync_full}
同步部分传输成功次数: ${stats.sync_partial_ok}
同步部分传输失败次数: ${stats.sync_partial_err}

数据库统计信息:
${dbStats.databaseStats}`
  }
}
