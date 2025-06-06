import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test basic connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const tablesQuery = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log('📋 Available tables:');
    if (Array.isArray(tablesQuery)) {
      tablesQuery.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('  No tables found or unexpected result format');
    }
    
    // Check table row counts
    try {
      const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const ticketCount = await db.execute(sql`SELECT COUNT(*) as count FROM tickets`);
      const templateCount = await db.execute(sql`SELECT COUNT(*) as count FROM ticket_templates`);
      
      console.log('\n📊 Table statistics:');
      console.log(`  Users: ${userCount[0]?.count || 0}`);
      console.log(`  Tickets: ${ticketCount[0]?.count || 0}`);
      console.log(`  Templates: ${templateCount[0]?.count || 0}`);
    } catch (error) {
      console.log('⚠️  Some tables may not exist yet. Run: npm run db:push');
    }
    
    console.log('\n✅ Database check completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
}

checkDatabase();