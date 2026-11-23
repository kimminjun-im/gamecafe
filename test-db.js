require('dotenv').config();
const pool = require('./config/database');

async function testDatabaseConnection() {
  console.log('========================================================');
  console.log('🔍 GameCafe Database Connection Test');
  console.log('========================================================');
  console.log(`📡 Target Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  console.log(`👤 Database User: ${process.env.DB_USER || 'root'}`);
  console.log(`🗄️  Database Name: ${process.env.DB_NAME || 'gamecafe'}`);
  console.log('--------------------------------------------------------');

  try {
    // 1. 기본 쿼리 핑 테스트
    const [pingResult] = await pool.query('SELECT 1 + 1 AS connection_test');
    if (pingResult && pingResult[0].connection_test === 2) {
      console.log('✅ [1/4] MySQL 서버 커넥션 풀 연결 성공!');
    }

    // 2. MySQL 버전 확인
    const [versionResult] = await pool.query('SELECT VERSION() AS version');
    console.log(`✅ [2/4] MySQL 서버 버전: ${versionResult[0].version}`);

    // 3. 테이블 목록 확인
    const [tables] = await pool.query('SHOW TABLES');
    console.log(`✅ [3/4] 생성된 테이블 수: ${tables.length}개`);
    if (tables.length > 0) {
      const tableNames = tables.map(t => Object.values(t)[0]).join(', ');
      console.log(`   📋 테이블 목록: ${tableNames}`);
    } else {
      console.log('   ⚠️  아직 테이블이 생성되지 않았습니다. sql/schema.sql을 실행해 주세요.');
    }

    // 4. 초기 게임 및 카테고리 데이터 카운트 확인
    if (tables.length > 0) {
      const [[gameCount]] = await pool.query('SELECT COUNT(*) AS count FROM games');
      const [[catCount]] = await pool.query('SELECT COUNT(*) AS count FROM board_categories');
      const [[postCount]] = await pool.query('SELECT COUNT(*) AS count FROM posts');
      console.log(`✅ [4/4] 데이터 현황: 게임 ${gameCount.count}개, 카테고리 ${catCount.count}개, 게시글 ${postCount.count}개`);
    }

    console.log('========================================================');
    console.log('🎉 데이터베이스 연결 및 상태 점검이 완료되었습니다!');
    console.log('========================================================');
  } catch (error) {
    console.error('❌ [연결 실패] 데이터베이스 연결 중 오류가 발생했습니다:');
    console.error(`   - 에러 코드: ${error.code || 'UNKNOWN'}`);
    console.error(`   - 메시지: ${error.message}`);
    console.log('--------------------------------------------------------');
    console.log('💡 문제 해결 가이드:');
    console.log(' 1. MySQL 서비스가 실행 중인지 확인: sudo systemctl status mysql (또는 service mysql status)');
    console.log(' 2. .env 파일의 DB_USER, DB_PASSWORD, DB_NAME이 정확한지 확인');
    console.log(' 3. 데이터베이스가 없을 경우: mysql -u root -p -e "CREATE DATABASE gamecafe;"');
    console.log(' 4. 스키마 실행: mysql -u root -p gamecafe < sql/schema.sql');
    console.log(' 5. 초기 데이터 실행: mysql -u root -p gamecafe < sql/seed.sql');
    console.log('========================================================');
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
