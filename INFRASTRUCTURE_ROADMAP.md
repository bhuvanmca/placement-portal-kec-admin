# Infrastructure & Deployment Roadmap

This roadmap outlines the professional engineering choices for your architecture and provides a step-by-step task list to get from your current local setup to a production-ready system.

---

## 1. Professional Engineering Choices

### Choice A: Cloudflare Tunnel vs. Static IP
Normally, hosting on a VM involves "Port Forwarding" (asking the college to open Port 80/443 pointing to your Static IP). 
**Professional Choice:** **Cloudflare Tunnel.** 
*   **Why?** It is significantly more secure. Your VM stays "invisible" to the public internet. The tunnel creates an outbound connection to Cloudflare, and they handle the public traffic. 
*   **Static IP Role:** Use the college's static IP only for **SSH (your management)**. It is not needed for the users of the app.

### Choice B: DNS Management
**Professional Choice:** **Full DNS Delegation.**
*   Ask the college IT to change the **Nameservers** for `placement-portal-kec.<college>.edu` to the two nameservers Cloudflare provides (e.g., `arya.ns.cloudflare.com`).
*   **Why?** Once Cloudflare is your DNS manager, you don't have to ask the IT department for "CNAME" or "@" records every time you want to add a feature. You can create subdomains (`api.`, `admin.`, etc.) yourself instantly.

### Choice C: Security & Authentication
*   **Application Level:** Your Go backend already uses **JWT (JSON Web Tokens)**. This is the professional standard for protecting APIs. 
*   **Infrastructure Level:** For the **Admin Frontend**, we can add "Cloudflare Access" (part of Zero Trust). This means even if someone knows the URL, they can't even see the login page unless they pass a Cloudflare identity check (like an OTP sent to a college email).

---

## 2. Infrastructure Task List

### Phase 1: Domain & Zero Trust Setup
- [ ] **Activate Zero Trust Free plan** (Done once payment verification is finished).
- [ ] **Add Domain to Cloudflare**: Add `placement-portal-kec.<college>.edu` (or whatever domain they gave you).
- [ ] **Update Nameservers**: Send the Cloudflare Nameservers to college IT and confirm they have updated them.
- [ ] **Wait for Propagation**: Verify in the Cloudflare Dashboard that the site is "Active".

### Phase 2: Tunnel Creation & Installation
- [ ] **Create Tunnel**: In Zero Trust, go to **Networks > Tunnels** and create a new tunnel (e.g., "kec-placement-vm").
- [ ] **Install Agent**: Copy the command provided by Cloudflare (looks like `sudo cloudflared service install ...`) and run it on your Ubuntu VM.
- [ ] **Verify Connection**: Ensure the tunnel status shows as **Healthy** in the dashboard.

### Phase 3: Routing (Subdomains)
- [ ] **Route API**: Map `api.yourdomain.edu` to `http://localhost:80` (This points to your Caddy container).
- [ ] **Route Frontend (Vercel)**:
    - [ ] In Vercel, add your custom domain (e.g., `placement.yourdomain.edu`).
    - [ ] Vercel will give you a **CNAME** or **A** record.
    - [ ] Add that record into the **Cloudflare DNS** settings (since you now own the DNS).

### Phase 4: Application Configuration
- [ ] **Update `.env`**: Change `GARAGE_PUBLIC_URL` and other endpoint variables to use the new public HTTPS URLs.
- [ ] **Update Mobile App**: Change `constants.dart` to point to `https://api.yourdomain.edu`.
- [ ] **Rebuild & Deploy**: Docker Compose up to apply the URL changes.

### Phase 5: Production Lockdown
- [ ] **Cloudflare Access**: (Optional) Add an Access Policy to the Admin URL to require OTP for anyone except authorized staff.
- [ ] **SSL/TLS**: Ensure Cloudflare is set to "Full (Strict)" mode for end-to-end encryption.
