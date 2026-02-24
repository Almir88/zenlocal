import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiUsageLogs1730000000002 implements MigrationInterface {
  name = 'CreateAiUsageLogs1730000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_usage_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" varchar(32) NOT NULL,
        "model" varchar(128) NOT NULL,
        "prompt_tokens" int NOT NULL DEFAULT 0,
        "completion_tokens" int NOT NULL DEFAULT 0,
        "total_tokens" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_usage_logs_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_usage_logs"`);
  }
}
