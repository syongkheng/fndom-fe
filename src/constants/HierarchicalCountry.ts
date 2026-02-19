import type { CascaderOption } from 'element-plus'

export const HiearchicalCountry: CascaderOption[] = [
  {
    value: 'jiangsu',
    label: '江苏省',
    children: [
      {
        value: 'wuxi',
        label: '无锡市',
        children: [
          {
            value: 'huishanqu',
            label: '惠山区',
            children: [
              { value: 'yanqiao', label: '堰桥', leaf: true },
              { value: 'jiangyin', label: '江阴市' },
            ],
          },
        ],
      },
      {
        value: 'nanjing',
        label: '南京市',
        children: [
          {
            value: 'xuanwu',
            label: '玄武区',
            children: [
              { value: 'meiyuan', label: '梅园新村街道' },
              { value: 'xuanwumen', label: '玄武门街道' },
            ],
          },
          {
            value: 'qinhuai',
            label: '秦淮区',
            children: [
              { value: 'hongwu', label: '洪武路街道' },
              { value: 'ruijin', label: '瑞金路街道' },
            ],
          },
        ],
      },
      {
        value: 'suzhou',
        label: '苏州市',
        children: [
          {
            value: 'gusu',
            label: '姑苏区',
            children: [
              { value: 'guanqian', label: '观前街道' },
              { value: 'pingjiang', label: '平江街道' },
            ],
          },
          {
            value: 'wuzhong',
            label: '吴中区',
            children: [
              { value: 'mudu', label: '木渎镇' },
              { value: 'xiangshan', label: '香山街道' },
            ],
          },
        ],
      },
    ],
  },
  {
    value: 'guangzhou',
    label: '广州市',
    children: [
      {
        value: 'yuexiu',
        label: '越秀区',
        children: [
          { value: 'beijinglu', label: '北京街道' },
          { value: 'liurong', label: '六榕街道' },
          { value: 'dongshankou', label: '东山街道' },
        ],
      },
      {
        value: 'liwan',
        label: '荔湾区',
        children: [
          { value: 'fengkai', label: '逢源街道' },
          { value: 'shiweitang', label: '石围塘街道' },
          { value: 'huaisheng', label: '华林街道' },
        ],
      },
      {
        value: 'haizhu',
        label: '海珠区',
        children: [
          { value: 'jiangnanzhong', label: '江南中街道' },
          { value: 'chigang', label: '赤岗街道' },
          { value: 'binjiang', label: '滨江街道' },
        ],
      },
      {
        value: 'tianhe',
        label: '天河区',
        children: [
          { value: 'tianhenan', label: '天河南街道' },
          { value: 'linhe', label: '林和街道' },
          { value: 'shipai', label: '石牌街道' },
        ],
      },
      {
        value: 'baiyun',
        label: '白云区',
        children: [
          { value: 'jingxi', label: '京溪街道' },
          { value: 'xinshi', label: '新市街道' },
          { value: 'tongdewei', label: '同德街道' },
        ],
      },
      {
        value: 'huangpu',
        label: '黄埔区',
        children: [
          { value: 'huangpu', label: '黄埔街道' },
          { value: 'luogang', label: '萝岗街道' },
          { value: 'xintang', label: '新塘街道' },
        ],
      },
      {
        value: 'panyu',
        label: '番禺区',
        children: [
          { value: 'shiqiao', label: '市桥街道' },
          { value: 'dashi', label: '大石街道' },
          { value: 'luopu', label: '洛浦街道' },
        ],
      },
      {
        value: 'huadu',
        label: '花都区',
        children: [
          { value: 'huacheng', label: '花城街道' },
          { value: 'xinhua', label: '新华街道' },
          { value: 'tianyuan', label: '梯面镇' },
        ],
      },
      {
        value: 'nansha',
        label: '南沙区',
        children: [
          { value: 'nansha', label: '南沙街道' },
          { value: 'huangge', label: '黄阁镇' },
          { value: 'hengli', label: '横沥镇' },
        ],
      },
      {
        value: 'zengcheng',
        label: '增城区',
        children: [
          { value: 'zengjiang', label: '增江街道' },
          { value: 'xintang', label: '新塘镇' },
          { value: 'zhongxin', label: '中新镇' },
        ],
      },
      {
        value: 'conghua',
        label: '从化区',
        children: [
          { value: 'jiekou', label: '街口街道' },
          { value: 'liangkou', label: '良口镇' },
          { value: 'taiping', label: '太平镇' },
        ],
      },
    ],
  },
] as const
