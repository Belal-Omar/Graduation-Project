import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = 3000;

app.use(express.json());

// 1. Database Connection Test API (Health Check)
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Attempting a simple query to ensure the DB is reachable
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'success',
      message: 'Backend is connected to Database successfully! ✅',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed ❌',
      error: (error as Error).message
    });
  }
});

// 2. Mock API: Create User
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { name, email, passwordHash } = req.body;
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
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
    
    // In a real scenario, this would trigger background workers (like Celery or BullMQ)
    const scan = await prisma.scan.create({
      data: {
        targetId: targetId,
        status: 'RUNNING',
        startedAt: new Date()
      }
    });

    res.status(201).json({ message: 'Scan started! 🚀', scan });
  } catch (error) {
    res.status(400).json({ error: 'Failed to start scan', details: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  console.log(`👉 Test Database connection: http://localhost:${port}/api/health`);
});
