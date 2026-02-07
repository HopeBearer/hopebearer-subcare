import { ToolDefinition } from '../interfaces/LLMProvider';

type JsonSchema = {
  type: 'object';
  properties?: Record<string, { type?: string; enum?: unknown[] }>;
  required?: string[];
};

export interface ToolCallLimits {
  maxTotalCalls: number;
  maxPerToolCalls?: Record<string, number>;
}

export interface ToolGuardResult {
  allowed: boolean;
  reason?: string;
  errors?: string[];
  normalizedArgs: Record<string, unknown>;
}

export class ToolCallGovernor {
  private totalCalls = 0;
  private perToolCalls = new Map<string, number>();
  private definitions: Map<string, ToolDefinition>;
  private limits: ToolCallLimits;

  constructor(definitions: ToolDefinition[], limits: ToolCallLimits) {
    this.definitions = new Map(definitions.map(def => [def.function.name, def]));
    this.limits = limits;
  }

  guard(toolName: string, args: Record<string, unknown>): ToolGuardResult {
    const normalizedArgs = this.normalizeArgs(toolName, args);
    const errors = this.validateArgs(toolName, normalizedArgs);
    const limitResult = this.checkLimits(toolName);

    if (!limitResult.allowed) {
      return {
        allowed: false,
        reason: limitResult.reason,
        normalizedArgs
      };
    }

    if (errors.length > 0) {
      return {
        allowed: false,
        reason: 'INVALID_TOOL_ARGS',
        errors,
        normalizedArgs
      };
    }

    return { allowed: true, normalizedArgs };
  }

  recordCall(toolName: string) {
    this.totalCalls += 1;
    const current = this.perToolCalls.get(toolName) || 0;
    this.perToolCalls.set(toolName, current + 1);
  }

  private checkLimits(toolName: string): { allowed: boolean; reason?: string } {
    if (this.totalCalls >= this.limits.maxTotalCalls) {
      return { allowed: false, reason: 'TOOL_CALL_LIMIT' };
    }

    const perToolLimit = this.limits.maxPerToolCalls?.[toolName];
    if (perToolLimit !== undefined) {
      const current = this.perToolCalls.get(toolName) || 0;
      if (current >= perToolLimit) {
        return { allowed: false, reason: 'TOOL_CALL_LIMIT' };
      }
    }

    return { allowed: true };
  }

  private normalizeArgs(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
    const schema = this.getSchema(toolName);
    if (!schema || !schema.properties) {
      return args;
    }

    const normalized: Record<string, unknown> = { ...args };
    for (const [key, prop] of Object.entries(schema.properties)) {
      const value = normalized[key];
      if (prop.type === 'number' && typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
          normalized[key] = Number(trimmed);
        }
      }
    }
    return normalized;
  }

  private validateArgs(toolName: string, args: Record<string, unknown>): string[] {
    const schema = this.getSchema(toolName);
    if (!schema) {
      return [];
    }

    const errors: string[] = [];
    const required = schema.required || [];
    for (const key of required) {
      if (args[key] === undefined || args[key] === null || args[key] === '') {
        errors.push(`Missing required field: ${key}`);
      }
    }

    const properties = schema.properties || {};
    for (const [key, prop] of Object.entries(properties)) {
      if (args[key] === undefined || args[key] === null) {
        continue;
      }
      const expectedType = prop.type;
      if (expectedType && !this.matchesType(args[key], expectedType)) {
        errors.push(`Invalid type for ${key}: expected ${expectedType}`);
      }
      if (prop.enum && !prop.enum.includes(args[key])) {
        errors.push(`Invalid value for ${key}: must be one of ${prop.enum.join(', ')}`);
      }
    }

    return errors;
  }

  private matchesType(value: unknown, expectedType: string): boolean {
    if (expectedType === 'array') {
      return Array.isArray(value);
    }
    if (expectedType === 'object') {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    return typeof value === expectedType;
  }

  private getSchema(toolName: string): JsonSchema | undefined {
    const def = this.definitions.get(toolName);
    const schema = def?.function.parameters;
    if (schema && schema.type === 'object') {
      return schema as JsonSchema;
    }
    return undefined;
  }
}
