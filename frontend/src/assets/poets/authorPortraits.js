import liBai from './li-bai.png'
import duFu from './du-fu.png'
import suShi from './su-shi.png'
import wangWei from './wang-wei.png'
import baiJuyi from './bai-juyi.png'
import duMu from './du-mu.png'
import mengHaoran from './meng-haoran.png'
import wangZhihuan from './wang-zhihuan.png'
import liShangyin from './li-shangyin.png'
import liQingzhao from './li-qingzhao.png'
import liuZongyuan from './liu-zongyuan.png'
import liuYuxi from './liu-yuxi.png'
import wangChangling from './wang-changling.png'
import gaoShi from './gao-shi.png'
import cenShen from './cen-shen.png'
import jiaDao from './jia-dao.png'
import yuanZhen from './yuan-zhen.png'
import yanShu from './yan-shu.png'
import wangAnshi from './wang-anshi.png'
import unknownScholar from './unknown-scholar.png'

// 静态资源优先：诗人头像不依赖任何运行时 AI 调用，也不会写入 localStorage。
export const AUTHOR_PORTRAITS = Object.freeze({
  李白: liBai, 杜甫: duFu, 苏轼: suShi, 王维: wangWei, 白居易: baiJuyi,
  杜牧: duMu, 孟浩然: mengHaoran, 王之涣: wangZhihuan, 李商隐: liShangyin,
  李清照: liQingzhao, 柳宗元: liuZongyuan, 刘禹锡: liuYuxi, 王昌龄: wangChangling,
  高适: gaoShi, 岑参: cenShen, 贾岛: jiaDao, 元稹: yuanZhen, 晏殊: yanShu, 王安石: wangAnshi
})

export const DEFAULT_AUTHOR_PORTRAIT = unknownScholar
