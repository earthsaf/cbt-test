const { Sequelize } = require('sequelize');

// Use the external database URL
const DATABASE_URL = 'postgresql://cbt_db_p54i_user:ndCLl3YHvMxyCD6lEfEuhUWK5BwwmwhZ@dpg-d289auggjchc73935v6g-a.oregon-postgres.render.com/cbt_db_p54i';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkSchema() {
  try {
    console.log('Checking Answers table schema...');
    
    // Get table columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Answers';
    `);
    
    console.log('\nAnswers Table Columns:');
    console.table(columns);
    
    // Check foreign key constraints
    const [constraints] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'Answers';
    `);
    
    console.log('\nForeign Key Constraints:');
    console.table(constraints);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
