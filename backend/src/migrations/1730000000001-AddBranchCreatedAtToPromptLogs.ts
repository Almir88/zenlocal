import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchCreatedAtToPromptLogs1730000000001
  implements MigrationInterface
{
  name = 'AddBranchCreatedAtToPromptLogs1730000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "prompt_logs"
      ADD COLUMN "branch_created_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "prompt_logs"
      DROP COLUMN "branch_created_at"
    `);
  }
}
