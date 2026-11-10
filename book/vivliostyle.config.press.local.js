// local 向けの印刷入稿版の設定ファイル
const path = require('node:path')
const config = require('./vivliostyle.config.js')
module.exports = {
  ...config,
  theme: [...config.theme, path.join(__dirname, 'theme/theme-press')],
  output: {
    path: path.join(__dirname, 'output/press.pdf'),
    preflight: 'press-ready-local',
    preflightOption: ['gray-scale'],
  },
}
