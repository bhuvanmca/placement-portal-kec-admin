# KEC Drives: Frontend Performance & Deployment Proposal

This document explains the strategy to drastically speed up the KEC Drives Admin Portal (`admin-kecdrives`) and how we will automatically deploy it, written in simple, non-technical terms.

---

## 1. The Current Problem: "The Long Commute"

Right now, the system is split into two physical locations:
*   **The Frontend (The Website UI):** Hosted out on the public internet using Cloudflare Pages.
*   **The Backend (The Data & Logic):** Hosted securely inside the college's private Virtual Machine (VM).

**Why is it slow?** 
Every time an admin clicks a button, the website (on Cloudflare Pages) has to travel across the internet, find your Cloudflare Tunnel (`app.api-kecdrives.com`), go down into the college network, ask the VM for data, and carry that data all the way back. This massive physical distance causes high loading times.

---

## 2. The Solution: "The Home Office"

To fix the speed, we are bringing the frontend home. 

Instead of hosting the website on Cloudflare Pages, we have packed the Next.js frontend into a **Docker Container** (a standardized virtual box) and placed it directly inside your college VM, right next to your backend databases.

**The Result:** 
When the website needs data from the database, the travel distance is now zero. It asks the database directly over the VM's internal memory, meaning load times will drop to almost instant (0ms latency).

---

## 3. How Users Connect (Without Opening Firewalls)

Since the college has strict firewall rules, we **do not** need the SysAdmin to open any new ports (like Port 3000) to the internet. We will use the exact same Cloudflare Tunnel you already set up for the backend.

Here is the exact traffic flow:
1.  **The College Domain:** An admin types `admin.kecdrives.kongu.edu` into their browser.
2.  **The Traffic Director:** The college's BIND DNS sends this to Cloudflare.
3.  **The Secure Tunnel:** Cloudflare sees the request and instantly drops it down your existing `kecdrives_tunnel` into the college VM.
4.  **The Local Hand-off:** Inside the VM, the tunnel securely hands the request directly to the Next.js Docker container running on Port 3000. 

*No firewalls breached, no extra security risks, just smart routing.*

---

## 4. The CI/CD Pipeline: Two Repos, Two Runners

**You are absolutely correct:** Since the frontend (`admin-kecdrives`) and the backend (`api-kecdrives`) are stored and managed in two entirely different repositories on GitHub, modifying one massive `docker-compose.yml` for both is a flawed strategy. Doing so would force the frontend to rebuild any time you updated the Go API, wasting compute resources and causing unnecessary frontend downtime.

**How it will work strictly across two repos:**

1.  **Isolation via own Docker-Compose:** We have safely removed the frontend code from the backend's `docker-compose.yml`. Instead, I have created a dedicated `docker-compose.yml` strictly inside the `admin-kecdrives` repo.
2.  **A Second Dedicated Runner:** You **will** need to setup a new, second GitHub Actions Runner on the exact same VM. 
3.  **Directory Split:**
    *   Backend Runner handles: `/home/user/actions-runner-backend` (Running `api-kecdrives/docker-compose.yml`)
    *   Frontend Runner handles: `/home/user/actions-runner-frontend` (Running `admin-kecdrives/docker-compose.yml`)

This guarantees 100% isolation. When you deploy a backend fix, only the backend updates. When you deploy a frontend UI update, only the Next.js container rebuilds. Both containers will seamlessly share the VM's resources and both answer to the exact same Cloudflare Tunnel!

---

## 5. Next Steps for Implementation

To make this live, here is the simple checklist:

1.  **SysAdmin & Cloudflare (Domain Routing):**
    *   In your Cloudflare Tunnel settings, add a new Public Hostname (e.g., `admin.api-kecdrives.com`) pointing to `http://localhost:3000`.
    *   In Cloudflare "Custom Hostnames" for `api-kecdrives.com`, add `admin.kecdrives.kongu.edu` using the Header Override `admin.api-kecdrives.com`.
    *   Ask the SysAdmin to `CNAME` the `admin.kecdrives` BIND DNS record to `admin.api-kecdrives.com`.
2.  **GitHub CI Strategy:** 
    *   Turn off the Cloudflare Pages CI deployment in the `admin-kecdrives` repo.
    *   Install the second GitHub Runner agent on the VM locally.
    *   Setup the workflow `.yml` file in `admin-kecdrives` to execute `docker compose up -d --build` using that second runner.