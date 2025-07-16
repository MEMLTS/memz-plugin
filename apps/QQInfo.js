import Render from '../components/Render.js'

export class QQInfo extends plugin {
    constructor() {
        super({
            name: 'QQInfo',
            dsc: '获取QQ信息并返回图像',
            event: 'message',
            priority: -1,
            rule: [
                {
                    reg: /^#?(qq信息查询|qq信息|qqinfo)\s*/i,
                    fnc: 'qqinfo'
                }
            ]
        })
    }

    async qqinfo(e) {
        if (!memz.memz.qqInfo && !e.isMaster) {
            return logger.warn('[memz-plugin] QQInfo状态当前为仅主人可用')
        }

        let qq;
        const qqMatch = e.msg.match(/^#?(qq信息查询|qq信息|qqinfo)\s*(\d+)?/i);
        if (qqMatch && qqMatch[2]) {
            qq = qqMatch[2].trim();
        } else {
            qq = e.at ? e.at : e.user_id;
        }

        try {
            if (!/^\d+$/.test(qq)) {
                throw new Error('无效的QQ号格式');
            }

            const response = await fetch(`https://mapi.141941.xyz/api/qq/info/info?qq=${qq}`);
            if (!response.ok) {
                throw new Error(`查询失败，服务器返回状态码：${response.status}`);
            }

            const renderData = await response.json();

            if (!renderData || renderData.code !== 0) {
                throw new Error(`查询失败，原因: ${renderData.message || '未知错误'}`);
            }

            const image = await Render.render('html/qqinfo/index.html', renderData, {
                e,
                retType: 'base64'
            });

            await e.reply(image, true);
        } catch (error) {
            logger.error(`[memz-plugin] QQInfo查询失败: ${error.message}`);
            await e.reply(`查询失败，原因: ${error.message}`, true);
        }
    }
}
