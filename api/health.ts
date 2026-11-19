import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from './_lib/db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const sql = getSql();
    const rows = await sql`SELECT NOW() AS server_time, (SELECT COUNT(*)::int FROM users) AS user_count`;
    return res.status(200).json({
      ok: true,
      service: 'petcare-ai-api',
      database: 'neon-postgresql-connected',
      region: 'aws-ap-southeast-1',
      serverTime: rows[0]?.server_time,
      registeredUsers: rows[0]?.user_count ?? 0
    });
  } catch (err) {
    console.error('Health check failed:', err);
    return res.status(500).json({
      ok: false,
      database: 'error',
      message: 'Database health check failed'
    });
  }
}
