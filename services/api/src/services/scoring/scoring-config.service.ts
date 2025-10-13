import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { createScoringEngine, ScoringConfig, ScoringMode } from '@pkg/core';

export interface ScoringConfigRecord {
  id: string;
  hostId: string;
  name: string;
  description?: string | null;
  mode: ScoringMode;
  config: ScoringConfig;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScoringConfigInput {
  hostId: string;
  name: string;
  description?: string;
  mode: ScoringMode;
  config: ScoringConfig;
  isDefault?: boolean;
}

export interface UpdateScoringConfigInput {
  name?: string;
  description?: string;
  config?: ScoringConfig;
  isDefault?: boolean;
}

@Injectable()
export class ScoringConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private get store() {
    return (this.prisma as any).scoringConfiguration as {
      findMany(args?: any): Promise<RawScoringConfiguration[]>;
      findFirst(args: any): Promise<RawScoringConfiguration | null>;
      create(args: any): Promise<RawScoringConfiguration>;
      update(args: any): Promise<RawScoringConfiguration>;
      delete(args: any): Promise<void>;
      updateMany(args: any): Promise<void>;
    };
  }

  async listHostConfigs(hostId: string): Promise<ScoringConfigRecord[]> {
    const records = await this.store.findMany({
      where: { hostId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async getConfigForHost(configId: string, hostId: string): Promise<ScoringConfigRecord> {
    const record = await this.store.findFirst({
      where: { id: configId, hostId },
    });

    if (!record) {
      throw new NotFoundException('Scoring configuration not found');
    }

    return this.toDomain(record);
  }

  async ensureDefaultConfig(hostId: string): Promise<ScoringConfigRecord> {
    const existingDefault = await this.store.findFirst({
      where: { hostId, isDefault: true },
    });

    if (existingDefault) {
      return this.toDomain(existingDefault);
    }

    const engine = createScoringEngine(ScoringMode.STANDARD);
    const config = engine.getConfig();

    const created = await this.store.create({
      data: {
        hostId,
        name: 'Standard Scoring',
        description: 'Default scoring configuration',
        mode: ScoringMode.STANDARD,
        config: JSON.stringify(config),
        isDefault: true,
      },
    });

    return this.toDomain(created);
  }

  async createConfig(input: CreateScoringConfigInput): Promise<ScoringConfigRecord> {
    if (input.isDefault) {
      await this.clearDefaultFlag(input.hostId);
    }

    const created = await this.store.create({
      data: {
        hostId: input.hostId,
        name: input.name,
        description: input.description,
        mode: input.mode,
        config: JSON.stringify(input.config),
        isDefault: input.isDefault ?? false,
      },
    });

    return this.toDomain(created);
  }

  async updateConfig(configId: string, hostId: string, input: UpdateScoringConfigInput): Promise<ScoringConfigRecord> {
    const existing = await this.store.findFirst({ where: { id: configId, hostId } });
    if (!existing) {
      throw new NotFoundException('Scoring configuration not found');
    }

    if (input.isDefault) {
      await this.clearDefaultFlag(hostId, configId);
    }

    const updated = await this.store.update({
      where: { id: configId },
      data: {
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        config: input.config ? JSON.stringify(input.config) : existing.config,
        isDefault: input.isDefault ?? existing.isDefault,
      },
    });

    return this.toDomain(updated);
  }

  async deleteConfig(configId: string, hostId: string): Promise<void> {
    const existing = await this.store.findFirst({ where: { id: configId, hostId } });
    if (!existing) {
      throw new NotFoundException('Scoring configuration not found');
    }

    await this.store.delete({ where: { id: configId } });
  }

  private async clearDefaultFlag(hostId: string, excludeId?: string) {
    await this.store.updateMany({
      where: {
        hostId,
        isDefault: true,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  public toDomain(record: RawScoringConfiguration): ScoringConfigRecord {
    const parsed = this.safeParseConfig(record.config, record.mode);
    return {
      id: record.id,
      hostId: record.hostId,
      name: record.name,
      description: record.description,
      mode: record.mode as ScoringMode,
      config: parsed,
      isDefault: record.isDefault,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private safeParseConfig(config: string, mode: string): ScoringConfig {
    try {
      const parsed = JSON.parse(config) as ScoringConfig;
      return parsed;
    } catch (error) {
      const engine = createScoringEngine(mode as ScoringMode);
      return engine.getConfig();
    }
  }
}

export interface RawScoringConfiguration {
  id: string;
  hostId: string;
  name: string;
  description: string | null;
  mode: string;
  config: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
