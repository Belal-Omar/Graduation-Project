import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import path from 'path';
import { prisma } from './config/db';
import { adminRouter } from './routes/admin.routes';

const app = express();
const port = process.env.PORT || 3000;

// Middleware for parsing JSON and form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public directory
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// Route redirects for easy navigation
app.get('/', (req: Request, res: Response) => {
  res.redirect('/admin/login');
});

app.get('/admin', (req: Request, res: Response) => {
  res.redirect('/admin/login');
});

app.get('/admin/login', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'admin', 'dashboard.html'));
});

// Admin authentication & management API routes
app.use('/api/admin', adminRouter);

// 1. Database Connection Test API (Health Check)
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Ensuring SQLite dev.db is reachable
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'success',
      database: 'SQLite (prisma/dev.db)',
      message: 'Backend is connected to SQLite Database successfully! ✅',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'SQLite (prisma/dev.db)',
      message: 'Database connection failed ❌',
      error: (error as Error).message,
    });
  }
});

// 2. Mock API: Create User
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { name, email, passwordHash, role } = req.body;
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'USER',
      },
    });
    res.status(201).json({ message: 'User created successfully!', user });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create user', details: (error as Error).message });
  }
});

// 3. Mock API: Start a Scan
app.post('/api/scans/start', async (req: Request, res: Response) => {
  try {
    const { targetId } = req.body;

    const scan = await prisma.scan.create({
      data: {
        targetId: Number(targetId),
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    res.status(201).json({ message: 'Scan started! 🚀', scan });
  } catch (error) {
    res.status(400).json({ error: 'Failed to start scan', details: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Vulnerability Scanner Server running on http://localhost:${port}`);
  console.log(`🔐 Admin Login Page: http://localhost:${port}/admin/login`);
  console.log(`📊 Admin Dashboard:  http://localhost:${port}/admin/dashboard`);
  console.log(`👉 Database Health Check: http://localhost:${port}/api/health`);
  console.log(`🗄️ Database Engine: SQLite (prisma/dev.db)`);
  console.log(`======================================================\n`);
});
