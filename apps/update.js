import { update as Update } from '../../other/update.js'
import { PluginName } from '#components'
import { normalizeCronExpression } from '#model'
import cfg from '../../../lib/config/config.js'
const { autoupdate, updatecron } = memz.update
export class Updates extends plugin {
  constructor () {
    super({
      name: '更新MEMZ插件',
      dsc: '更新MEMZ插件',
      event: 'message',
      priority: -10,
      rule: [
        {
          reg: /^#*(memz)(插件)?(强制)?更新$/i,
          fnc: 'update',
          permission: 'master'
        },
        {
          reg: /^#*(memz)(插件)?更新(日志|记录)$/i,
          fnc: 'update_log'
        }
      ]
    })
  }

  init () {
    this.e = {
      isMaster: true,
      logFnc: '[memz-plugin]自动更新]',
      msg: `#更新${PluginName}`,
      reply: async (msg) => {
        const masters = Object.keys(cfg.master)
        for (const master of masters) {
          if (master.toString().length > 11) {
            logger.info('[memz-plugin] 更新推送跳过 QQBot')
            continue
          }
          try {
            await Bot.pickFriend(master).sendMsg(msg)
            await Bot.sleep(2000)
          } catch (err) {
            logger.error(`[memz-plugin] 向好友 ${master} 发送消息时出错：`, err)
          }
        }
      }
    }

    if (!autoupdate) return logger.warn('[memz-plugin]自动更新已关闭')

    this.task = []
    this.task.push({
      name: '[memz-plugin]自动更新]',
      cron: normalizeCronExpression(updatecron),
      fnc: () => this.update(this.e)
    })
  }

  async update (e) {
    if (e.at && !e.atme) return
    e.msg = `#${e.msg.includes('强制') ? '强制' : ''}更新${PluginName}`
    const up = new Update(e)
    up.e = e
    return up.update()
  }

  async update_log () {
    const UpdatePlugin = new Update()
    UpdatePlugin.e = this.e
    UpdatePlugin.reply = this.reply

    if (UpdatePlugin.getPlugin(PluginName)) {
      this.e.reply(await UpdatePlugin.getLog(PluginName))
    }
    return true
  }
}
