import Version from './Version.js'
import YamlReader from './YamlReader.js'
import Render from './Render.js'
import Config from './Config.js'
import {
  Path,
  PluginPath,
  PluginTemp,
  PluginData,
  PluginName,
  isFramework // 是否是框架
} from './Path.js'
const MEMZ_NAME = 'MEMZ-Plugin'
const { apiby } = Config.getConfig('api')
const copyright = `Copyright © 2024-${new Date().getFullYear()} ${MEMZ_NAME} - ${apiby}`
const BotName = Version.isMangoCat
  ? 'MangoCat-Yunzai'
  : Version.isTrss
    ? 'Trss-Yunzai'
    : Version.isMiao
      ? 'Miao-Yunzai'
      : 'Yunzai-Bot'
export {
  isFramework,
  Version,
  Path,
  YamlReader,
  Config,
  Render,
  PluginName,
  PluginPath,
  PluginTemp,
  PluginData,
  MEMZ_NAME,
  copyright,
  BotName
}
