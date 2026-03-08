# wems.top

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

一个轻量级、自托管的个人博客系统，支持 Markdown 编辑、LaTeX 数学公式渲染，并包含简单的用户管理和后台功能。

> **在线预览**: [https://wems.top](https://wems.top)

## 📝 功能特性

- **文章管理**：创建、编辑、删除文章。
- **Markdown 支持**：使用 [ShowdownJS](https://github.com/showdownjs/showdown) 渲染 Markdown 内容。
- **数学公式**：通过 [KaTeX](https://katex.org/) 完美渲染行内 `$...$` 和块级 `$$...$$` LaTeX 公式。
- **用户系统**：
  - 用户注册与登录（含 Cloudflare Turnstile 人机验证）。
  - 基于 Session 的身份认证。
  - 角色权限控制（`user` / `admin`）。
- **管理后台**：管理员可管理所有文章和用户。
- **响应式设计**：基础的响应式布局，适配不同设备。

## 🚀 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/zxcar999/wems.top.git
   cd wems.top
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置数据库**
   - 在 `app.js` 中找到数据库连接配置部分，并修改为你自己的 MySQL 数据库信息：
     ```javascript
     const pool = mysql.createPool({
         host: 'localhost',
         port: 3306,
         user: 'your_db_user',
         password: 'your_db_password',
         database: 'your_db_name',
         // ...
     });
     ```
   - 在你的 MySQL 数据库中创建对应的数据库（如 `wems_db`），并导入以下表结构：

     **`users` 表：**
     ```sql
     CREATE TABLE users (
         id INT AUTO_INCREMENT PRIMARY KEY,
         username VARCHAR(50) UNIQUE NOT NULL,
         password VARCHAR(255) NOT NULL,
         role ENUM('user', 'admin') DEFAULT 'user',
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     ```

     **`articles` 表：**
     ```sql
     CREATE TABLE articles (
         id INT AUTO_INCREMENT PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         content TEXT NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );
     ```

4. **（可选）配置 Cloudflare Turnstile**
   如果你希望启用注册时的人机验证，请在 [Cloudflare Turnstile](https://dash.cloudflare.com/) 控制台创建站点，获取 `sitekey` 和 `secret`，并在 `register.html` 和 `app.js` 的 `/register` 路由中填入相应值。

5. **启动服务器**
   ```bash
   node app.js
   ```
   服务默认运行在 `http://localhost:3000`。

6. **初始化管理员账号**
   首次使用时，请手动向 `users` 表中插入一个用户名为 `admin` 的用户（密码需使用 bcrypt 加密）。该用户将自动拥有管理员权限，可访问后台管理界面。

## 📁 项目结构

```
wems.top/
├── app.js              # 主服务器入口文件
├── index.html          # 首页模板
├── article.html        # 文章详情页模板
├── style.css           # 全局样式文件
├── icon.png            # 网站图标
├── admin/              # 管理后台页面
│   ├── article.html
│   └── user.html
├── login/              # 登录/注册页面
│   ├── login.html
│   └── register.html
└── LICENSE             # 开源许可证
```

## 🔐 默认管理员账号

首次部署后，请手动在数据库中创建一个用户名为 `admin` 的用户。该用户拥有最高管理权限，可以访问 `/admin` 后台并管理其他用户的角色。

## 📄 许可证

本项目基于 **MIT License** 开源。详情请参阅 [LICENSE](./LICENSE) 文件.

---
Made with ❤️ by [zxcar999](https://github.com/zxcar999)
