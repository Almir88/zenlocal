import * as path from 'path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: path.join(process.cwd(), '.env') });

const host = (process.env.DATABASE_HOST || 'localhost').trim();
const port = process.env.DATABASE_PORT?.trim() || '5432';
const user = (process.env.DATABASE_USER || 'postgres').trim();
const password = (process.env.DATABASE_PASSWORD ?? '').replace(/^["']|["']$/g, '').trim();
const database = (process.env.DATABASE_NAME || 'zenlocal').trim();

const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?sslmode=disable`;

const MigrationDataSource = new DataSource({
  type: 'postgres',
  url,
  entities: [path.join(__dirname, 'src/entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'src/migrations/*{.ts,.js}')],
  synchronize: false,
});

async function run() {
  await MigrationDataSource.initialize();
  await MigrationDataSource.runMigrations();
  console.log('Migrations completed');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
