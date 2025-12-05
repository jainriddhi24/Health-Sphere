const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: 'postgresql://riddhi:coy24@localhost:5432/healthsphere' });
  const pw = 'Test@1234';
  const hash = await bcrypt.hash(pw, 10);
  try {
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'riddhi.24mcan0217@jecrcu.edu.in']);
    console.log('Password updated to Test@1234');
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await pool.end();
  }
})();
