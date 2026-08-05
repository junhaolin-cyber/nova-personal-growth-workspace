import type { FinanceCategory, FinanceDifficulty, FinanceKnowledge, FinanceQuizQuestion } from "./types";

interface KnowledgeSeed {
  title: string;
  category: FinanceCategory;
  difficulty: FinanceDifficulty;
  estimatedMinutes: number;
  summary: string;
  detail: string;
  example: string;
  commonPitfalls: string[];
  riskReminder: string;
  keywords: string[];
}

function createQuiz(id: string, title: string, summary: string): FinanceQuizQuestion[] {
  return [
    {
      id: `${id}-q1`,
      type: "选择题",
      question: `学习“${title}”时，最重要的第一步通常是什么？`,
      options: ["先理解概念和边界", "先寻找最高收益", "先跟随热门观点", "先借钱扩大金额"],
      correctAnswer: "先理解概念和边界",
      explanation: `这节内容的核心是：${summary}。先建立概念边界，再判断信息是否适用。`,
    },
    {
      id: `${id}-q2`,
      type: "判断题",
      question: `“${title}”相关的任何结论都可以直接套用到每个人身上。`,
      options: ["正确", "错误"],
      correctAnswer: "错误",
      explanation: "财务选择与目标、期限、现金流和风险承受能力有关，学习结论不能替代个人判断。",
    },
    {
      id: `${id}-q3`,
      type: "情境题",
      question: "遇到一个看起来很有吸引力的理财信息时，哪种做法更稳妥？",
      options: ["核对来源、理解风险，再决定是否继续了解", "只看收益数字", "马上投入全部可用资金", "根据朋友一句话决定"],
      correctAnswer: "核对来源、理解风险，再决定是否继续了解",
      explanation: "先验证信息和风险，再做学习或决策，是降低误判的重要习惯。",
    },
  ];
}

const seeds: KnowledgeSeed[] = [
  { title: "资产、负债与净资产", category: "基础概念", difficulty: "入门", estimatedMinutes: 6, summary: "净资产等于资产减去负债，是观察财务底子的基础指标。", detail: "资产是你拥有或控制的经济资源，负债是需要偿还的义务。把两者分开记录，才能看清真正属于自己的部分。", example: "存款、应收款属于资产；信用卡待还和贷款余额属于负债。", commonPitfalls: ["只看账户余额，不看欠款", "把消费额度当成资产"], riskReminder: "净资产只描述某个时点，不代表未来一定增长。", keywords: ["净资产", "资产负债表", "财务底子"] },
  { title: "现金流和收入的区别", category: "预算与现金流", difficulty: "入门", estimatedMinutes: 5, summary: "收入是赚到的钱，现金流关注钱何时进出以及是否够用。", detail: "稳定的现金流能帮助你按时支付必要开支。即使账面收入不错，如果收款时间和付款时间错开，也可能出现短期压力。", example: "月末发薪、月初扣款时，需要提前安排现金缓冲。", commonPitfalls: ["只统计收入，不记录付款日", "忽视一次性大额支出"], riskReminder: "现金流管理不能消除收入波动，只能帮助你提前看见压力。", keywords: ["现金流", "收入", "支付日"] },
  { title: "预算的作用", category: "预算与现金流", difficulty: "入门", estimatedMinutes: 5, summary: "预算是事前分配和事后复盘的工具，不是限制生活的惩罚。", detail: "一个好预算应当先覆盖必要支出，再给储蓄、学习和娱乐留出空间，并允许根据实际情况调整。", example: "先固定房租、交通和基本生活费，再为弹性消费设上限。", commonPitfalls: ["预算过于理想化", "只记账不复盘"], riskReminder: "预算数字应该服务于现实生活，不必追求一次制定得完美。", keywords: ["预算", "复盘", "支出分类"] },
  { title: "固定支出与可变支出", category: "预算与现金流", difficulty: "入门", estimatedMinutes: 4, summary: "区分固定与可变支出，有助于知道哪些成本短期难以调整。", detail: "房租、订阅等通常较稳定；餐饮、娱乐等会随选择变化。分类不是绝对的，重点是识别调整空间。", example: "手机套餐可能相对固定，但外卖频率通常属于可变支出。", commonPitfalls: ["把所有支出都视为固定", "忽略小额重复订阅"], riskReminder: "可变不等于随意削减，基本生活质量也需要被尊重。", keywords: ["固定支出", "可变支出", "成本"] },
  { title: "应急金是什么", category: "储蓄与目标", difficulty: "入门", estimatedMinutes: 6, summary: "应急金用于应对失业、医疗或突发维修等非计划事件。", detail: "应急金的关键是可用性和安全性，而不是追求高收益。金额应结合个人收入稳定性、家庭责任和必要开支评估。", example: "把一部分日常开支放在容易取用、波动较小的账户中。", commonPitfalls: ["把投资资产当作应急金", "为了目标金额影响基本生活"], riskReminder: "应急金不是固定标准，个人情况变化时需要重新评估。", keywords: ["应急金", "安全垫", "突发支出"] },
  { title: "短期、中期与长期目标", category: "储蓄与目标", difficulty: "入门", estimatedMinutes: 5, summary: "目标期限不同，资金的可用性和波动容忍度也应不同。", detail: "短期目标更重视稳定和可取用；长期目标可以有更多时间应对波动。先确定何时需要用钱，再讨论工具。", example: "一年内要使用的学费和十年后的退休储备，不应采用相同思路。", commonPitfalls: ["只看收益不看期限", "忽略目标可能提前发生"], riskReminder: "长期并不代表没有风险，期限也不能保证收益。", keywords: ["目标期限", "流动性", "长期"] },
  { title: "复利的基本概念", category: "基础概念", difficulty: "入门", estimatedMinutes: 6, summary: "复利表示收益继续参与后续计算，时间是其中的重要因素。", detail: "复利是数学关系，不等于任何产品都能稳定获得复利。实际结果还会受到收益变化、费用、税费和中途取用影响。", example: "定期持续投入并让收益留在账户中，才更接近复利的运作方式。", commonPitfalls: ["把复利当成保证收益", "忽略费用和波动"], riskReminder: "复利示例不代表未来实际收益，也不能倒推具体产品表现。", keywords: ["复利", "时间", "收益"] },
  { title: "通货膨胀与购买力", category: "基础概念", difficulty: "入门", estimatedMinutes: 5, summary: "物价水平变化会影响同样金额未来能买到的东西。", detail: "购买力是理解长期财务目标的重要背景。比较金额时，应同时考虑未来支出的变化，而不是只看账面数字。", example: "十年后的生活费用可能与今天不同，长期目标需要留出弹性。", commonPitfalls: ["假设物价永远不变", "用单一比例预测未来"], riskReminder: "通胀数据是整体统计，个人消费结构可能不同。", keywords: ["通胀", "购买力", "长期目标"] },
  { title: "名义收益与实际收益", category: "基础概念", difficulty: "基础", estimatedMinutes: 5, summary: "实际收益需要把通胀、费用等因素纳入考虑。", detail: "看到一个收益率时，先确认它是税前还是税后、是否扣除费用、对应的时间区间是什么，再判断其实际意义。", example: "账面收益增加，不代表购买力同样增加。", commonPitfalls: ["只比较百分比", "忽略统计口径"], riskReminder: "实际收益计算也依赖对未来通胀和费用的假设。", keywords: ["实际收益", "名义收益", "费用"] },
  { title: "储蓄率如何理解", category: "储蓄与目标", difficulty: "入门", estimatedMinutes: 4, summary: "储蓄率反映收入中留下来的比例，用于观察习惯而非评价个人。", detail: "储蓄率可以用来发现现金流趋势，但应结合收入稳定性、阶段目标和必要支出一起看。", example: "同样的储蓄率，在不同收入和家庭阶段下含义可能不同。", commonPitfalls: ["用别人标准评价自己", "为了比例忽略健康和学习"], riskReminder: "储蓄率不是越高越好，适合自己的可持续性更重要。", keywords: ["储蓄率", "现金流", "可持续"] },
  { title: "债务成本与利率", category: "预算与现金流", difficulty: "基础", estimatedMinutes: 6, summary: "借款成本不只包含名义利率，还可能包含手续费和时间成本。", detail: "比较债务时，要看实际年化成本、还款方式、提前还款规则和逾期后果。不要只看宣传中的低利率。", example: "分期手续费可能使总还款额高于直觉估算。", commonPitfalls: ["只看月供金额", "忽略逾期费用"], riskReminder: "借款合同条款复杂时，应先向正规机构核实并谨慎阅读。", keywords: ["债务", "利率", "总还款"] },
  { title: "信用记录与信用管理", category: "金融安全", difficulty: "基础", estimatedMinutes: 5, summary: "按约履约、核对记录和保护身份信息，是信用管理的基础。", detail: "信用记录通常反映借贷履约等信息。保持账单清晰、按时还款，并对异常记录及时核实。", example: "设置还款提醒，避免因为忘记日期产生不必要的逾期。", commonPitfalls: ["把信用分当成财富", "随意授权敏感信息"], riskReminder: "不同机构的评分规则可能不同，谨防所谓“快速修复信用”骗局。", keywords: ["信用记录", "还款", "身份信息"] },
  { title: "风险与收益的关系", category: "风险管理", difficulty: "入门", estimatedMinutes: 6, summary: "更高的潜在收益通常伴随更大的不确定性，不能只看收益一端。", detail: "风险可以表现为价格波动、无法及时取用、损失本金或信息不透明。先明确自己能承受什么，再学习工具。", example: "短期要用的钱，通常不适合承受很大的价格波动。", commonPitfalls: ["把历史收益当保证", "忽略最坏情境"], riskReminder: "风险无法被完全消除，只能识别、分散和管理。", keywords: ["风险", "收益", "不确定性"] },
  { title: "流动性是什么", category: "风险管理", difficulty: "入门", estimatedMinutes: 4, summary: "流动性表示资产能否在需要时较快变现，以及变现成本如何。", detail: "高流动性通常意味着更容易取用；低流动性可能需要更长时间或承担折价。目标期限是判断流动性的关键。", example: "应急支出需要优先考虑能及时取用的资金。", commonPitfalls: ["把账面价值当成可立即得到的金额", "忽略交易时间"], riskReminder: "市场压力下，流动性可能变化。", keywords: ["流动性", "变现", "期限"] },
  { title: "分散的基本思想", category: "风险管理", difficulty: "基础", estimatedMinutes: 5, summary: "分散是把风险来源分开，降低单一事件对整体的影响。", detail: "分散可以从资产、行业、地区、时间和收入来源等角度理解，但分散不能保证不亏损。", example: "不要让一个单一来源决定全部财务结果。", commonPitfalls: ["持有很多名称相似的资产", "误以为分散等于无风险"], riskReminder: "系统性风险仍可能同时影响多个资产。", keywords: ["分散", "集中风险", "相关性"] },
  { title: "保险的保障功能", category: "风险管理", difficulty: "入门", estimatedMinutes: 6, summary: "保险主要用于转移难以独自承担的重大风险，而不是单纯追求收益。", detail: "理解保障对象、免赔额、等待期、除外责任和理赔条件，比只看宣传语更重要。", example: "先梳理家庭可能难以承受的风险，再了解正规保险信息。", commonPitfalls: ["把保障和投资混为一谈", "忽略除外条款"], riskReminder: "保险条款具有法律效力，购买前应核实官方信息并充分阅读。", keywords: ["保险", "保障", "除外责任"] },
  { title: "股票代表什么", category: "股票与基金", difficulty: "入门", estimatedMinutes: 6, summary: "股票通常代表对一家公司的权益份额，也意味着承担经营和价格波动风险。", detail: "股票价格会受公司经营、行业环境、市场情绪等多种因素影响。学习股票时，应先理解权益和风险。", example: "买入股票不是把钱存进公司，而是承担价格变化和经营结果。", commonPitfalls: ["把股票当成固定收益", "只凭公司名称判断价值"], riskReminder: "任何股票都可能下跌，学习概念不等于推荐具体标的。", keywords: ["股票", "权益", "波动"] },
  { title: "基金的基本结构", category: "股票与基金", difficulty: "入门", estimatedMinutes: 6, summary: "基金集合多位投资者资金，由管理人按规则运作，并收取相关费用。", detail: "了解基金类型、投资范围、费用、申赎规则和风险等级，才能读懂产品说明。", example: "同样叫基金，可能有不同资产范围、风险和流动性。", commonPitfalls: ["只看近一年涨幅", "忽略费用和申赎限制"], riskReminder: "基金不等于保本，历史表现不代表未来。", keywords: ["基金", "费用", "投资范围"] },
  { title: "指数是什么", category: "指数与ETF", difficulty: "入门", estimatedMinutes: 5, summary: "指数是一套按照规则编制的市场表现衡量方式，不是单一资产本身。", detail: "指数通常有成分、权重、调样规则和编制方法。看指数时，要理解它代表哪一部分市场。", example: "两个指数名称相近，也可能因为成分和权重不同而表现不同。", commonPitfalls: ["把指数当作稳赚工具", "忽略编制规则"], riskReminder: "指数表现也会波动，不能由名称推断未来结果。", keywords: ["指数", "成分", "权重"] },
  { title: "ETF如何理解", category: "指数与ETF", difficulty: "基础", estimatedMinutes: 6, summary: "ETF是在交易所交易的基金份额，兼具基金组合和市场交易属性。", detail: "ETF有净值、市场价格、跟踪误差、费用和流动性等概念。学习时应区分基金净值与交易价格。", example: "交易价格可能在短时间内与参考净值存在差异。", commonPitfalls: ["以为ETF没有波动", "忽略跟踪误差和交易成本"], riskReminder: "ETF不等于低风险，具体风险取决于底层资产。", keywords: ["ETF", "净值", "跟踪误差"] },
  { title: "债券的基本关系", category: "债券与固收", difficulty: "入门", estimatedMinutes: 6, summary: "债券通常体现借贷关系，发行方承诺按约定支付利息并偿还本金。", detail: "债券的信用风险、利率风险、期限和流动性都会影响结果。固定票息不代表持有期间价格不变。", example: "市场利率变化时，存量债券的交易价格可能变化。", commonPitfalls: ["把固定票息当成无风险", "忽略发行方信用"], riskReminder: "不同债券风险差异很大，不能仅凭“债券”二字判断安全性。", keywords: ["债券", "票息", "信用风险"] },
  { title: "利率变化为什么重要", category: "债券与固收", difficulty: "基础", estimatedMinutes: 5, summary: "利率变化会影响借款成本、储蓄收益和部分资产的估值。", detail: "利率是宏观环境中的一个变量，影响路径通常需要结合期限、现金流和市场预期理解。", example: "贷款重定价、债券价格和企业融资都可能受到利率环境影响。", commonPitfalls: ["把单次变化外推很远", "忽略其他经济因素"], riskReminder: "利率变化方向和影响幅度都存在不确定性。", keywords: ["利率", "估值", "融资"] },
  { title: "时间价值与折现", category: "基础概念", difficulty: "进阶", estimatedMinutes: 7, summary: "同样金额在不同时间收到，其价值可能不同，这就是时间价值的基础。", detail: "折现把未来现金流换算到今天，常用于理解项目、债券和长期目标的价值比较。", example: "一年后收到的钱，需要考虑等待、风险和替代用途。", commonPitfalls: ["把折现率当成确定收益", "忽略现金流不确定"], riskReminder: "折现计算高度依赖假设，结果不是事实保证。", keywords: ["时间价值", "折现", "现金流"] },
  { title: "资产配置是什么", category: "资产配置", difficulty: "基础", estimatedMinutes: 7, summary: "资产配置关注不同资产在整体中的组合关系，而不是押注单一方向。", detail: "资产配置通常从目标、期限、流动性和风险承受能力出发。它是学习框架，不是针对个人的配置方案。", example: "先把短期备用资金和长期目标资金分开思考。", commonPitfalls: ["照抄他人比例", "忽略目标变化"], riskReminder: "没有一种配置适合所有人，比例示例不构成建议。", keywords: ["资产配置", "目标", "组合"] },
  { title: "再平衡的含义", category: "资产配置", difficulty: "进阶", estimatedMinutes: 6, summary: "再平衡是定期检查组合偏离情况，恢复到预先设定的结构。", detail: "再平衡的前提是先有清晰的目标结构和检查规则，也要考虑费用、税费和现实变化。", example: "某类资产占比变化后，先复盘目标是否仍然适用。", commonPitfalls: ["频繁操作", "忽略目标已变化"], riskReminder: "再平衡不保证收益，也不是预测市场的方法。", keywords: ["再平衡", "偏离", "规则"] },
  { title: "风险承受能力与风险承受意愿", category: "风险管理", difficulty: "基础", estimatedMinutes: 6, summary: "能承受多少损失和愿意承受多少波动，是两个不同问题。", detail: "能力与收入稳定性、资产负债和时间有关；意愿与心理体验有关。两者不一致时，需要优先尊重实际承受能力。", example: "长期目标不代表就一定能接受短期大幅波动。", commonPitfalls: ["只做心理问卷", "忽略现实现金流"], riskReminder: "风险评估是动态的，家庭和工作变化后需要重新认识。", keywords: ["风险能力", "风险意愿", "波动"] },
  { title: "机会成本", category: "基础概念", difficulty: "基础", estimatedMinutes: 5, summary: "选择一种用途，就放弃了其他可能用途，这种放弃就是机会成本。", detail: "机会成本帮助你比较时间、资金和注意力的替代用途，避免只看表面收益。", example: "把资金锁定在长期目标中，就可能减少短期备用空间。", commonPitfalls: ["只比较收益率", "忽略时间和精力"], riskReminder: "机会成本通常难以精确量化，只能用于辅助思考。", keywords: ["机会成本", "替代用途", "选择"] },
  { title: "沉没成本", category: "基础概念", difficulty: "基础", estimatedMinutes: 4, summary: "已经发生且无法收回的成本，不应单独决定未来选择。", detail: "复盘时应区分过去无法改变的成本和未来仍会发生的成本，避免因为不甘心而持续投入。", example: "已经支付的课程费不能决定你是否还要继续一个不合适的计划。", commonPitfalls: ["为了回本继续投入", "把情绪当成数据"], riskReminder: "沉没成本概念用于决策训练，不代表否定过去的选择。", keywords: ["沉没成本", "决策", "复盘"] },
  { title: "行为偏差：损失厌恶", category: "风险管理", difficulty: "进阶", estimatedMinutes: 6, summary: "人们对损失的敏感程度往往高于对同等收益的感受。", detail: "识别损失厌恶有助于避免在压力下做出冲动决定，例如不断加码、拒绝复盘或只寻找支持自己的信息。", example: "先写下规则和边界，再面对波动，通常更容易保持清晰。", commonPitfalls: ["把坚持误认为理性", "只看回本可能性"], riskReminder: "了解行为偏差并不能消除情绪，只能帮助你留意它。", keywords: ["行为偏差", "损失厌恶", "情绪"] },
  { title: "信息来源与交叉验证", category: "金融安全", difficulty: "入门", estimatedMinutes: 5, summary: "重要财经信息应确认来源、发布时间、数据口径和是否被断章取义。", detail: "优先阅读监管机构、上市公司公告或正规媒体的原始说明，再和多个来源交叉验证。", example: "看到“稳赚”“内部消息”等词时，先停止传播并核实。", commonPitfalls: ["只看短视频标题", "忽略发布日期"], riskReminder: "信息核实不能保证结果，但能减少被误导的概率。", keywords: ["信息核验", "来源", "诈骗"] },
  { title: "常见金融诈骗信号", category: "金融安全", difficulty: "入门", estimatedMinutes: 5, summary: "保证高收益、催促转账和要求提供验证码，都是需要警惕的信号。", detail: "面对陌生投资群、代操作、保本高息或要求下载远程控制软件的场景，应暂停并向正规渠道核实。", example: "不点击陌生链接，不向任何人提供短信验证码和私钥。", commonPitfalls: ["相信熟人转发", "先转小额试试"], riskReminder: "遇到疑似诈骗，应保存证据并联系当地正规机构。", keywords: ["诈骗", "验证码", "风险提醒"] },
  { title: "个人财务数据隐私", category: "金融安全", difficulty: "入门", estimatedMinutes: 4, summary: "账户、身份证件、验证码和交易记录都需要谨慎保护。", detail: "使用财务工具时，确认权限范围、隐私政策和设备安全，不在公开场合分享完整敏感信息。", example: "截图展示账单时遮挡姓名、账号和二维码。", commonPitfalls: ["在多个网站重复使用密码", "把验证码告诉客服"], riskReminder: "任何正规服务都不应通过非官方方式索取完整敏感凭证。", keywords: ["隐私", "账号安全", "权限"] },
  { title: "退休规划的时间维度", category: "退休与长期", difficulty: "基础", estimatedMinutes: 7, summary: "退休规划需要把时间、支出、收入来源和不确定性放在一起考虑。", detail: "长期规划可以先从估算未来生活方式和支出开始，再定期根据工作、家庭和健康变化复盘。", example: "先记录当前必要支出，再思考未来可能增加的医疗和照护支出。", commonPitfalls: ["只看一个目标金额", "忽略通胀和寿命不确定"], riskReminder: "长期测算只是情景假设，不是对未来的承诺。", keywords: ["退休", "长期规划", "支出"] },
  { title: "教育金与长期目标", category: "退休与长期", difficulty: "基础", estimatedMinutes: 6, summary: "长期目标的关键是把目标时间、金额和不确定变化拆开记录。", detail: "为长期目标学习时，先区分刚性支出和可调整支出，再设置定期检查点，不要追求一次预测准确。", example: "每年更新一次教育、住房或照护目标的假设。", commonPitfalls: ["把未来费用当成固定不变", "只在压力出现时才检查"], riskReminder: "长期目标可能因家庭和政策变化调整，预留弹性很重要。", keywords: ["教育金", "目标管理", "弹性"] },
  { title: "税费和投资成本", category: "基础概念", difficulty: "基础", estimatedMinutes: 5, summary: "费用、税费和交易成本会影响最终结果，不能只看毛收益。", detail: "阅读说明时注意管理费、托管费、申赎费、交易费和税务规则，确认口径和适用条件。", example: "频繁交易可能累积更多成本，即使每次金额不大。", commonPitfalls: ["忽略小比例长期累积", "混淆费率和实际金额"], riskReminder: "税务规则可能因地区和个人情况变化，应咨询正规专业人士。", keywords: ["费用", "税费", "成本"] },
  { title: "金融产品说明书怎么读", category: "金融安全", difficulty: "基础", estimatedMinutes: 7, summary: "先看产品投向、风险等级、期限、费用和退出条件，再看宣传文案。", detail: "阅读顺序可以从“是什么、投什么、怎么收钱、可能亏什么、如何退出”开始，遇到不理解的条款先停下来核实。", example: "把“业绩比较基准”与“承诺收益”区分开。", commonPitfalls: ["只看首页收益图", "跳过风险揭示"], riskReminder: "宣传材料不等同于保证，具体以正式文件和合同为准。", keywords: ["说明书", "风险揭示", "合同"] },
  { title: "用情景分析代替预测", category: "资产配置", difficulty: "进阶", estimatedMinutes: 6, summary: "情景分析是讨论不同可能情况，而不是预测唯一结果。", detail: "可以分别思考收入下降、支出增加、市场波动和提前用钱等情景，观察计划是否仍然可承受。", example: "先问“如果晚一年实现目标怎么办”，再调整缓冲。", commonPitfalls: ["只做乐观情景", "给概率制造虚假精确感"], riskReminder: "情景分析不能预测市场，只是帮助发现薄弱环节。", keywords: ["情景分析", "压力测试", "不确定性"] },
  { title: "定投与规律性投入", category: "指数与ETF", difficulty: "基础", estimatedMinutes: 6, summary: "规律性投入是一种时间安排方式，不能消除市场波动或保证收益。", detail: "定投的学习重点是现金流稳定、长期纪律和费用管理。投入前仍需确认资金期限和风险边界。", example: "固定日期投入小额资金，不代表每次价格都合适。", commonPitfalls: ["认为定投一定赚钱", "忽视中途需要用钱"], riskReminder: "定投仍可能亏损，不能作为针对个人的投资建议。", keywords: ["定投", "纪律", "波动"] },
  { title: "长期投资与长期持有的区别", category: "股票与基金", difficulty: "基础", estimatedMinutes: 5, summary: "长期是时间长度，不等于长期一定获得收益或不需要复盘。", detail: "长期学习需要关注目标是否变化、资产是否仍符合原本假设，以及自己是否能承受波动。", example: "持有时间长并不能替代对风险和流动性的检查。", commonPitfalls: ["用长期掩盖没有理解", "拒绝任何复盘"], riskReminder: "长期持有不代表无风险，历史表现也不保证未来。", keywords: ["长期", "持有", "复盘"] },
  { title: "财务目标的优先级", category: "储蓄与目标", difficulty: "入门", estimatedMinutes: 5, summary: "目标需要按必要性、时间和不可逆后果排序。", detail: "先保障基本生活和应急空间，再安排弹性目标。优先级清晰，能减少目标之间互相挤压。", example: "先处理高成本债务和必要保障，再考虑更远的愿望。", commonPitfalls: ["所有目标同等重要", "只追求看得见的目标"], riskReminder: "优先级因个人阶段而异，不能照搬他人顺序。", keywords: ["优先级", "目标", "现金流"] },
  { title: "财务复盘的正确方式", category: "预算与现金流", difficulty: "入门", estimatedMinutes: 5, summary: "复盘是理解发生了什么并调整下一步，不是简单责备自己。", detail: "可以记录计划与实际差异、意外支出、情绪触发点和下个月的小调整。连续的小改进比追求完美更容易坚持。", example: "把“超支”拆成具体场景，而不是只写一句失败。", commonPitfalls: ["只看结果不看原因", "一次复盘改太多"], riskReminder: "预算管理应当支持生活，不必制造长期焦虑。", keywords: ["复盘", "差异", "习惯"] },
  { title: "金融知识与投资建议的边界", category: "金融安全", difficulty: "入门", estimatedMinutes: 4, summary: "学习通用原理和接受针对个人的投资建议，是两件不同的事。", detail: "理财学习可以帮你建立词汇、问题清单和核验能力，但不能替代持牌机构、专业人士或个人独立判断。", example: "遇到复杂产品，先整理问题，再向正规渠道咨询。", commonPitfalls: ["把科普当成买卖指令", "把AI回答当成保证"], riskReminder: "本工作台只提供财经教育内容，不提供个性化投资建议。", keywords: ["边界", "科普", "独立判断"] },
];

export const financeKnowledge: FinanceKnowledge[] = seeds.map((seed, index) => {
  const id = `finance-${String(index + 1).padStart(2, "0")}`;
  return {
    ...seed,
    id,
    relatedConcepts: seed.keywords.slice(0, 3),
    quiz: createQuiz(id, seed.title, seed.summary),
  };
});

export const financeKnowledgeMap = new Map(financeKnowledge.map((item) => [item.id, item]));
