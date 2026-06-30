import { buildChart } from "../chartBuilder.js";
import { BIRTH_PROFILE_FIELDS } from "../intake.js";
import { parseProfilePatchFromText } from "./profilePatchParser.js";
import { runZiweiPipeline } from "./ziweiPipeline.js";

// 多轮资料采集会反复发生两件事：
// 1. 保留已经确认过的出生资料。
// 2. 把用户新补充的字段合并进去，再重新跑 agent 流程。
//
// 这个模块只负责“资料草稿”的状态流转，不负责解析自然语言，
// 也不负责命盘规则。以后无论是 CLI、Web 表单还是 LLM tool，
// 都可以先把识别出的字段交给这里统一合并。

const PROFILE_FIELDS = new Set(BIRTH_PROFILE_FIELDS);

export function createIntakeSession(initialProfile = {}, profilePatch = {}) {
  const profileDraft = mergeProfileDraft(initialProfile, profilePatch);
  const buildResult = buildChart(profileDraft);
  const pipelineResult = runZiweiPipeline(buildResult);

  return {
    status: pipelineResult.status,
    profileDraft,
    buildResult,
    pipelineResult,
    questionItems: pipelineResult.agentResult.questionItems,
    nextQuestions: pipelineResult.agentResult.nextQuestions,
    nextAction: pipelineResult.nextAction
  };
}

export function createIntakeSessionFromText(initialProfile = {}, text = "") {
  const parsedPatch = parseProfilePatchFromText(text);
  const session = createIntakeSession(initialProfile, parsedPatch.patch);

  return {
    ...session,
    extractedItems: parsedPatch.extractedItems
  };
}

export function mergeProfileDraft(initialProfile = {}, profilePatch = {}) {
  return {
    ...pickProfileFields(initialProfile),
    ...pickProfileFields(profilePatch)
  };
}

function pickProfileFields(profile) {
  const picked = {};

  for (const [field, value] of Object.entries(profile ?? {})) {
    // undefined 通常表示“没有解析出这个字段”，不应该覆盖已有草稿。
    // 空字符串仍然保留，因为它可以表达用户主动清空或撤回某个字段。
    if (PROFILE_FIELDS.has(field) && value !== undefined) {
      picked[field] = value;
    }
  }

  return picked;
}
