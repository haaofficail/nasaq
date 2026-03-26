export interface IntegrationConfig {
  orgId: string;
  integrationId: string;
  credentials: Record<string, string>;
  config: Record<string, unknown>;
}

export abstract class IntegrationProvider {
  protected orgId: string;
  protected integrationId: string;
  protected credentials: Record<string, string>;
  protected config: Record<string, unknown>;

  constructor(cfg: IntegrationConfig) {
    this.orgId = cfg.orgId;
    this.integrationId = cfg.integrationId;
    this.credentials = cfg.credentials;
    this.config = cfg.config;
  }

  abstract testConnection(): Promise<{ ok: boolean; message?: string }>;
  sync?(): Promise<void>;
  handleWebhook?(payload: unknown, signature?: string): Promise<void>;
}
