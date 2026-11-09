const intentRules = [
  {
    intent: "queue",
    pattern: /排队|人多|高峰|错峰|等位|拥挤|早一点|晚一点|早去|晚去/,
  },
  {
    intent: "hours",
    pattern: /营业|几点|开门|关门|休息|周一|周二|周三|周四|周五|周六|周日/,
  },
  {
    intent: "recommendation",
    pattern: /附近|下一站|顺路|还能去|推荐.*(地方|店|逛)/,
  },
  {
    intent: "reservation",
    pattern: /预约|订位|留位|预留|占座/,
  },
  {
    intent: "pet",
    pattern: /宠物|带狗|小狗|猫|导盲犬/,
  },
  {
    intent: "story",
    pattern: /故事|由来|以前|旧物|为什么.*(开|做|留)/,
  },
  {
    intent: "solo",
    pattern: /一个人|独自|独行|单人|拼桌|尴尬|坐哪/,
  },
  {
    intent: "dietary",
    pattern: /不吃|忌口|过敏|素食|纯素|香菜|葱花|葱|蒜|辣|花生|坚果|乳糖|豆类/,
  },
  {
    intent: "menu",
    pattern: /点什么|吃什么|喝什么|怎么点|招牌|菜单|价格|多少钱|预算|分量|小份|加什么/,
  },
  {
    intent: "facilities",
    pattern: /wifi|wi-fi|插座|电脑|手机支架|行李|寄存|洗手间|厕所|儿童椅|婴儿车|停车|外带|打包/,
  },
  {
    intent: "etiquette",
    pattern: /拍照|摄影|电话|视频|礼仪|误会|注意|可以带|能不能带/,
  },
];

export function classifyUserIntents(text = "") {
  const normalized = String(text).toLowerCase();
  const intents = intentRules
    .filter((rule) => rule.pattern.test(normalized))
    .map((rule) => rule.intent);
  return intents.length ? [...new Set(intents)] : ["general"];
}

export function classifyUserIntent(text = "") {
  return classifyUserIntents(text)[0];
}

const validationRules = {
  queue: /排队|高峰|拥挤|错峰|等位|最挤|人最多|提前|早到|10:30|11:20|12:30|13:30|收门|营业/,
  hours: /\d{1,2}:\d{2}|营业|开门|关门|休息|收门|休/,
  recommendation: /推荐|可以.*去|下一站|顺路/,
  reservation: /预约|订位|留位|不提供|不能承诺|现场/,
  pet: /宠物|狗|猫|导盲犬|不入内|不能进入/,
  story: /店主|故事|以前|旧|留下|年开始|年/,
  solo: /一个人|独自|单人|吧台|小桌|座位|拼桌/,
  dietary: /不吃|忌口|过敏|素食|纯素|香菜|葱|蒜|辣|花生|坚果|乳糖|不放|可调整|现场确认/,
  menu: /元|招牌|面|茶|烘青|米浆|豆浆|豆花|杯垫|套餐|价格|可以点|一杯|一份/,
  facilities: /wifi|wi-fi|插座|电脑|支架|行李|寄存|洗手间|厕所|儿童椅|婴儿车|停车|打包|外带/,
  etiquette: /拍照|摄影|电话|视频|礼仪|误会|不要|请勿/,
};

export function validateAnswer({ intent, reply }) {
  if (!intent || intent === "general") return true;
  const rule = validationRules[intent];
  return rule ? rule.test(String(reply || "").toLowerCase()) : true;
}

export function validateAnswerForIntents({ intents = [], reply }) {
  return intents.every((intent) => validateAnswer({ intent, reply }));
}

export function intentLabel(intent) {
  return (
    {
      queue: "排队与高峰",
      hours: "营业时间",
      recommendation: "下一站推荐",
      reservation: "预约与留位",
      pet: "宠物政策",
      story: "店铺故事",
      solo: "独行与座位",
    dietary: "忌口与食材",
      menu: "点单与菜单",
      facilities: "设施与便利",
      etiquette: "礼仪与误会",
      general: "店铺咨询",
    }[intent] || "店铺咨询"
  );
}
