import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ScoringConfig, ScoringEngine, createCustomScoringEngine } from '@pkg/core';
import { RawScoringConfiguration, ScoringConfigRecord, ScoringConfigService } from './scoring-config.service';

interface SessionScoringRecord {
  id: string;
  sessionId: string;
  configId: string;
  createdAt: Date;
  config: ScoringConfigRecord;
}

interface RawSessionScoring {
  id: string;
  sessionId: string;
  configId: string;
  createdAt: Date;
  config: RawScoringConfiguration;
}

interface CachedEngine {
  engine: ScoringEngine;
  config: ScoringConfigRecord;
  sessionScoringId: string;
}

@Injectable()
export class SessionScoringService {
  private readonly cache = new Map<string, CachedEngine>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringConfigService: ScoringConfigService,
  ) {}

  private get store() {
    return (this.prisma as any).sessionScoring as {
      findFirst(args: any): Promise<RawSessionScoring | null>;
      upsert(args: any): Promise<RawSessionScoring>;
      create(args: any): Promise<RawSessionScoring>;
    };
  }

  async attachConfigToSession(options: { sessionId: string; hostId: string; configId?: string }) {
    const { sessionId, hostId, configId } = options;

    const session = await (this.prisma as any).session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    let config: ScoringConfigRecord;

    if (configId) {
      config = await this.scoringConfigService.getConfigForHost(configId, hostId);
    } else {
      config = await this.scoringConfigService.ensureDefaultConfig(hostId);
    }

    const record = await this.store.upsert({
      where: { sessionId },
      update: { configId: config.id },
      create: { sessionId, configId: config.id },
      include: { config: true },
    });

    this.cache.delete(sessionId);

    return this.toDomain(record, config);
  }

  async getSessionEngine(sessionId: string): Promise<CachedEngine> {
    const cached = this.cache.get(sessionId);
    if (cached) {
      return cached;
    }

    const record = await this.store.findFirst({
      where: { sessionId },
      include: { config: true },
    });

    if (!record) {
      throw new NotFoundException('Session scoring state not found');
    }

  const config = this.transformConfig(record.config);
  const engine = this.instantiateEngine(config.config);
    const cachedEngine: CachedEngine = {
      engine,
      config,
      sessionScoringId: record.id,
    };

    this.cache.set(sessionId, cachedEngine);
    return cachedEngine;
  }

  clearCache(sessionId: string) {
    this.cache.delete(sessionId);
  }

  private instantiateEngine(config: ScoringConfig) {
    const engine = createCustomScoringEngine(config);
    engine.configure(config);
    return engine;
  }

  private transformConfig(raw: RawScoringConfiguration): ScoringConfigRecord {
    return this.scoringConfigService.toDomain(raw);
  }

  private toDomain(record: RawSessionScoring, config: ScoringConfigRecord): SessionScoringRecord {
    return {
      id: record.id,
      sessionId: record.sessionId,
      configId: record.configId,
      createdAt: record.createdAt,
      config,
    };
  }

}
