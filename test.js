// gen-user.js
const bcrypt = require('bcryptjs');

// 配置你的测试账号
const username = 'admin';
const password = 'wemstopadmin123456';   // 你想设置的密码
const role = 'admin';        // 角色：'admin' 或 'user'

// 生成哈希
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('生成哈希失败:', err);
        return;
    }

    // 输出可直接复制的 SQL 语句
    console.log('\n✅ 复制下面这行到 MySQL 执行：\n');
    console.log(
        `INSERT INTO pjk.users (username, password_hash, role) VALUES ('${username}', '${hash}', '${role}');`
    );
    console.log('');
});