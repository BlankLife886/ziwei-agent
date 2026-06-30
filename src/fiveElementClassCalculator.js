import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from "./chart.js";

// 第五堂实战课：计算五行局。
//
// 五行局不是随便从出生年份取一个五行。
// 紫微斗数常用做法是：
// 1. 用出生年干通过“五虎遁”推出寅宫天干。
// 2. 从寅宫开始顺排十二宫天干。
// 3. 找到命宫的天干地支。
// 4. 用命宫干支查六十甲子纳音。
// 5. 从纳音五行得到“水二局、木三局、金四局、土五局、火六局”。

const BRANCHES_FROM_YIN = [
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
  "子",
  "丑"
];

// 五虎遁口诀：
// 甲己之年丙作首，乙庚之岁戊为头，
// 丙辛便向庚寅起，丁壬壬寅顺行流，
// 若问戊癸何方发，甲寅之上好追求。
//
// 这里的值表示“寅宫”的天干。
const YIN_PALACE_STEM_BY_YEAR_STEM = new Map([
  ["甲", "丙"],
  ["己", "丙"],
  ["乙", "戊"],
  ["庚", "戊"],
  ["丙", "庚"],
  ["辛", "庚"],
  ["丁", "壬"],
  ["壬", "壬"],
  ["戊", "甲"],
  ["癸", "甲"]
]);

// 六十甲子纳音表。
// 我们把“一组两个干支共用一个纳音”的传统表拆成 Map，
// 这样程序查找时不用再写复杂判断，也更方便测试。
const NA_YIN_BY_GAN_ZHI = new Map(
  [
    [["甲子", "乙丑"], "海中金"],
    [["丙寅", "丁卯"], "炉中火"],
    [["戊辰", "己巳"], "大林木"],
    [["庚午", "辛未"], "路旁土"],
    [["壬申", "癸酉"], "剑锋金"],
    [["甲戌", "乙亥"], "山头火"],
    [["丙子", "丁丑"], "涧下水"],
    [["戊寅", "己卯"], "城头土"],
    [["庚辰", "辛巳"], "白蜡金"],
    [["壬午", "癸未"], "杨柳木"],
    [["甲申", "乙酉"], "泉中水"],
    [["丙戌", "丁亥"], "屋上土"],
    [["戊子", "己丑"], "霹雳火"],
    [["庚寅", "辛卯"], "松柏木"],
    [["壬辰", "癸巳"], "长流水"],
    [["甲午", "乙未"], "沙中金"],
    [["丙申", "丁酉"], "山下火"],
    [["戊戌", "己亥"], "平地木"],
    [["庚子", "辛丑"], "壁上土"],
    [["壬寅", "癸卯"], "金箔金"],
    [["甲辰", "乙巳"], "覆灯火"],
    [["丙午", "丁未"], "天河水"],
    [["戊申", "己酉"], "大驿土"],
    [["庚戌", "辛亥"], "钗钏金"],
    [["壬子", "癸丑"], "桑柘木"],
    [["甲寅", "乙卯"], "大溪水"],
    [["丙辰", "丁巳"], "沙中土"],
    [["戊午", "己未"], "天上火"],
    [["庚申", "辛酉"], "石榴木"],
    [["壬戌", "癸亥"], "大海水"]
  ].flatMap(([ganZhiList, naYin]) => {
    return ganZhiList.map((ganZhi) => [ganZhi, naYin]);
  })
);

const CLASS_BY_ELEMENT = {
  水: { name: "水二局", number: 2 },
  木: { name: "木三局", number: 3 },
  金: { name: "金四局", number: 4 },
  土: { name: "土五局", number: 5 },
  火: { name: "火六局", number: 6 }
};

export function calculatePalaceStem({ yearStem, branch }) {
  if (!YIN_PALACE_STEM_BY_YEAR_STEM.has(yearStem)) {
    throw new Error("yearStem must be one of 甲乙丙丁戊己庚辛壬癸");
  }

  if (!EARTHLY_BRANCHES.includes(branch)) {
    throw new Error("branch must be one of 子丑寅卯辰巳午未申酉戌亥");
  }

  const yinStem = YIN_PALACE_STEM_BY_YEAR_STEM.get(yearStem);
  const yinStemIndex = HEAVENLY_STEMS.indexOf(yinStem);
  const branchOffset = BRANCHES_FROM_YIN.indexOf(branch);
  const stemIndex = wrapStemIndex(yinStemIndex + branchOffset);

  return HEAVENLY_STEMS[stemIndex];
}

export function calculateFiveElementClass({ yearStem, lifeBranch }) {
  const palaceStem = calculatePalaceStem({
    yearStem,
    branch: lifeBranch
  });
  const palaceGanZhi = `${palaceStem}${lifeBranch}`;
  const naYin = NA_YIN_BY_GAN_ZHI.get(palaceGanZhi);

  if (!naYin) {
    throw new Error(`missing na yin rule for ${palaceGanZhi}`);
  }

  // 纳音名的最后一个字就是五行，如“白蜡金”的五行是“金”。
  const element = naYin.at(-1);
  const classInfo = CLASS_BY_ELEMENT[element];

  if (!classInfo) {
    throw new Error(`missing five element class rule for ${element}`);
  }

  return {
    ...classInfo,
    element,
    palaceStem,
    palaceBranch: lifeBranch,
    palaceGanZhi,
    naYin
  };
}

export function applyFiveElementClass(chart, { yearStem }) {
  if (!chart.lifePalace?.branch) {
    throw new Error("lifePalace.branch is required before calculating fiveElementClass");
  }

  const palaces = chart.palaces.map((palace) => {
    return {
      ...palace,
      stem: calculatePalaceStem({
        yearStem,
        branch: palace.branch
      })
    };
  });

  const fiveElementClass = calculateFiveElementClass({
    yearStem,
    lifeBranch: chart.lifePalace.branch
  });

  return {
    ...chart,
    palaces,
    fiveElementClass,
    calculationNotes: [
      ...chart.calculationNotes,
      `出生年干为${yearStem}，按五虎遁推寅宫天干。`,
      `命宫在${fiveElementClass.palaceBranch}，宫干为${fiveElementClass.palaceStem}，命宫干支为${fiveElementClass.palaceGanZhi}。`,
      `${fiveElementClass.palaceGanZhi}纳音为${fiveElementClass.naYin}，因此五行局为${fiveElementClass.name}。`
    ]
  };
}

function wrapStemIndex(index) {
  return ((index % 10) + 10) % 10;
}
