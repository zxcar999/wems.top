//Copyright (c) 2026 zxcar999

/*
MIT License

Copyright (c) 2018,2021 ShowdownJS

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*
The MIT License (MIT)

Copyright (c) 2013-2020 Khan Academy and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

/*
Copyright (c) 2013, 2014, 2015 P'unk Avenue LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


const SESSION_TTL=72*60*60*1000;
const MAX_SESSIONS=500;

const http = require('http');
const fs = require('fs');
const url = require("url");
const mysql = require("mysql2/promise");
const bcrypt = require('bcryptjs');
const showdown = require('showdown');
const katex = require('katex');
const sanitizeHtml = require('sanitize-html');



const sessions = new Map();
const pool = mysql.createPool({
    host: 'localhost',
    port: your_SQL_port,
    user: 'root',
    password: 'your_database_root_password',
    database: 'your_database_name',
    connectionLimit: 10,
    waitForConnections: true
})


// 专门用于KaTeX渲染的安全函数
function renderMath(content) {
    try {
        // 渲染行内数学公式 $...$
        content = content.replace(/\$(.*?)\$/g, (match, math) => {
            try {
                return katex.renderToString(math, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                return match; // 如果渲染失败，返回原始内容
            }
        });

        // 渲染块级数学公式 $$...$$
        content = content.replace(/\$\$(.*?)\$\$/gs, (match, math) => {
            try {
                return katex.renderToString(math, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                return match; // 如果渲染失败，返回原始内容
            }
        });

        return content;
    } catch (error) {
        console.error('KaTeX渲染错误:', error);
        return content; // 发生错误时返回原始内容
    }
}


module.exports = pool;

async function getArticleNum() {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM articles');
        return rows[0].total; // 返回具体的数值
    } catch(err) {
        console.log(err);
        return 0; // 出错时返回 0 或其他默认值
    }
}
async function getuserNum() {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM users');
        return rows[0].total; // 返回具体的数值
    } catch(err) {
        console.log(err);
        return 0; // 出错时返回 0 或其他默认值
    }
}

async function getArticleById(id) {
    const [rows] = await pool.execute(
        'SELECT id, title, content, created_at,author FROM articles WHERE id = ?',
        [id]
    );
    //console.log(rows[0]);
    return rows[0] || null;
}

async function getUserById(id) {
    const [rows] = await pool.execute(
        'SELECT id, username, role, created_at FROM users WHERE id = ?',
        [id]
    );
    return rows[0] || null;
}

async function checkUserPassword(username, password){
    const [rows] = await pool.execute(
        'select id,username,password_hash,role from users where username = ?',
        [username]
    )
    if (rows.length === 0) {
        return false; // 用户不存在
    }
    const istruepassword = await bcrypt.compare(password,rows[0].password_hash);
    return istruepassword;
}

async function findUser(username){
    const [rows] = await pool.execute(
        'select id,username,password_hash,role from users where username = ?',
        [username]
    )
    if (rows.length === 0) {
        return false; // 用户不存在
    }
    return rows[0];
}

async function addUser(username,password){
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const role='user';
    const [result] = await pool.execute(
        'INSERT INTO users (username,password_hash,role) VALUES (?, ?, ?)',
        [username,password_hash,role]
    );
    return result;
}

async function addArticle(title,author){
    const content='新文章（待编辑）';
    const [result] = await pool.execute(
        'INSERT INTO articles (title, content,author) VALUES (?, ?, ?)',
        [title, content,author]
    );
    return result.insertId;
}

async function changeArticle(id,title,content){
    try {
        const [result] = await pool.execute(
            'UPDATE articles SET title=?, content=? WHERE id=?',
            [title, content, id]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('更新文章失败:', error);
        return false;
    }
}

async function userRoleUp(id){
    try {
        const [result] = await pool.execute(
            `UPDATE users SET role='admin' WHERE id=?`,
            [id]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('用户权限升级失败:', error);
        return false;
    }
}

async function userRoleDown(id){
    try {
        const [result] = await pool.execute(
            `UPDATE users SET role='user' WHERE id=?`,
            [id]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('用户权限升级失败:', error);
        return false;
    }
}
async function deleteArticle(id){
    const [result] = await pool.execute(
        'DELETE FROM articles WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
}

function cleanupSessions() {
    const now = Date.now();
    for (const [sid, session] of sessions) {
        if (now - session.created_at > SESSION_TTL) {
            sessions.delete(sid);
        }
    }
    if (sessions.size > MAX_SESSIONS) {
        let toDelete = sessions.size - MAX_SESSIONS;
        for (const sid of sessions.keys()) {
            if (toDelete-- <= 0) break;
            sessions.delete(sid);
        }
    }
}

setInterval(cleanupSessions,5*60*1000)

function parseCookies(cookieHeader) {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(c => {
            const [k, v] = c.trim().split('=');
            cookies[k] = v;
        });
    }
    return cookies;
}

const server = http.createServer(async (req, res) => {
    let currentuser=null;
    //处理cookie
    const cookies=parseCookies(req.headers.cookie)
    const sid=cookies.sid;
    if(sid&&sessions.has(sid)){
        currentuser=sessions.get(sid);
    }
    const loginhtml='<label class="loginbutton" onclick="jmpToLogin()">登录</label>';
    if(req.url.startsWith('/admin')){
        let userpersonnality;
        if(currentuser){
            userpersonnality=await findUser(currentuser.username);
        }else{
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>请先登录管理员账号</h1>');
            return;
        }
        if(userpersonnality&&userpersonnality.role==='admin'){
            const userhtml='<label class="loginbutton" onclick="logout()">退出登录</label><label class="loginbutton2"">'+currentuser.username.toString()+'</label>';
            if(req.url==='/admin'||req.url==='/admin/article'){
                fs.readFile('./admin/article.html', 'utf-8', (err, data) => {
                    if(err) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>404 Not Found</h1>');
                    }else{
                        data=data.replace('{{user}}', userhtml);
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(data);
                    }
                })
            }else if(req.url.startsWith('/admin/article/change')){
                const parsedURL = url.parse(req.url, true);
                const id = (parsedURL.query && parsedURL.query.id) || '1';
                try {
                    const articleData = await getArticleById(id); // 获取文章数据
                    if (!articleData) {
                        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>Article not found</h1>');
                        return;
                    }

                    // 读取 article/index.html 模板
                    fs.readFile('./admin/changearticle.html', 'utf-8', (err, template) => {
                        if (err) {
                            console.error("Failed to read changearticle.html:", err);
                            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end('<h1>Internal Server Error</h1>');
                            return;
                        }
                        const userhtml=`<label class="loginbutton"">${currentuser?.username || '游客'}</label>`;
                        const titlehtml=`<textarea id="title">${articleData.title}</textarea>`;
                        const contenthtml=`<textarea id="content" class="articlechange" wrap="soft" style="white-space: nowrap;">${articleData.content}</textarea>`;
                        const createdAtHtml = articleData.created_at || 'Unknown';
                        const html = template
                            .replace('{{user}}',userhtml)
                            .replace('{{title}}', titlehtml)
                            .replace('{{content}}', contenthtml)
                            .replace('{{created_at}}', createdAtHtml)
                            .replace('{{id}}', id)
                            .replace('{{author}}',articleData.author);
                        // 返回完整的 HTML 页面
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(html);
                    });
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>Internal Server Error</h1>');
                    console.log(err);
                }
            }else if(req.url==='/admin/user'){
                fs.readFile('./admin/user.html', 'utf-8', (err, data) => {
                    if(err) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>404 Not Found</h1>');
                    }else{
                        data=data.replace('{{user}}', userhtml);
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(data);
                    }
                })
            }

        }else{
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 Not Found</h1>');
        }
    }else{
        if(req.url === '/'){
            if(!currentuser){
                fs.readFile('index.html', 'utf-8', (err, data) => {
                    if(err) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>404 Not Found</h1>');
                    }else{
                        data=data.replace('{{user}}', loginhtml);
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(data);
                    }
                })
            }else{
                const result=await findUser(currentuser.username);
                if(result.role!=='admin'){
                    const userhtml='<label class="loginbutton" onclick="logout()">退出登录</label><label class="loginbutton2"">'+currentuser.username.toString()+'</label>';
                    fs.readFile('index.html', 'utf-8', (err, data) => {
                        if(err) {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end('<h1>404 Not Found</h1>');
                        }else{
                            data=data.replace('{{user}}', userhtml);
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(data);
                        }
                    })
                }else{
                    const userhtml='<label class="loginbutton" onclick="jmpToAdmin()">管理后台</label><label class="loginbutton2" onclick="logout()">退出登录</label><label class="loginbutton2"">'+currentuser.username.toString()+'</label>';
                    fs.readFile('index.html', 'utf-8', (err, data) => {
                        if(err) {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end('<h1>404 Not Found</h1>');
                        }else{
                            data=data.replace('{{user}}', userhtml);
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(data);
                        }
                    })
                }

            }
        } else if(req.url==='/style.css'){
            fs.readFile('style.css', (err, data) => {
                if(err) {
                    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
                    res.end('<h1>404 Not Found</h1>');
                }else{
                    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
                    res.end(data);
                }
            })
        } else if(req.url === '/api/articledel'){
            if (!currentuser) {
                return res.end(JSON.stringify({ success: false, message: '未登录' }));
            }
            const user = await findUser(currentuser.username);
            if (!user || user.role !== 'admin') {
                return res.end(JSON.stringify({ success: false, message: '权限不足' }));
            }
            let body = '';
            try{
                req.on('data', chunk => {
                    body += chunk;
                })
                req.on('end', async () => {
                    try{
                        const {id}=JSON.parse(body);
                        const result=await deleteArticle(id);
                        if(result){
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true })); // 返回标准 JSON
                        }else{
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: result }));
                        }
                    }catch (err){
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    }
                })
            }catch (err){
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        } else if(req.url === '/api/articleadd'){
            if (!currentuser) {
                return res.end(JSON.stringify({ success: false, message: '未登录' }));
            }
            const user = await findUser(currentuser.username);
            if (!user || user.role !== 'admin') {
                return res.end(JSON.stringify({ success: false, message: '权限不足' }));
            }
            let body = '';
            try{
                req.on('data', chunk => {
                    body += chunk;
                })
                req.on('end', async () => {
                    const {title}=JSON.parse(body);
                    if(title===undefined||title===''){
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '标题不能为空' }));
                    }else{
                        const result=await addArticle(title,currentuser.username);
                        if(result){
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true })); // 返回标准 JSON
                        }else{
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: result }));
                        }
                    }
                })

            }catch (err){
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        } else if(req.url === '/api/articleNum'){
            try {
                const artnum = await getArticleNum();
                res.end(String(artnum)); // 转换为字符串
            } catch(err) {
                res.end('0');
            }
        } else if(req.url === '/api/userNum'){
            try {
                const usernum = await getuserNum();
                res.end(String(usernum)); // 转换为字符串
            } catch(err) {
                res.end('0');
            }
        } else if(req.url==='/api/changearticle'){
            if (!currentuser) {
                return res.end(JSON.stringify({ success: false, message: '未登录' }));
            }
            const user = await findUser(currentuser.username);
            if (!user || user.role !== 'admin') {
                return res.end(JSON.stringify({ success: false, message: '权限不足' }));
            }
            let body = '';
            try{
                req.on('data', chunk => {
                    body += chunk;
                })
                req.on('end', async () => {
                    const {id,title,content}=JSON.parse(body);
                    const result=await changeArticle(id,title,content);
                    if(result){
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true })); // 返回标准 JSON
                    }else{
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: result }));
                    }

                })
            }catch (err){
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        } else if(req.url.startsWith('/api/articleTitle')){
            const parsedURL = url.parse(req.url, true);
            const id = (parsedURL.query && parsedURL.query.id) || '1';
            try {
                const articleMain = await getArticleById(id); // 注意：这里需要加 await
                if (articleMain) {
                    res.writeHead(200, { 'Content-Type': 'application/json' }); // 设置正确的 Content-Type
                    res.end(JSON.stringify(articleMain)); // 将对象序列化为 JSON 字符串
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Article not found' }));
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        } else if (req.url === '/api/articles/list') {
            try {
                const [rows] = await pool.execute(
                    'SELECT id, title FROM articles ORDER BY id'
                );
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(rows));
            } catch (err) {
                console.error('获取文章列表失败:', err);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
        } else if (req.url === '/api/users/list') {
            try {
                const [rows] = await pool.execute(
                    'SELECT id FROM users ORDER BY id'
                );
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(rows));
            } catch (err) {
                console.error('获取用户列表失败:', err);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
        } else if(req.url.startsWith('/api/user')){
            const parsedURL = url.parse(req.url, true);
            const id = (parsedURL.query && parsedURL.query.id) || '1';
            try {
                const user = await getUserById(id); // 注意：这里需要加 await
                if (user) {
                    res.writeHead(200, { 'Content-Type': 'application/json' }); // 设置正确的 Content-Type
                    res.end(JSON.stringify(user)); // 将对象序列化为 JSON 字符串
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        } else if(req.url==='/api/article'){
            const parsedURL = url.parse(req.url, true);
            const id = (parsedURL.query && parsedURL.query.id) || '1';
            try {
                const articleMain = await getArticleById(id); // 注意：这里需要加 await
                if (articleMain) {
                    res.writeHead(200, { 'Content-Type': 'application/json' }); // 设置正确的 Content-Type
                    res.end(JSON.stringify(articleMain)); // 将对象序列化为 JSON 字符串
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Article not found');
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        } else if(req.url==='/api/login'){
            let body = '';
            try{
                req.on('data', chunk => {
                    body += chunk;
                })
                req.on('end', async () => {
                    try{
                        const {username, password}=JSON.parse(body);
                        const result=await checkUserPassword(username,password);
                        if(result){
                            try{
                                const sessionID=Math.random().toString(36).substring(2,15);
                                sessions.set(sessionID,{
                                    username:username,
                                    created_at:Date.now()
                                })
                                res.setHeader('Set-Cookie', `sid=${sessionID}; HttpOnly; Max-Age=${SESSION_TTL / 1000}; Path=/`);
                            }catch (err){
                                console.log("登录状态保存失败")
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true })); // 返回标准 JSON
                        }else{
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '用户名或密码错误' }));
                        }
                    }catch (err){
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    }
                })
            }catch (err){
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error:Check Failed');
            }

        } else if(req.url==='/api/register'){
            let body = '';
            req.on('data', chunk => {
                body += chunk;
            });
            req.on('end', async () => {
                try{
                    // --- 修改开始：接收前端传来的 turnstile token ---
                    const {username, password, 'cf-turnstile-response': cfResponse} = JSON.parse(body);
                    // --- 修改结束 ---

                    // ... 你原有的 用户名密码校验逻辑 ...
                    if(await findUser(username)||username==='admin'){
                        res.writeHead(400, { 'Content-Type': 'application/json' }); // 使用 400 Bad Request 更合适
                        res.end(JSON.stringify({ success: false, message: '该用户名已存在' }));
                        return;
                    }

                    // --- 新增：验证人机验证Token ---
                    if (!cfResponse) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '请完成人机验证。' }));
                        return;
                    }

                    try {
                        // 向 Cloudflare API 发起验证
                        const formData = new URLSearchParams();
                        formData.append('secret', 'Your_Secret_Key'); // TODO: 替换为你的 Secret Key
                        formData.append('response', cfResponse);
                        formData.append('remoteip', req.connection.remoteAddress || req.socket.remoteAddress);

                        const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                            method: 'POST',
                            body: formData,
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                        });

                        const result = await verifyResponse.json();

                        // result.success 为 true 表示验证通过
                        if (!result.success) {
                            console.error('Turnstile verification failed:', result);
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '人机验证未通过，请重试。' }));
                            return;
                        }

                    } catch (error) {
                        console.error('Error verifying with Cloudflare:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '验证服务暂时不可用，请稍后再试。' }));
                        return;
                    }
                    // --- 验证结束 ---

                    // ... 如果所有校验都通过，则执行你的注册逻辑 ...
                    await addUser(username, password);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));

                } catch (err){
                    console.error("注册过程出错:", err); // 添加错误日志
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '注册失败: ' + err.message }));
                }
            });
        } else if(req.url==='/api/logout'){
            if(sid&&sessions.has(sid)){
                sessions.delete(sid);
            }
            //设置一个立即过期的 Cookie，让浏览器删除它
            res.setHeader('Set-Cookie', 'sid=; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else if(req.url==='/api/roleup'){
            if (!currentuser) {
                return res.end(JSON.stringify({ success: false, message: '未登录' }));
            }
            const user = await findUser(currentuser.username);
            if (!user || user.role !== 'admin') {
                return res.end(JSON.stringify({ success: false, message: '权限不足' }));
            }
            if(currentuser.username != 'admin'){
                return res.end(JSON.stringify({ success: false, message: '用户不是admin，权限不够' }));
            }
            let body = '';
            try{
                req.on('data', chunk => {
                    body += chunk;
                })
                req.on('end', async () => {
                    try{
                        const {id}=JSON.parse(body);
                        const result=await userRoleUp(id);
                        if(result){
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true })); // 返回标准 JSON
                        }else{
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: result }));
                        }
                    }catch (err){
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    }
                })
            }catch (err){
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        } else if(req.url==='/api/roledown'){
            if (!currentuser) {
                return res.end(JSON.stringify({ success: false, message: '未登录' }));
            }
            const user = await findUser(currentuser.username);
            if (!user || user.role !== 'admin') {
                return res.end(JSON.stringify({ success: false, message: '权限不足' }));
            }
            if(currentuser.username != 'admin'){
                return res.end(JSON.stringify({ success: false, message: '用户不是admin，权限不够' }));
            }
            let body = '';
            try{
                req.on('data', chunk => {
                    body += chunk;
                })
                req.on('end', async () => {
                    try{
                        const {id}=JSON.parse(body);
                        const result=await userRoleDown(id);
                        if(result){
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true })); // 返回标准 JSON
                        }else{
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: result }));
                        }
                    }catch (err){
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    }
                })
            }catch (err){
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        }
        //API部分结束


        else if(req.url==='/register'){
            fs.readFile('./login/register.html', (err, data) => {
                if(err) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>404 Not Found</h1>');
                }else{
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(data);
                }
            })
        } else if(req.url==='/login'||!currentuser){//保持login处于html第三位
            fs.readFile('./login/login.html', (err, data) => {
                if(err) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>404 Not Found</h1>');
                }else{
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(data);
                }
            })
        } else if (req.url.startsWith('/article')) {
            const parsedURL = url.parse(req.url, true);
            const id = (parsedURL.query && parsedURL.query.id) || '1';

            try {
                const articleData = await getArticleById(id); // 获取文章数据
                if (!articleData) {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>Article not found</h1>');
                    return;
                }

                // 读取 article/index.html 模板
                fs.readFile('./article.html', 'utf-8', (err, template) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>Internal Server Error</h1>');
                        return;
                    }
                    //const content=new showdown.Converter().makeHtml(articleData.content);
                    //const content=sanitizeAndRenderMarkdown(articleData.content);
                    const converter = new showdown.Converter();
                    let content = converter.makeHtml(articleData.content); // 先渲染数学公式
                    content = sanitizeHtml(content, {
                        allowedTags: [
                            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
                            'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
                            'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img'
                        ],
                        allowedAttributes: {
                            a: ['href', 'name', 'target'],
                            img: ['src', 'alt'],
                            span: ['class'], // 允许KaTeX生成的span标签
                            div: ['class']   // 允许KaTeX生成的div标签
                        },
                        allowedClasses: {
                            span: ['katex*', 'math*'], // 允许KaTeX相关的类名
                            div: ['katex*', 'math*'],
                            pre: ['*'],
                            code: ['*']
                        },
                        selfClosing: ['img', 'br', 'hr'],
                        allowedSchemes: ['http', 'https', 'ftp', 'mailto'],
                        allowedSchemesByTag: {},
                        allowProtocolRelative: true
                    });
                    content = renderMath(content);
                    const userhtml='<label class="loginbutton"">'+currentuser.username.toString()+'</label>';
                    // 替换模板中的占位符为实际数据
                    const html = template
                        .replace('{{user}}',userhtml)
                        .replace('{{title}}', articleData.title)
                        .replace('{{content}}', content)
                        .replace('{{created_at}}', articleData.created_at)
                        .replace('{{author}}',articleData.author);
                    // 返回完整的 HTML 页面
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(html);
                });
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>Internal Server Error</h1>');
            }
        } else if(req.url==='/node_modules/katex/dist/katex.min.css'){
            fs.readFile('./node_modules/katex/dist/katex.min.css', (err, data) => {
                if(err) {
                    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
                    res.end('<h1>404 Not Found</h1>');
                }else{
                    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
                    res.end(data);
                }
            })
        } else if(req.url==='/icon.png'){
            fs.readFile('./icon.png', (err, data) => {
                if(err) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>404 Not Found</h1>');
                }else{
                    res.writeHead(200, { 'Content-Type': 'image/png; charset=utf-8' });
                    res.end(data);
                }
            })
        } else{
            fs.readFile('./404.html', (err, data) => {
                if(err) {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>404 Not Found</h1>');
                }else{
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(data);
                }
            })
        }
    }

})
const port = 3000;
server.listen(port, () => {
    console.log(`Listening on port ${port}`);
})
