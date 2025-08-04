export default [
  {
    label: '基础配置',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '插件设置'
  },
  {
    field: 'memz.renderScale',
    label: '渲染精度',
    bottomHelpMessage: '图片的渲染精度,数值越大越清晰,但会消耗更多的内存',
    required: true,
    component: 'InputNumber'
  },
  {
    field: 'memz.SystemStatusAll',
    label: '系统状态',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.RedisStatusAll',
    label: 'Redis状态',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.kallChromeEnabled',
    label: '定时结束chrome',
    bottomHelpMessage: '按照Cron定时自动杀死chrome进程,重启生效',
    component: 'Switch'
  },
  {
    field: 'memz.kallChromeCron',
    label: '杀死chrome进程Cron',
    bottomHelpMessage: '定时杀死chrome进程Cron表达式,重启生效',
    component: 'EasyCron',
    componentProps: {
      placeholder: '请输入Cron表达式'
    }
  },
  {
    field: 'memz.MEMZRestart',
    label: '劫持重启',
    bottomHelpMessage: '劫持Miao-Yunzai的重启,变成前台重启,只支持Windows系统',
    component: 'Switch'
  },
  {
    field: 'update.autoupdate',
    label: '插件自动更新',
    bottomHelpMessage: '插件更新时自动更新插件',
    component: 'Switch'
  },
  {
    field: 'update.updatecron',
    label: '自动更新',
    helpMessage: '修改后重启生效',
    bottomHelpMessage: '自动更新插件',
    component: 'EasyCron',
    componentProps: {
      placeholder: '请输入Cron表达式'
    }
  },
  {
    component: 'Divider',
    label: '仓库更新推送'
  },
  {
    field: 'update.checkupdate',
    label: '自动检查仓库更新',
    bottomHelpMessage: '检查插件更新并推送到主人',
    component: 'Switch'
  },
  {
    field: 'update.CUSTOM_REPOSITORY',
    label: '仓库链接',
    bottomHelpMessage: '填入仓库链接,如https://gitee.com/memzjs/memz-plugin,支持Gitee/Github',
    component: 'GTags',
    componentProps: {
      allowAdd: true,
      allowDel: true
    }
  },
  {
    field: 'update.cron',
    label: '自动检查仓库更新',
    helpMessage: '修改后重启生效',
    bottomHelpMessage: '自动检查仓库更新Cron表达式',
    component: 'EasyCron',
    componentProps: {
      placeholder: '请输入Cron表达式'
    }
  },
  {
    component: 'Divider',
    label: '个人功能'
  },
  {
    field: 'memz.AutoLike',
    label: '自动点赞',
    bottomHelpMessage: '每日 00:00 自动点赞',
    component: 'Switch'
  },
  {
    field: 'memz.AutoLikeCron',
    label: '自动点赞Cron',
    bottomHelpMessage: '自动点赞Cron表达式',
    component: 'EasyCron',
    componentProps: {
      placeholder: '请输入Cron表达式'
    }
  },
  {
    field: 'memz.AutoLikeList',
    label: '自动点赞列表',
    bottomHelpMessage: '填入QQ号,主人默认在点赞列表,无需添加',
    component: 'GTags'
  }
]
