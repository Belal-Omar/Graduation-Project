// ==========================================================================
// Sential AI - Main Page JavaScript Controller
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    let user = null;

    if (rawUser) {
        try {
            user = JSON.parse(rawUser);
        } catch (e) {
            console.error("Could not parse user session:", e);
        }
    }

    // 1. Navigation Auth State
    const navLoginBtn = document.getElementById("navLoginBtn");
    const navLogoutBtn = document.getElementById("navLogoutBtn");
    const navStartFreeBtn = document.getElementById("navStartFreeBtn");

    if (token && user) {
        if (navLoginBtn) {
            navLoginBtn.textContent = user.name ? `Hi, ${user.name.split(' ')[0]}` : "Account";
            navLoginBtn.href = user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard.html";
        }
        if (navLogoutBtn) {
            navLogoutBtn.style.display = "inline-block";
            navLogoutBtn.addEventListener("click", () => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                sessionStorage.removeItem("token");
                sessionStorage.removeItem("user");
                window.location.reload();
            });
        }
        if (navStartFreeBtn) {
            navStartFreeBtn.textContent = "Dashboard ↗";
            navStartFreeBtn.href = user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard.html";
        }
    }

    // 2. Hero Action Buttons
    const viewDashboardHeroBtn = document.getElementById("viewDashboardHeroBtn");
    if (viewDashboardHeroBtn) {
        viewDashboardHeroBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (token) {
                window.location.href = (user && user.role === "ADMIN") ? "/admin/dashboard" : "/dashboard.html";
            } else {
                window.location.href = "/login.html";
            }
        });
    }

    // 3. Live Interactive Scanner Form
    const homeScanForm = document.getElementById("homeScanForm");
    const targetScanUrl = document.getElementById("targetScanUrl");
    const homeScanSubmitBtn = document.getElementById("homeScanSubmitBtn");
    const homeScanResultBanner = document.getElementById("homeScanResultBanner");

    if (homeScanForm) {
        homeScanForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const url = targetScanUrl.value.trim();
            if (!url) return;

            homeScanSubmitBtn.disabled = true;
            homeScanSubmitBtn.textContent = "Scanning Target...";

            // Simulate realistic AI assessment telemetry
            setTimeout(() => {
                homeScanSubmitBtn.disabled = false;
                homeScanSubmitBtn.textContent = "Launch Scan →";
                homeScanResultBanner.className = "scan-result-banner success";
                homeScanResultBanner.innerHTML = `
                    <strong>✅ Assessment Completed for:</strong> ${url}<br>
                    <span>Mapped <strong>142</strong> endpoints &bull; 0 Critical Flaws &bull; Posture Score: <strong>84/100</strong> (Good).</span>
                `;
            }, 1400);
        });
    }
});
