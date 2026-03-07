import type { CascaderOption } from 'element-plus'

export const HiearchicalCountry: CascaderOption[] = [
  {
    value: 'singapore',
    label: '新加坡 Singapore',
    children: [
      {
        value: 'sg-central',
        label: '中区 Central Region',
        children: [
          { value: 'sg-orchard', label: '乌节路 Orchard' },
          { value: 'sg-marinabay', label: '滨海湾 Marina Bay' },
          { value: 'sg-chinatown', label: '牛车水 Chinatown' },
          { value: 'sg-littleindia', label: '小印度 Little India' },
          { value: 'sg-clarkequay', label: '克拉码头 Clarke Quay' },
          { value: 'sg-bugis', label: '武吉士 Bugis' },
          { value: 'sg-tanjongpagar', label: '丹戎巴葛 Tanjong Pagar' },
        ],
      },
      {
        value: 'sg-east',
        label: '东区 East Region',
        children: [
          { value: 'sg-changi', label: '樟宜 Changi' },
          { value: 'sg-tampines', label: '淡滨尼 Tampines' },
          { value: 'sg-bedok', label: '勿洛 Bedok' },
          { value: 'sg-pasirris', label: '巴西立 Pasir Ris' },
        ],
      },
      {
        value: 'sg-west',
        label: '西区 West Region',
        children: [
          { value: 'sg-jurong', label: '裕廊 Jurong' },
          { value: 'sg-clementi', label: '金文泰 Clementi' },
          { value: 'sg-buonavista', label: '博纳维斯塔 Buona Vista' },
        ],
      },
      {
        value: 'sg-north',
        label: '北区 North Region',
        children: [
          { value: 'sg-woodlands', label: '兀兰 Woodlands' },
          { value: 'sg-yishun', label: '义顺 Yishun' },
          { value: 'sg-admiralty', label: '海军部 Admiralty' },
        ],
      },
      {
        value: 'sg-northeast',
        label: '东北区 North-East Region',
        children: [
          { value: 'sg-punggol', label: '榜鹅 Punggol' },
          { value: 'sg-sengkang', label: '盛港 Sengkang' },
          { value: 'sg-hougang', label: '后港 Hougang' },
          { value: 'sg-serangoon', label: '实龙岗 Serangoon' },
        ],
      },
    ],
  },
  {
    value: 'china',
    label: '中国 China',
    children: [
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
        value: 'guangdong',
        label: '广东省',
        children: [
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
        ],
      },
      {
        value: 'sichuan',
        label: '四川省 Sichuan',
        children: [
          {
            value: 'chengdu',
            label: '成都市 Chengdu',
            children: [
              { value: 'cd-jinjiang', label: '锦江区' },
              { value: 'cd-qingyang', label: '青羊区' },
              { value: 'cd-jinniu', label: '金牛区' },
              { value: 'cd-wuhou', label: '武侯区' },
              { value: 'cd-chenghua', label: '成华区' },
              { value: 'cd-tianfu', label: '天府新区' },
              { value: 'cd-shuangliu', label: '双流区' },
              { value: 'cd-longquanyi', label: '龙泉驿区' },
              { value: 'cd-xinjin', label: '新津区' },
              { value: 'cd-dujiangyan', label: '都江堰市' },
              { value: 'cd-pengzhou', label: '彭州市' },
              { value: 'cd-qionglai', label: '邛崃市' },
            ],
          },
          {
            value: 'aba',
            label: '阿坝藏族羌族自治州 Aba Prefecture',
            children: [
              { value: 'siguniang', label: '四姑娘山 Siguniang Mountain' },
              { value: 'jiuzhaigou', label: '九寨沟 Jiuzhaigou' },
              { value: 'huanglong', label: '黄龙 Huanglong' },
            ],
          },
          {
            value: 'sc-leshan',
            label: '乐山市 Leshan',
            children: [
              { value: 'leshanbuddha', label: '乐山大佛 Leshan Giant Buddha' },
              { value: 'emeishan', label: '峨眉山 Mount Emei' },
            ],
          },
        ],
      },
      {
        value: 'chongqing',
        label: '重庆市 Chongqing',
        children: [
          { value: 'cq-yuzhong', label: '渝中区' },
          { value: 'cq-jiangbei', label: '江北区' },
          { value: 'cq-shapingba', label: '沙坪坝区' },
          { value: 'cq-jiulongpo', label: '九龙坡区' },
          { value: 'cq-nanan', label: '南岸区' },
          { value: 'cq-yubei', label: '渝北区' },
          { value: 'cq-banan', label: '巴南区' },
          { value: 'cq-hongya', label: '洪崖洞 Hongyadong' },
          { value: 'cq-ciqikou', label: '磁器口 Ciqikou' },
        ],
      },
      {
        value: 'guizhou',
        label: '贵州省 Guizhou',
        children: [
          {
            value: 'guiyang',
            label: '贵阳市 Guiyang',
            children: [
              { value: 'gy-nanming', label: '南明区' },
              { value: 'gy-yunyan', label: '云岩区' },
              { value: 'gy-huaxi', label: '花溪区' },
              { value: 'gy-wudang', label: '乌当区' },
              { value: 'gy-guanshan', label: '观山湖区' },
              { value: 'gy-qingyan', label: '青岩古镇 Qingyan Ancient Town' },
            ],
          },
          {
            value: 'anshun',
            label: '安顺市 Anshun',
            children: [
              { value: 'huangguoshu', label: '黄果树瀑布 Huangguoshu Waterfall' },
              { value: 'longgong', label: '龙宫 Dragon Palace' },
            ],
          },
        ],
      },
    ],
  },
] as const
