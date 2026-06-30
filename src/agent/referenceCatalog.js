// agent 本地引用目录。
//
// 这一层先不连接外部知识库，而是给“规则/分析框架”稳定编号。
// 后续把 PDF、书籍、笔记或向量检索接进来时，可以把这些 id 映射到
// 更具体的来源，例如书名、章节、页码、原文摘录或检索片段。

export const REFERENCE_IDS = {
  LIFE_BODY_PALACE: "rule.life-body-palace",
  FIVE_ELEMENT_CLASS: "rule.five-element-class",
  STAR_PLACEMENT: "rule.star-placement",
  BIRTH_YEAR_FOUR_TRANSFORMATIONS: "rule.birth-year-four-transformations",
  MAJOR_PERIODS: "rule.major-periods",
  LIFE_TRIAD: "framework.life-triad",
  BODY_PALACE: "framework.body-palace",
  STAR_BALANCE: "framework.star-balance"
};

const REFERENCES = [
  {
    id: REFERENCE_IDS.LIFE_BODY_PALACE,
    title: "命宫/身宫排定规则",
    type: "implemented-rule",
    note: "根据农历月份与出生时辰排定命宫、身宫。"
  },
  {
    id: REFERENCE_IDS.FIVE_ELEMENT_CLASS,
    title: "五行局计算规则",
    type: "implemented-rule",
    note: "根据年干、命宫干支与纳音推定五行局。"
  },
  {
    id: REFERENCE_IDS.STAR_PLACEMENT,
    title: "已实现星曜安星规则",
    type: "implemented-rule",
    note: "引用当前排盘模块已经完成的主星、辅星、煞曜和空曜安星结果。"
  },
  {
    id: REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS,
    title: "生年四化计算规则",
    type: "implemented-rule",
    note: "根据出生年干查表取得化禄、化权、化科、化忌，并挂回已安星曜所在宫位。"
  },
  {
    id: REFERENCE_IDS.MAJOR_PERIODS,
    title: "大限年龄段计算规则",
    type: "implemented-rule",
    note: "根据五行局数确定起限年龄，并按阳男阴女顺行、阴男阳女逆行排布十二宫大限。"
  },
  {
    id: REFERENCE_IDS.LIFE_TRIAD,
    title: "命宫与三方四正分析框架",
    type: "analysis-framework",
    note: "先看命宫，再合看财帛、官禄、迁移以建立基础格局。"
  },
  {
    id: REFERENCE_IDS.BODY_PALACE,
    title: "身宫落点分析框架",
    type: "analysis-framework",
    note: "把身宫作为后天行为重心，与命宫和三方四正合参。"
  },
  {
    id: REFERENCE_IDS.STAR_BALANCE,
    title: "星曜类别平衡分析框架",
    type: "analysis-framework",
    note: "区分主星、辅星、煞曜和空曜，避免把不同性质的星曜混为一谈。"
  }
];

export function findReferences(referenceRefs) {
  const refSet = new Set(referenceRefs);

  return REFERENCES.filter((reference) => refSet.has(reference.id));
}
