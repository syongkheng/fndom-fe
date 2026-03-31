export const HEAVENLY = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const EARTHLY  = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
export const MONTH_ZH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
export const DAY_ZH   = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十',
]
export const ZODIAC  = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
export const OFFICER = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭']

export const OFFICER_YI = [
  /*建*/['祈福', '出行', '入学', '纳财', '开光', '塑绘'],
  /*除*/['解除', '沐浴', '求医', '整容', '扫舍', '除服'],
  /*满*/['嫁娶', '开市', '纳采', '安床', '冠笄', '会亲友'],
  /*平*/['出行', '祭祀', '修造', '竖柱', '纳畜', '安机械'],
  /*定*/['纳采', '订盟', '嫁娶', '会亲友', '立券', '交易'],
  /*执*/['捕捉', '取鱼', '畋猎', '结网', '修仓库', '除灾'],
  /*破*/['求医', '破屋', '坏垣', '解除', '余事勿取', '治病'],
  /*危*/['出行', '祈福', '移徙', '赴任', '立券', '上梁'],
  /*成*/['嫁娶', '开市', '纳财', '安床', '入宅', '移徙'],
  /*收*/['纳财', '入仓', '收敛', '捕捉', '整手足甲', '纳畜'],
  /*开*/['开市', '开光', '入宅', '破土', '修造', '动土'],
  /*闭*/['安葬', '入殓', '修坟', '纳采', '安床', '塞穴'],
]
export const OFFICER_JI = [
  /*建*/['开市', '移徙', '破土', '动土', '安葬', '词讼'],
  /*除*/['嫁娶', '开市', '移徙', '纳财', '出行', '破土'],
  /*满*/['出行', '安葬', '破土', '词讼', '赴任', '修造'],
  /*平*/['嫁娶', '开市', '纳财', '安床', '入宅', '破土'],
  /*定*/['安葬', '破土', '出行', '词讼', '赴任', '动土'],
  /*执*/['嫁娶', '开市', '移徙', '入宅', '出行', '修造'],
  /*破*/['余事勿取', '嫁娶', '开市', '动土', '安床', '破土'],
  /*危*/['嫁娶', '开市', '开光', '入宅', '动土', '安葬'],
  /*成*/['出行', '安葬', '移徙', '破土', '词讼', '赴任'],
  /*收*/['嫁娶', '开市', '入宅', '修造', '动土', '出行'],
  /*开*/['嫁娶', '安葬', '动土', '词讼', '破土', '出行'],
  /*闭*/['出行', '开市', '嫁娶', '移徙', '修造', '针灸'],
]

export const LUNAR_DATA: Record<number, { yearStart: [number,number,number]; stem: number; branch: number; leapMonth: number; months: number[] }> = {
  2026: { yearStart: [2026,1,28], stem: 2, branch: 2, leapMonth: 6, months: [30,29,30,29,30,29,30,29,30,29,30,30,29] },
  2027: { yearStart: [2027,2,6],  stem: 3, branch: 3, leapMonth: 0, months: [30,29,30,29,30,30,29,30,29,30,29,30] },
  2028: { yearStart: [2028,1,26], stem: 4, branch: 4, leapMonth: 0, months: [29,30,29,30,29,30,30,29,30,29,30,29] },
}

export function daysBetween(a: [number,number,number], b: [number,number,number]): number {
  return Math.round((new Date(b[0], b[1]-1, b[2]).getTime() - new Date(a[0], a[1]-1, a[2]).getTime()) / 86400000)
}

export function getLunarDate(gy: number, gm: number, gd: number) {
  let lunarYear = gy, lunarMonth = gm, lunarDay = gd, isLeap = false
  let lunarYearStem = 0, lunarYearBranch = 0
  const date: [number,number,number] = [gy, gm, gd]

  for (const yr of [2026, 2027, 2028]) {
    const ld = LUNAR_DATA[yr]
    const nyrKey = yr + 1
    const nextStart: [number,number,number] = LUNAR_DATA[nyrKey]?.yearStart ?? [nyrKey, 2, 10]
    const dFromStart = daysBetween(ld.yearStart, date)
    const dToNext = daysBetween(date, nextStart)
    if (dFromStart >= 0 && dToNext > 0) {
      lunarYear = yr
      lunarYearStem = ld.stem
      lunarYearBranch = ld.branch
      let rem = dFromStart
      for (let i = 0; i < ld.months.length; i++) {
        if (rem < ld.months[i]) {
          lunarDay = rem + 1
          if (ld.leapMonth > 0 && i === ld.leapMonth) {
            isLeap = true; lunarMonth = ld.leapMonth
          } else {
            isLeap = false
            lunarMonth = (ld.leapMonth > 0 && i > ld.leapMonth) ? i : i + 1
          }
          break
        }
        rem -= ld.months[i]
      }
      break
    }
  }

  const stem   = HEAVENLY[((lunarYear - 4) % 10 + 10) % 10]
  const branch = EARTHLY[((lunarYear - 4) % 12 + 12) % 12]
  const animal = ZODIAC[((lunarYear - 4) % 12 + 12) % 12]
  const mStr   = (isLeap ? '闰' : '') + MONTH_ZH[lunarMonth - 1] + '月'
  const dStr   = DAY_ZH[lunarDay - 1] ?? `第${lunarDay}日`

  return {
    yearStr: `${stem}${branch}年${animal}年`,
    dateStr: mStr + dStr,
    mStr, dStr,
  }
}

export function getStemBranch(gy: number, gm: number, gd: number): string {
  const base = new Date(2000, 0, 7).getTime()
  const diff = Math.round((new Date(gy, gm-1, gd).getTime() - base) / 86400000)
  return HEAVENLY[((diff % 10) + 10) % 10] + EARTHLY[((diff % 12) + 12) % 12]
}

export function getOfficerIdx(gy: number, gm: number, gd: number): number {
  const base = new Date(2000, 0, 6).getTime()
  const diff = Math.round((new Date(gy, gm-1, gd).getTime() - base) / 86400000)
  return ((diff % 12) + 12) % 12
}

export function getLunarInfo(dateStr: string): {
  yearStr: string; dateStr: string; sb: string; officer: string; yi: string[]; ji: string[]
} {
  const [y, m, d] = dateStr.split('-').map(Number)
  const lunar = getLunarDate(y, m, d)
  const oi    = getOfficerIdx(y, m, d)
  return {
    yearStr:  lunar.yearStr,
    dateStr:  lunar.dateStr,
    sb:       getStemBranch(y, m, d),
    officer:  OFFICER[oi],
    yi:       OFFICER_YI[oi],
    ji:       OFFICER_JI[oi],
  }
}
