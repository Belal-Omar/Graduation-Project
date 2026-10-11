document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('adminToken');

  // Route protection: If no token exists, redirect to login
  if (!token) {
    window.location.href = '/admin/login';
    return;
  }

  const navAdminName = document.getElementById('navAdminName');
  const logoutBtn = document.getElementById('logoutBtn');

  // Verify current admin profile
  try {
    const res = await fetch('/api/admin/me', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
      return;
    }

    const data = await res.json();
    if (navAdminName && data.user) {
      navAdminName.textContent = data.user.name;
    }
  } catch (error) {
    console.error('Session check error:', error);
    window.location.href = '/admin/login';
    return;
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (e) {
        // Ignore network errors on logout
      } finally {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
      }
    });
  }
});
