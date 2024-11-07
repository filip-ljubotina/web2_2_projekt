const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'database',
    password: 'password',
    port: 5432,
});
export async function initializeDatabase() {
    try {
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `);

        const tableExists = tableCheck.rows[0].exists;

        if (!tableExists) {
            await pool.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(50) NOT NULL
                );
            `);


            await pool.query(`
                INSERT INTO users (username, password) 
                VALUES 
                    ('admin', 'admin123'),
                    ('user1', 'password1'),
                    ('user2', 'password2');
            `);

        } else {
            const rowCheck = await pool.query("SELECT COUNT(*) FROM users;");
            const rowCount = parseInt(rowCheck.rows[0].count, 10);

            if (rowCount === 0) {
                await pool.query(`
                    INSERT INTO users (username, password) 
                    VALUES 
                        ('admin', 'admin123'),
                        ('user1', 'password1'),
                        ('user2', 'password2');
                `);

                console.log("Inserted initial data into 'users' table.");
            }
        }
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

export default pool;
