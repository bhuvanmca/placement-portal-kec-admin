# Cloudflare Zero Trust Free Plan: Terms Explained

This document explains the technical terms mentioned in the Cloudflare Zero Trust Free plan, tailored to your **Placement Portal** project.

---

### 1. 50 Seat Limit
*   **What it means:** A "seat" represents an **internal user** (like you, other admins, or college staff) who needs to log into the Cloudflare Zero Trust dashboard or access a "protected" application (one where you've added a login screen for extra security).
*   **Does it affect students?** **No.** Patients/Students using your mobile app or the public frontend over the tunnel **do not count as seats**. Those are "Public Traffic" users. Only the people managing the infrastructure or accessing internal-only tools count as seats.

### 2. Agentless and Client-based Zero Trust Remote Access
*   **Agentless:** This allows you to access private applications (like your SSH terminal or a private admin panel) directly through a web browser using a one-time code sent to your email. No software needs to be installed on your computer.
*   **Client-based:** This requires installing the Cloudflare **WARP** app on your device. Once active, your device acts as if it is inside the college network, allowing you to access the VM via its internal IP (e.g., `172.x.x.x`) securely.

### 3. 2 API CASB and SSPM Integrations
*   **CASB (Cloud Access Security Broker):** A security tool that scans your other cloud services (like Google Workspace or Microsoft 365) to ensure no sensitive placement data is being shared publicly by mistake.
*   **SSPM (SaaS Security Posture Management):** A tool that checks your settings in apps like GitHub or Salesforce to make sure you haven't left any "security doors" open.
*   *Note: For your current project, you likely won't even need to use these.*

### 4. 24 Hours of Log Retention
*   **What it means:** Cloudflare records every request that goes through your tunnel (who connected, when, and from where).
*   **The limit:** On the Free plan, you can look back and see these logs for the last **24 hours**. After that, the old logs are deleted to make room for new ones. Paid plans keep them for 30+ days.

### 5. 5 Digital Experience Monitoring Tests
*   **What it means:** These are automated "probes" that check if your application is fast and healthy.
*   **How it helps:** You can set up a test to "ping" your API every minute. If the API goes down or becomes very slow, Cloudflare will notify you. You can have 5 of these tests running at once on the Free plan.

---

### Summary for your Project
For the **Placement Portal**, the $0 plan is perfect because:
1.  Thousands of students can use the API without hitting the "50 seat" limit.
2.  The Tunnel is highly secure and free forever.
3.  The 24-hour logs are plenty for basic debugging.
