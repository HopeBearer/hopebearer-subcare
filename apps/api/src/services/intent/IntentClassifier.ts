/**
 * SubCare Intent Classifier v2
 * 问题意图分类器 - 采用多层匹配策略，防止误判
 * 
 * 设计原则：
 * 1. 宁可漏判（fallback to GENERAL_QA）也不可误判（错误触发 DB 查询）
 * 2. 必须同时命中"动作词"+"实体词"才能触发 DB 类意图
 * 3. 优先级：DB_MUTATION > DB_AGGREGATE > DB_FACT > GENERAL_QA > CHAT
 * 4. 使用组合匹配而非单一关键词匹配
 */

/**
 * 意图类型枚举
 */
export enum QueryIntent {
  /** 统计/计数/聚合查询（必须查数据库） */
  DB_AGGREGATE = 'DB_AGGREGATE',
  /** 事实性查询（必须查数据库） */
  DB_FACT = 'DB_FACT',
  /** 订阅操作（增删改） */
  DB_MUTATION = 'DB_MUTATION',
  /** 服务信息查询（必须调用 lookup + 可能 search_web） */
  SERVICE_INFO = 'SERVICE_INFO',
  /** 常识/解释型问题 */
  GENERAL_QA = 'GENERAL_QA',
  /** 闲聊/情感交流 */
  CHAT = 'CHAT',
}

/**
 * 需要强制调用数据库工具的意图类型（仅查询类）
 * 注意：DB_MUTATION 不在此列表中，因为添加/修改操作需要让 LLM 决定工具调用
 */
export const DB_REQUIRED_INTENTS = [
  QueryIntent.DB_FACT,
  QueryIntent.DB_AGGREGATE,
];

/**
 * 需要强制调用服务查询工具的意图类型
 */
export const SERVICE_LOOKUP_REQUIRED_INTENTS = [
  QueryIntent.SERVICE_INFO,
];

/**
 * 实体词库 - 与订阅/消费相关的实体
 */
const ENTITY_WORDS = {
  subscription: [
    // 中文
    '订阅', '会员', '服务', '套餐', '账号',
    // 英文
    'subscription', 'subscriptions', 'membership', 'service', 'plan', 'account',
    // 具体服务名（常见）
    'netflix', 'spotify', 'youtube', 'apple', 'icloud', 'office', 'adobe',
    'notion', 'figma', 'github', 'openai', 'chatgpt', 'midjourney'
  ],
  money: [
    // 中文
    '钱', '费用', '花费', '支出', '消费', '账单', '花销', '开销', '费', '块', '元',
    // 英文
    'money', 'cost', 'expense', 'spending', 'bill', 'payment', 'dollar', 'yuan', 'rmb', 'usd', 'cny'
  ],
  category: [
    // 中文
    '分类', '类别', '类型', '种类',
    // 英文
    'category', 'categories', 'type', 'types', 'kind', 'kinds'
  ],
  time: [
    // 中文
    '本月', '上月', '这月', '上个月', '这个月', '今年', '去年', '本周', '上周',
    '月', '年', '周', '天', '日',
    // 英文
    'month', 'year', 'week', 'day', 'today', 'yesterday', 'this', 'last', 'next'
  ]
};

/**
 * 动作词库 - 表示用户意图的动作
 */
const ACTION_WORDS = {
  count: [
    // 中文
    '多少', '几个', '几项', '有多少', '有几个', '总共', '一共', '共有', '总计', '数量',
    '统计', '汇总', '概览', '分析',
    // 英文
    'how many', 'how much', 'count', 'total', 'number of'
  ],
  list: [
    // 中文
    '列出', '查看', '显示', '看看', '有哪些', '都有什么',
    // 英文
    'list', 'show', 'display', 'what are', 'which'
  ],
  add: [
    // 中文
    '添加', '新增', '加个', '加一个', '订阅一个', '开通', '买',
    // 英文
    'add', 'subscribe', 'create', 'new', 'start', 'buy', 'get'
  ],
  remove: [
    // 中文
    '取消', '删除', '移除', '退订', '停止', '关闭', '不要了', '不续费',
    // 英文
    'cancel', 'delete', 'remove', 'unsubscribe', 'stop'
  ],
  modify: [
    // 中文
    '修改', '更改', '改', '更新', '调整',
    // 英文
    'update', 'change', 'modify', 'edit'
  ],
  confirm: [
    // 中文 - 确认支付相关
    '支付', '已支付', '付了', '付过', '付款', '已付', '确认', '已经', '付完', '交了',
    // 英文
    'paid', 'pay', 'confirm', 'confirmed', 'done', 'finished', 'completed'
  ],
  query_status: [
    // 中文 - 用于模糊状态查询
    '情况', '状态', '怎么样', '怎样', '现在', '目前',
    // 英文
    'status', 'situation', 'how is', 'currently', 'right now'
  ]
};

/**
 * 排除词库 - 命中这些词时降低 DB 意图置信度
 */
const EXCLUSION_WORDS = {
  general_discussion: [
    // 中文 - 表示讨论/建议/看法
    '建议', '看法', '认为', '觉得', '意见', '想法', '理解', '感觉',
    // 英文
    'suggest', 'opinion', 'think', 'feel', 'believe', 'view', 'idea'
  ],
  external_entities: [
    // 表示询问外部事物而非用户自己的数据
    '是什么', '怎么收费', '价格多少', '多少钱一个月', '推荐', '介绍',
    'what is', 'how does', 'pricing', 'recommend', 'introduce', 'explain'
  ]
};

/**
 * 所有格模式 - 判断是否在询问"我的"东西
 */
const POSSESSIVE_PATTERNS = {
  zh: [/我的/, /我有/, /我订/, /我买/, /我用/, /给我/],
  en: [/\bmy\b/i, /\bmine\b/i, /\bi have\b/i, /\bi've\b/i, /\bi got\b/i]
};

/**
 * Intent 分类结果
 */
export interface IntentClassificationResult {
  intent: QueryIntent;
  confidence: number;
  requiredTools: string[];
  /** 是否需要强制调用数据库工具 */
  requiresDbCall: boolean;
  /** 是否需要强制调用服务查询工具（lookup_subscription_service） */
  requiresServiceLookup?: boolean;
  /** 匹配详情（用于调试） */
  matchDetails?: {
    hasEntity: boolean;
    hasAction: boolean;
    hasPossessive: boolean;
    hasExclusion: boolean;
    entityMatches: string[];
    actionMatches: string[];
  };
}

/**
 * SubCare Intent 分类器 v2
 */
export class IntentClassifier {
  /**
   * 对用户输入进行意图分类
   */
  classify(userInput: string): IntentClassificationResult {
    const input = userInput.toLowerCase().trim();
    
    // Step 1: 提取匹配信息
    const entityMatches = this.findMatches(input, [
      ...ENTITY_WORDS.subscription,
      ...ENTITY_WORDS.money,
      ...ENTITY_WORDS.category  // 添加分类实体词匹配
    ]);
    const hasEntity = entityMatches.length > 0;

    const actionMatches = {
      count: this.findMatches(input, ACTION_WORDS.count),
      list: this.findMatches(input, ACTION_WORDS.list),
      add: this.findMatches(input, ACTION_WORDS.add),
      remove: this.findMatches(input, ACTION_WORDS.remove),
      modify: this.findMatches(input, ACTION_WORDS.modify),
      confirm: this.findMatches(input, ACTION_WORDS.confirm),
      query_status: this.findMatches(input, ACTION_WORDS.query_status)
    };

    const hasPossessive = this.matchesPatterns(input, [
      ...POSSESSIVE_PATTERNS.zh,
      ...POSSESSIVE_PATTERNS.en
    ]);

    const hasExclusion = this.findMatches(input, [
      ...EXCLUSION_WORDS.general_discussion,
      ...EXCLUSION_WORDS.external_entities
    ]).length > 0;

    // Step 2: 意图判定（按优先级）
    const result = this.determineIntent(input, {
      hasEntity,
      hasPossessive,
      hasExclusion,
      actionMatches,
      entityMatches
    });

    console.log('[IntentClassifier] Classification:', {
      input: input.substring(0, 50),
      intent: result.intent,
      confidence: result.confidence,
      matchDetails: result.matchDetails
    });

    return result;
  }

  /**
   * 根据匹配信息判定意图
   */
  private determineIntent(
    input: string,
    context: {
      hasEntity: boolean;
      hasPossessive: boolean;
      hasExclusion: boolean;
      actionMatches: Record<string, string[]>;
      entityMatches: string[];
    }
  ): IntentClassificationResult {
    const { hasEntity, hasPossessive, hasExclusion, actionMatches, entityMatches } = context;

    const matchDetails = {
      hasEntity,
      hasAction: Object.values(actionMatches).some(arr => arr.length > 0),
      hasPossessive,
      hasExclusion,
      entityMatches,
      actionMatches: Object.entries(actionMatches)
        .filter(([_, v]) => v.length > 0)
        .map(([k, v]) => `${k}:${v.join(',')}`)
    };

    // ============ 优先级 1: DB_MUTATION (操作类) ============
    // 必须同时有：操作动作词 + 实体词（或所有格）
    // 注意：DB_MUTATION 不走 handleDbQuery，而是让 LLM 决定调用工具
    if (actionMatches.add.length > 0 || actionMatches.remove.length > 0 || actionMatches.modify.length > 0) {
      if (hasEntity || hasPossessive) {
        const mutationType = actionMatches.remove.length > 0 ? 'remove' 
          : actionMatches.add.length > 0 ? 'add' 
          : 'modify';
        
        return {
          intent: QueryIntent.DB_MUTATION,
          confidence: 0.9,
          requiredTools: this.getToolsForMutation(mutationType),
          requiresDbCall: false, // 操作类不走 DB 查询路径，让 LLM 决定工具调用
          matchDetails
        };
      }
    }

    // ============ 优先级 1.5: 确认支付操作 ============
    // 用户说"已支付"、"付了"等，即使没有实体词也是 MUTATION
    // 因为这是对上一轮对话的响应
    if (actionMatches.confirm.length > 0) {
      return {
        intent: QueryIntent.DB_MUTATION,
        confidence: 0.85,
        requiredTools: ['confirm_bill_payment'],
        requiresDbCall: false,
        matchDetails
      };
    }

    // ============ 优先级 2: DB_AGGREGATE (统计类) ============
    // 必须同时有：统计动作词 + (实体词 OR 所有格)
    // 且不能有排除词
    if (actionMatches.count.length > 0 && !hasExclusion) {
      // 必须有实体或所有格
      if (hasEntity || hasPossessive) {
        // 分类查询是系统级查询，不需要 hasPossessive
        // 花费/订阅查询是个人查询
        const isCategoryQuery = this.hasCategoryEntity(entityMatches);
        const isPersonalQuery = hasPossessive || 
          this.hasMoneyEntity(entityMatches) ||  // 花费类默认是个人
          this.hasSubscriptionEntity(entityMatches);
        
        if (isCategoryQuery || isPersonalQuery) {
          return {
            intent: QueryIntent.DB_AGGREGATE,
            confidence: 0.95,
            requiredTools: this.getToolsForAggregate(entityMatches),
            requiresDbCall: true,
            matchDetails
          };
        }
      }
    }

    // ============ 优先级 3: DB_FACT (事实查询) ============
    // 必须同时有：(列表动作词 OR 所有格) + 订阅实体词
    // 且不能有排除词
    if (!hasExclusion) {
      const hasListAction = actionMatches.list.length > 0;
      const hasStatusQuery = actionMatches.query_status.length > 0;
      
      // "我的订阅" / "列出我的订阅" / "查看订阅"
      if ((hasListAction || hasPossessive || hasStatusQuery) && this.hasSubscriptionEntity(entityMatches)) {
        // 额外检查：必须是询问"自己的"而非"某个服务的"
        if (hasPossessive || hasListAction) {
          return {
            intent: QueryIntent.DB_FACT,
            confidence: 0.85,
            requiredTools: ['search_my_subscriptions'],
            requiresDbCall: true,
            matchDetails
          };
        }
      }

      // 模糊状态查询 + 所有格（"我现在情况怎么样"）
      if (hasStatusQuery && hasPossessive) {
        return {
          intent: QueryIntent.DB_FACT,
          confidence: 0.7,
          requiredTools: ['search_my_subscriptions', 'get_spending_summary'],
          requiresDbCall: true,
          matchDetails
        };
      }
    }

    // ============ 优先级 4: SERVICE_INFO (服务信息查询) ============
    // 有排除词（询问服务信息/收费/推荐）+ 有实体
    // 这类问题需要强制调用 lookup_subscription_service + 可能 search_web
    if (hasExclusion && hasEntity) {
      return {
        intent: QueryIntent.SERVICE_INFO,
        confidence: 0.85,
        requiredTools: ['lookup_subscription_service', 'search_web'],
        requiresDbCall: false,
        requiresServiceLookup: true,
        matchDetails
      };
    }

    // 询问某个服务但没有所有格（如 "Netflix 是什么"、"Spotify 价格多少"）
    if (hasEntity && !hasPossessive && !matchDetails.hasAction) {
      return {
        intent: QueryIntent.SERVICE_INFO,
        confidence: 0.7,
        requiredTools: ['lookup_subscription_service', 'search_web'],
        requiresDbCall: false,
        requiresServiceLookup: true,
        matchDetails
      };
    }

    // ============ 优先级 5: GENERAL_QA (通用问题) ============
    // 没有明确实体的一般性问题
    if (hasExclusion && !hasEntity) {
      return {
        intent: QueryIntent.GENERAL_QA,
        confidence: 0.5,
        requiredTools: [],
        requiresDbCall: false,
        matchDetails
      };
    }

    // ============ 优先级 5: CHAT (闲聊) ============
    // 默认 fallback - 宁可当闲聊也不误判为 DB 查询
    return {
      intent: QueryIntent.CHAT,
      confidence: 0.5,
      requiredTools: [],
      requiresDbCall: false,
      matchDetails
    };
  }

  /**
   * 查找匹配的词
   */
  private findMatches(input: string, words: string[]): string[] {
    return words.filter(word => input.includes(word.toLowerCase()));
  }

  /**
   * 检查是否匹配任意正则模式
   */
  private matchesPatterns(input: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * 检查是否有订阅相关实体
   */
  private hasSubscriptionEntity(matches: string[]): boolean {
    return matches.some(m => ENTITY_WORDS.subscription.includes(m));
  }

  /**
   * 检查是否有金钱相关实体
   */
  private hasMoneyEntity(matches: string[]): boolean {
    return matches.some(m => ENTITY_WORDS.money.includes(m));
  }

  /**
   * 获取操作类工具
   */
  private getToolsForMutation(type: string): string[] {
    switch (type) {
      case 'add':
        return ['quick_add_subscription', 'lookup_subscription_service'];
      case 'remove':
        return ['search_my_subscriptions', 'cancel_subscription'];
      case 'modify':
        return ['search_my_subscriptions'];
      default:
        return ['search_my_subscriptions'];
    }
  }

  /**
   * 获取统计类工具
   */
  private getToolsForAggregate(entityMatches: string[]): string[] {
    // 分类查询优先
    if (this.hasCategoryEntity(entityMatches)) {
      return ['list_categories'];
    }
    if (this.hasMoneyEntity(entityMatches)) {
      return ['get_spending_summary'];
    }
    return ['search_my_subscriptions'];
  }

  /**
   * 检查是否有分类相关实体
   */
  private hasCategoryEntity(matches: string[]): boolean {
    return matches.some(m => ENTITY_WORDS.category.includes(m));
  }
}

// 导出单例
export const intentClassifier = new IntentClassifier();
