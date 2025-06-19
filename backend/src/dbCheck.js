const { Sequelize } = require('sequelize');

// Create Sequelize instance with the connection URL
const sequelize = new Sequelize('postgres://cbt_db_n891_user:zJZR3fbrIjmD5hrFDRnvUTEmUrL6s64u@dpg-d15gtteuk2gs73c727v0-a.oregon-postgres.render.com:5432/cbt_db_n891', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkDatabase() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('\n=== Database Connection Successful ===\n');

    // Query to get table information
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('=== Tables in Database ===');
    for (const table of tables) {
      const tableName = table.table_name;
      // Get count of records
      const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`, 
        { type: Sequelize.QueryTypes.SELECT });
      
      console.log(`\n=== ${tableName} ===`);
      console.log(`Total records: ${count.count}`);

      if (count.count > 0) {
        // Get sample records
        const samples = await sequelize.query(`SELECT * FROM "${tableName}" LIMIT 3`, 
          { type: Sequelize.QueryTypes.SELECT });
        console.log('Sample entries:');
        console.log(JSON.stringify(samples, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDatabase(); 