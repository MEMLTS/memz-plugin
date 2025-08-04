import cfg from '../../../lib/config/config.js'
import { Config } from '#components'
import { normalizeCronExpression } from '#model'

// 默认点赞名单
let Users = [2173302144, 1011303349, 197728340, 3610159055]

export class 自动点赞 extends plugin {
  constructor() {
    super({
      name: '自动点赞',
      dsc: '自动点赞',
      priority: -100000,
      event: 'message',
      rule: [
        {
          reg: '^#?(memz)?一键点赞',
          fnc: 'DZ',
          permission: 'master'
        },
        {
          reg: /^#?(memz)?(添加点赞|adduser)\s*/i,
          fnc: 'AddUser',
          permission: 'master'
        },
        {
          reg: /^#?(memz)?(删除点赞|deluser)\s*/i,
          fnc: 'DelUser',
          permission: 'master'
        }
      ]
    })
    this.task = [
      {
        cron: '0 0 0 * * ?',
        name: '赞',
        fnc: () => this.ThumbUp()
      }
    ]
  }

  // 过滤掉 stdin
  filterStdin(list) {
    const filteredList = list.filter(item => {
      const itemStr = item.toString().trim()
      if (itemStr === 'stdin') {
        return false
      }
      return true
    })
    return filteredList
  }

  async AddUser(e) {
    const qqMatch = e.msg.match(this.rule[1].reg)
    if (qqMatch && qqMatch[3]) {
      const qq = qqMatch[3].trim()
      if (memz.memz.AutoLikeList.includes(qq)) {
        logger.warn('[memz-plugin] QQ号已存在')
      }
      else {
        memz.memz.AutoLikeList.push(qq)
        logger.info(`[memz-plugin] 已添加QQ号 ${qq} 到点赞列表`)
        Config.set('memz.memz.AutoLikeList', memz.memz.AutoLikeList)
        e.reply(`已添加 ${qq} 到点赞列表\n当前点赞个数：${(memz.memz.AutoLikeList).length}`)
      }
    } else {
      logger.warn('[memz-plugin] 未指定QQ号')
    }
  }

  async DelUser(e) {
    const qqMatch = e.msg.match(this.rule[2].reg)
    if (qqMatch && qqMatch[3]) {
      const qq = qqMatch[3].trim()
      const index = memz.memz.AutoLikeList.indexOf(qq)
      if (index !== -1) {
        memz.memz.AutoLikeList.splice(index, 1)
        logger.info(`[memz-plugin] 已删除QQ号 ${qq} 从点赞列表`)
        Config.set('memz.memz.AutoLikeList', memz.memz.AutoLikeList)
        e.reply(`已删除 ${qq} 从点赞列表\n当前点赞个数：${(memz.memz.AutoLikeList).length}`)
      } else {
        logger.warn('[memz-plugin] QQ号不存在')
      }
    } else {
      logger.warn('[memz-plugin] 未指定QQ号')
    }
  }
  
  async ThumbUp() {
    const { AutoLike, AutoLikeList } = memz.memz

    if (!AutoLike) {
      return logger.info('[memz-plugin] 未开启自动点赞功能')
    }

    let qq = new Set()

    // 添加主人QQ到点赞列表
    if (Array.isArray(cfg.masterQQ)) {
      const filteredMasterQQ = this.filterStdin(cfg.masterQQ)
      filteredMasterQQ.forEach(master => {
        if (master.toString().length <= 11) {
          qq.add(master)
          logger.debug(`[memz-plugin] 添加主人QQ ${master} 到点赞列表`)
        } else {
          logger.debug(`[memz-plugin] 跳过长度大于 11 的主人QQ ${master}`)
        }
      })
    } else if (cfg.masterQQ.toString().length <= 11) {
      qq.add(cfg.masterQQ)
      logger.debug(`[memz-plugin] 添加主人QQ ${cfg.masterQQ} 到点赞列表`)
    } else {
      logger.debug(`[memz-plugin] 跳过长度大于 11 的主人QQ ${cfg.masterQQ}`)
    }

    // 添加点赞列表到点赞列表
    if (Array.isArray(AutoLikeList)) {
      const filteredAutoLikeList = this.filterStdin(AutoLikeList)
      filteredAutoLikeList.forEach(likeQQ => {
        if (likeQQ.toString().length <= 11) {
          qq.add(likeQQ)
          logger.debug(`[memz-plugin] 添加 ${likeQQ} 到点赞列表`)
        } else {
          logger.debug(`[memz-plugin] 跳过长度大于 11 的 QQ ${likeQQ}`)
        }
      })
    }

    Users = this.filterStdin(Users)

    qq = Array.from(qq)

    const bot = this.filterStdin(Bot.uin)

    logger.info(`[memz-plugin] 共有 ${qq.length} 个 QQ 需要点赞`)

    // 执行点赞
    for (const uin of bot) {
      logger.info(`[memz-plugin] 开始处理 QQ：${uin}`)
      for (const i of Users) {
        try {
          // 好友
          if (await Bot[uin].fl.has(i)) {
            Bot[uin].pickFriend(i).thumbUp(20)
            logger.info(`[memz-plugin] 为 ${uin} 的好友 ${i} 点赞 20 下`)
            await this.sleep(2000)
          } else {
            // 非好友
            Bot[uin].pickUser(i).thumbUp(50)
            logger.info(`[memz-plugin] 为 ${uin} 的非好友 ${i} 点赞 50 下`)
            await this.sleep(2000)
          }
        } catch (error) {
          logger.error(`[memz-plugin] 为 ${uin} 的 ${i} 点赞时发生错误：${error}`)
        }
      }
    }
  }
}
