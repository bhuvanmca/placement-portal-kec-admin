# Infrastructure Requirements for College VM

This document outlines the precise network, access, and domain requirements needed from the college's IT department to successfully deploy the Placement Portal using a Cloudflare Tunnel.

## 1. Network Requirements (Firewall & Ports)
The most important point is that **NO INBOUND PORTS** need to be opened on the college's firewall. The standard practice of blocking incoming traffic (like inbound port 80 or 443) from the public internet is completely fine.

The Cloudflare Tunnel works by creating an *outbound* connection from the VM to Cloudflare's edge network.

**Requirements:**
- **Outbound Internet Access**: The VM must be allowed to make outbound connections to the internet, specifically over **TCP Port 443 (HTTPS)** and **UDP Port 7844 (QUIC)**.
- **DNS Resolution**: The VM must be able to resolve external DNS names (e.g., reaching `1.1.1.1` or `8.8.8.8`, or using the college's internal DNS resolver to fetch public domains).

## 2. Server Access & Privileges
To set up the environment, the following access is required on the provided VM (Ubuntu):
- **SSH Access**: Ability to SSH into the VM from the campus network (or VPN).
- **Sudo/Root Privileges**: Required to install Docker, Docker Compose, the GitHub Actions Runner, and the `cloudflared` (Cloudflare Tunnel) agent.

## 3. Domain Management
You **do not** need the college to provide multiple subdomains, nor do you need to purchase extra subdomains. 

**Requirements:**
- A single base domain name (e.g., `placement-portal-kec.<college>.edu`) provided by the college.
- Once this domain is added to Cloudflare, you can create **unlimited subdomains** (e.g., `api.placement-portal-kec.college.edu`, `admin.placement-portal-kec.college.edu`) completely free of charge, managed entirely through your Cloudflare dashboard. The college IT department does not need to intervene for each new subdomain.

## 4. Why Cloudflare Tunnel (Zero Trust)?
- **Scalability & Performance:** The free Cloudflare Zero Trust plan easily handles thousands of requests. It offloads caching, DDoS protection, and SSL termination to Cloudflare's massive edge network before traffic even reaches the college VM.
- **Security & Hosting:** Cloudflare Tunnel securely exposes our internal APIs and web apps to the internet without opening firewall ports.
- **Client Access:** Once the tunnel is running, the **student mobile app** and the **admin frontend** simply connect securely via the public domain URLs (e.g., `https://api.placement-portal-kec.college.edu`). From the app's perspective, it functions exactly like any standard production API.

## 5. DNS Delegation (The "Master Key")
To avoid asking IT for help every time we need a new feature (like Chat, Admin, or API), we use **DNS Delegation**.

### Layman's Terms: The "Master Key" Analogy
Imagine the college owns a large apartment building (`college.edu`). They have given you one large unit (`placement-portal-kec.college.edu`). 
*   **Without Delegation:** Every time you want to build a partition inside your unit or change a lock, you have to find the Building Manager (IT) and wait for them to do it.
*   **With Delegation:** IT gives you a **Master Key** to just your unit. They still own the building, but you can manage everything inside your space yourself without bothering them.

### What to say to the SysAdmin:
"We would like to manage the DNS records for the `placement-portal-kec.college.edu` subdomain independently using Cloudflare Zero Trust. This allows us to securely route traffic via Tunnels without opening firewall ports.

Could you please **delegate** that specific subdomain to Cloudflare by adding these two **NS (Name Server) records** to your DNS configuration?"
> *Note: Cloudflare will provide the specific nameservers once you add the domain in their dashboard (e.g., `arya.ns.cloudflare.com`).*

## Summary Checklist to hand to IT:
- [ ] Provide a VM running Ubuntu 20.04 or 22.04 LTS.
- [ ] Ensure the VM has an outbound internet connection (Port 443).
- [ ] Delegate the subdomain `placement-portal-kec.<college>.edu` to Cloudflare using NS records.
- [ ] Provide an administrator (`sudo`) account via SSH.
