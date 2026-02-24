import * as path from 'path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: path.join(process.cwd(), '.env') });

const useUrl = process.env.DATABASE_URL && !process.env.DATABASE_PASSWORD;
const password = process.env.DATABASE_PASSWORD?.replace(/^["']|["']$/g, '').trim();

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(useUrl
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: (process.env.DATABASE_USER || 'postgres').trim(),
        password,
        database: (process.env.DATABASE_NAME || 'zenlocal').trim(),
      }),
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
