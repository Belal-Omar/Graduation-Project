import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { requireAdminAuth, AuthenticatedRequest } from '../middlewares/auth.middleware';

export const adminRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'vuln_scanner_admin_super_secret_jwt_key_2026';

/**
 * POST /api/admin/login
 * Admin Login Endpoint
 * - Verifies user against the Database (SQLite dev.db)
 * - Verifies password using bcrypt hash
 * - Strictly enforces: user.role === 'ADMIN'
 * - Records login in AuditLog table
 */
adminRouter.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Validate request body
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
      return;
    }

    // 2. Fetch user from Database (No credentials hardcoded in the code!)
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found in database.',
      });
      return;
    }

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials. Password does not match.',
      });
      return;
    }

    // 4. Strict Role Verification: must have role === 'ADMIN'
    if (user.role.toUpperCase() !== 'ADMIN') {
      // Record unauthorized attempt in audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UNAUTHORIZED_ADMIN_LOGIN_ATTEMPT',
          details: `User with role '${user.role}' attempted to access admin portal.`,
        },
      });

      res.status(403).json({
        success: false,
        error: `Access Denied: Administrator role required. Your account role is '${user.role}'.`,
      });
      return;
    }

    // 5. Check if user account is active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact system administrator.',
      });
      return;
    }

    // 6. Update last login timestamp in DB
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 7. Write an audit log entry into the database
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        details: `Admin ${user.name} logged in successfully via Admin Portal.`,
      },
    });

    // 8. Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 9. Send success response with token and user details
    res.json({
      success: true,
      message: 'Admin authentication successful! Welcome back.',
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        lastLoginAt: updatedUser.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred during login.',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/admin/me
 * Returns current authenticated admin's data
 */
adminRouter.get('/me', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found in database.' });
      return;
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
});

/**
 * GET /api/admin/stats
 * Returns statistics for the Admin Dashboard
 */
adminRouter.get('/stats', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [userCount, projectCount, targetCount, scanCount, vulnCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.target.count(),
      prisma.scan.count(),
      prisma.vulnerability.count(),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: userCount,
        totalProjects: projectCount,
        totalTargets: targetCount,
        totalScans: scanCount,
        totalVulnerabilities: vulnCount,
        database: 'SQLite (prisma/dev.db)',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch admin stats.' });
  }
});

/**
 * GET /api/admin/users
 * Returns list of all registered users in database
 */
adminRouter.get('/users', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users list.' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Returns audit logs stored in the database
 */
adminRouter.get('/audit-logs', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs.' });
  }
});

/**
 * POST /api/admin/logout
 * Records logout event
 */
adminRouter.post('/logout', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ADMIN_LOGOUT',
          details: `Admin ${req.user.name} logged out.`,
        },
      });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});
