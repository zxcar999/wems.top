const http = require('http');
const fs = require('fs');
const url = require("url");
const mysql = require("mysql2/promise")
const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'yourpassword',
    database: 'yourdatabase',
    connectionLimit: 10,
    waitForConnections: true
})

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

async function getArticleById(id) {
    const [rows] = await pool.execute(
        'SELECT id, title, content, created_at FROM articles WHERE id = ?',
        [id]
    );
    //console.log(rows[0]);
    return rows[0] || null;
}

const server = http.createServer(async (req, res) => {
    if(req.url === '/'){
        fs.readFile('index.html', (err, data) => {
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
            fs.readFile('./article/index.html', 'utf-8', (err, template) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>Internal Server Error</h1>');
                    return;
                }

                // 替换模板中的占位符为实际数据
                const html = template
                    .replace('{{title}}', articleData.title)
                    .replace('{{content}}', articleData.content)
                    .replace('{{created_at}}', articleData.created_at);
                // 返回完整的 HTML 页面
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(html);
            });
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Internal Server Error</h1>');
        }
    }
    else if(req.url === '/api/articleNum'){
        try {
            const artnum = await getArticleNum();
            res.end(String(artnum)); // 转换为字符串
        } catch(err) {
            res.end('0');
        }
    }else if(req.url.startsWith('/api/articleTitle')){
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
        /*
        fs.readFile('article'+id+'.txt', (err, data) => {
            if(err) {
                res.writeHead(500);
                res.end('there is no articles');
            }else{

            }
        })
         */
    }else{
        res.write('<h1>404 Not Found</h1>');
    }
})
const port = 80;
server.listen(port, () => {
    console.log(`Listening on port ${port}`);

})
