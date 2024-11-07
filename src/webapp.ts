import express, { Request, Response } from 'express';
import session from 'express-session';
import path from 'path';
import pool, { initializeDatabase } from './database';
import bodyParser from 'body-parser';
import csrf from 'csurf';
import cors from 'cors';
import https from 'https';
import fs from 'fs';

const app = express();
app.use(cors());
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));

initializeDatabase();

const port = process.env.PORT || 3001;
app.use(express.static(path.join(__dirname, 'public')));

declare module 'express-session' {
  interface SessionData {
    csrfEnabled?: boolean;
    sqlDemoAuthenticated?: boolean;
    csrfDemoAuthenticated?: boolean;
    user?: { id: number, username: string };
  }
}

app.use(
  session({
    secret: 'YOUR_SECRET_KEY',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
    }
  })
);

const csrfProtection = csrf();

app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  res.status(403);
  res.json({ error: 'Invalid CSRF token' });
});

app.use((req: any, res, next) => {
  res.locals.csrfEnabled = req.session.csrfEnabled || false;
  res.locals.csrfDemoAuthenticated = req.session.csrfDemoAuthenticated || false;
  res.locals.user = req.session.user || null;
  res.locals.error = res.locals.error || null;
  next();
});

app.get('/', (req: Request, res: Response, next: express.NextFunction) => {
  if (req.session.csrfEnabled) {
    csrfProtection(req, res, next);
  } else {
    next();
  }
}, (req: Request, res: Response) => {
  let csrfToken = null;
  if (req.session.csrfEnabled) {
    csrfToken = req.csrfToken();
  }
  res.render('index', { csrfToken });
});

app.post("/login-sql", async (req: Request, res: Response) => {
  const { username, password, allowInjection } = req.body;

  try {
    let result;
    if (allowInjection) {
      const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
      result = await pool.query(query);
    } else {
      const query = "SELECT * FROM users WHERE username = $1 AND password = $2";
      result = await pool.query(query, [username, password]);
    }

    if (result.rows.length > 0) {
      res.render("index", { users: result.rows });
    } else {
      res.send("Invalid username or password.");
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send("An error occurred during login.");
  }
});

app.post("/login-csrf", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const query = "SELECT * FROM users WHERE username = $1 AND password = $2";
    const result = await pool.query(query, [username, password]);

    if (result.rows.length > 0) {
      req.session.csrfDemoAuthenticated = true;
      req.session.user = { id: result.rows[0].id, username: result.rows[0].username };
      res.redirect("/");
    } else {
      res.send("Invalid username or password.");
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send("An error occurred during login.");
  }
});

app.post('/logout', (req: Request, res: Response, next: express.NextFunction) => {
  if (req.session.csrfEnabled) {
    csrfProtection(req, res, next);
  } else {
    next();
  }
}, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.post('/toggle-csrf', (req: any, res: Response) => {
  req.session.csrfEnabled = req.body.csrfEnabled === 'on';
  res.redirect('/');
});

https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app).listen(port, function () {
  console.log(`Server running at port:  https://localhost:${port}`);
});
