# IT SysAdmin Conversation Script: Placement Portal Deployment

This script helps you navigate the technical conversation with your college IT department. It covers everything from the VM request to the "Nameserver" delegation.

---

### **Scene 1: The Initial Request**
**You:** "Hi! I'm working on the new Placement Portal project. We need a small Ubuntu VM to host the application, but we've chosen a setup that doesn't require opening any firewall ports. Can we discuss the requirements?"

**SysAdmin:** "No inbound ports? That sounds better than usual. What do you need exactly?"

**You:** "I have a [requirement document](file:///Users/venessa/Projects/placement-portal-kec-admin/college_requirement.md) here. Basically: 
1. An Ubuntu 22.04 VM.
2. Standard outbound HTTPS access (Port 443).
3. A subdomain like `placement-portal-kec.college.edu` with **DNS Delegation** to our Cloudflare setup."

---

### **Scene 2: The "Nameserver" Discussion**
**SysAdmin:** "Why do you need DNS delegation? Can't I just give you a Static IP and you point an A record to it?"

**You:** "We are using **Cloudflare Tunnels**. It’s more secure because the VM won't have a public-facing IP for the app. To make this work smoothly without bothering you every time we add a new feature (like Chat or an Admin panel), we want to manage the subdomains ourselves. If you delegate `placement-portal-kec.college.edu` to these two nameservers (e.g., `arya.ns.cloudflare.com`), we can handle all the internal routing."

**SysAdmin:** "Alright, that actually saves me work in the long run. I’ll set up the VM and add those NS records for that specific subdomain. I'll send you the SSH credentials once it's ready."

---

### **Scene 3: Installing the Connector (The Screenshot Step)**
**You:** *(Once you have SSH access to the VM)* "I've logged into the VM. I'm ready to link it to our Cloudflare dashboard now."

**SysAdmin:** "Go ahead. I see the outbound traffic is allowed on Port 443."

**You:** *(Copy the "Install and run a connector" command from your Cloudflare dashboard—the one in your screenshot—and paste it into the VM terminal)*:
```bash
# Example command from your screenshot
sudo apt-get update && sudo apt-get install cloudflared
sudo cloudflared service install <YOUR_SECRET_TOKEN>
```

**SysAdmin:** "I see a new outbound connection to Cloudflare's edge. Is it working?"

**You:** "Yes! The dashboard shows the tunnel as **Healthy**. Now I can map our API and Frontend to the domain without you needing to touch the firewall ever again."

---

### **Key Summary for the SysAdmin**
| What You Ask | What the SysAdmin Does | Why |
| :--- | :--- | :--- |
| **Ubuntu VM** | Creates a virtual machine with 4GB RAM / 40GB Disk. | To run the Go backend and Docker. |
| **Outbound 443** | Ensures the firewall allows the VM to reach the internet. | So the Cloudflare Tunnel can "dial out." |
| **NS Records** | Adds two records: `placement-portal-kec IN NS arya.ns.cloudflare.com`. | To give you the "Master Key" to manage subdomains. |
| **Sudo Access** | Gives your user account permission to use `sudo`. | To install Docker and the Cloudflare agent. |
