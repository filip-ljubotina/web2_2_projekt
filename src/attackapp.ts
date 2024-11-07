import express from 'express';
import path from 'path'
import fs from 'fs';
import https from 'https';

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'pug')

app.get('/', function (req, res) {
    res.render('attack');
});

const port = 4042;
https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app)
    .listen(port, function () {
        console.log(`Attacker running at https://localhost:${port}`);
    });