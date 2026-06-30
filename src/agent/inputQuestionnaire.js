// 输入追问模型。
//
// intake 只负责校验字段是否缺失；这一层负责把缺失字段转换成
// agent 可以直接用于对话的结构化问题。这样以后做聊天界面时，
// 不需要从“请补充 birth_time”这种短字符串里反推字段、示例和原因。

const QUESTION_BY_FIELD = {
  name: {
    prompt: "请告诉我命主姓名或代称。",
    example: "示例命主",
    reason: "报告标题和主语需要一个可识别的称呼。"
  },
  gender: {
    prompt: "请告诉我命主性别。",
    example: "female 或 male",
    reason: "部分紫微斗数排盘和后续限运规则会用到性别。"
  },
  calendar: {
    prompt: "请说明出生日期使用公历还是农历。",
    example: "solar 或 lunar",
    reason: "排盘前必须知道生日日期的历法体系。"
  },
  birth_date: {
    prompt: "请提供出生日期，格式为 YYYY-MM-DD。",
    example: "1990-05-18",
    reason: "出生日期用于历法转换、农历月日和年干支计算。"
  },
  birth_time: {
    prompt: "请提供出生时间，格式为 HH:MM；如果只知道时辰，也可以先说明大概时辰。",
    example: "23:30",
    reason: "出生时间用于换算时辰，并影响命宫、身宫和部分星曜。"
  },
  birth_place: {
    prompt: "请提供出生地。",
    example: "Shanghai, China",
    reason: "出生地用于记录资料来源，后续真太阳时也会依赖地点。"
  },
  analysis_date: {
    prompt: "请提供本次想分析的日期，格式为 YYYY-MM-DD；如果看当前阶段，也可以说“今天”或“今年”。",
    example: "2026-06-30",
    reason: "当前阶段和当前大限需要一个分析日期，才能按虚岁定位命主所在大限。"
  },
  timezone: {
    prompt: "请提供出生地时区。",
    example: "Asia/Shanghai",
    reason: "时区用于确认出生时间基准。"
  }
};

export function buildInputQuestions(missingFields) {
  return missingFields.map((field) => {
    const question = QUESTION_BY_FIELD[field] ?? buildFallbackQuestion(field);

    return {
      field,
      required: true,
      prompt: question.prompt,
      example: question.example,
      reason: question.reason
    };
  });
}

function buildFallbackQuestion(field) {
  return {
    prompt: `请补充 ${field}。`,
    example: field,
    reason: "这是完成排盘所需的字段。"
  };
}
