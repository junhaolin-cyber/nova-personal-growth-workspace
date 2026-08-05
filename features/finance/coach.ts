import type { FinanceCoachMessage, FinanceKnowledge } from "./types";

export function getFinanceCoachReply(question: string, knowledge?: FinanceKnowledge): Omit<FinanceCoachMessage, "id" | "createdAt" | "role"> {
  const riskyTerms = ["买什么", "买哪只", "推荐股票", "推荐基金", "什么时候买", "什么时候卖", "稳赚", "收益保证", "配置比例"];
  if (riskyTerms.some((term) => question.includes(term))) {
    return { content: "我可以帮你学习相关概念、比较风险和整理核验问题，但不能推荐具体股票、基金、买卖时机或个性化投资方案。你可以先从风险、期限、流动性和费用四个角度理解这个问题。", keyPoints: ["先明确目标和期限", "核对来源与费用", "不要把科普当成买卖指令"], riskReminder: "本教练为本地模拟学习功能，不构成投资建议。" };
  }
  const title = knowledge?.title ?? "今天的理财学习";
  return { content: `围绕“${title}”，建议先用一句话说清楚它解决什么问题，再观察它与现金流、期限和风险之间的关系。你可以把今天的理解写进反思区，之后再用自己的例子复述一次。`, keyPoints: knowledge?.relatedConcepts.map((item) => `关注：${item}`) ?? ["概念边界", "现实场景", "风险提醒"], riskReminder: "本教练只提供财经教育解释，不提供具体产品或个人投资建议。" };
}
