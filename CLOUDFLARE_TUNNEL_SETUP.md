# Cloudflare Tunnel Setup Guide - Placement Portal

> **Expose your VM to the internet securely without opening firewall ports**

---

## Overview

Cloudflare Tunnel creates an encrypted outbound connection from your VM to Cloudflare's edge network, allowing internet access without requiring firewall configuration or public IP.

**Benefits:**
- ✅ FREE unlimited bandwidth
- ✅ Works behind college firewall
- ✅ Built-in DDoS protection
- ✅ Automatic HTTPS/SSL
- ✅ Zero-trust security
- ✅ No port forwarding needed

---

## Prerequisites

Before starting, you need:

1. **Domain Name** (e.g., `kongu.edu` or your own domain)
   - Can use existing domain or buy one (~$10/year from Namecheap, Google Domains, etc.)
   
2. **Cloudflare Account** (free tier)
   - Sign up at https://dash.cloudflare.com/sign-up

3. **SSH Access to VM**
   - You already have this (when connected to college network)

4. **Current Status:**
   - ✅ VM is running Ubuntu
   - ✅ Docker & Docker Compose installed
   - ✅ GitHub Actions runner configured
   - ✅ Backend services running on VM

---

## Step 1: Domain Setup on Cloudflare

### Option A: Use Existing Domain

If you already have a domain (like `yourname.com`):

1. **Login to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com/

2. **Add Site**
   - Click "Add a Site"
   - Enter your domain: `yourname.com`
   - Select "Free" plan
   - Click "Add Site"

3. **Update Nameservers**
   - Cloudflare will show you 2 nameservers:
     ```
     Example:
     anya.ns.cloudflare.com
     dave.ns.cloudflare.com
     ```
   
   - Go to your domain registrar (where you bought the domain)
   - Find "Nameservers" or "DNS Settings"
   - Replace existing nameservers with Cloudflare's nameservers
   - Save changes

4. **Wait for Activation**
   - Can take 5 minutes to 48 hours
   - You'll receive email when active
   - Check status in Cloudflare dashboard

### Option B: Buy New Domain

If you need a domain:

1. **Buy from Registrar**
   - Namecheap: https://www.namecheap.com (~$10/year)
   - Google Domains: https://domains.google (if available in your region)
   - Cloudflare Registrar: https://www.cloudflare.com/products/registrar/ (at-cost pricing)

2. **Follow Option A** to add domain to Cloudflare

**Recommended Subdomain:** `api.yourdomain.com` for your backend

---

## Step 2: Install Cloudflared on VM

**Connect to your VM via SSH** (when on college network):

```bash
ssh your-username@vm-ip-address
```

### Download and Install

```bash
# Download the latest cloudflared for Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install the package
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
# Should show: cloudflared version 2024.x.x
```

---

## Step 3: Authenticate Cloudflared

```bash
# Login to Cloudflare (this will open a browser)
cloudflared tunnel login
```

**What happens:**
1. Command prints a URL: `https://dash.cloudflare.com/...`
2. Copy this URL
3. Open it in a browser (can be on your laptop, doesn't need to be on VM)
4. Login to Cloudflare
5. **Select your domain** from the list
6. Click "Authorize"

**Result:** Creates a certificate file at `~/.cloudflared/cert.pem`

---

## Step 4: Create Tunnel

```bash
# Create a tunnel named 'placement-portal'
cloudflared tunnel create placement-portal
```

**Output will show:**
```
Tunnel credentials written to /root/.cloudflared/<TUNNEL-ID>.json
Created tunnel placement-portal with id <TUNNEL-ID>
```

**IMPORTANT:** Save the `TUNNEL-ID` - you'll need it next!

Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

## Step 5: Configure DNS Routing

Route your domain to the tunnel:

```bash
# Replace <TUNNEL-ID> with your actual tunnel ID
# Replace api.yourdomain.com with your actual domain

cloudflared tunnel route dns placement-portal api.yourdomain.com
```

**Output:**
```
Created CNAME record for api.yourdomain.com pointing to <TUNNEL-ID>.cfargotunnel.com
```

**Verify in Cloudflare Dashboard:**
1. Go to DNS settings for your domain
2. You should see a new CNAME record:
   - Name: `api`
   - Content: `<TUNNEL-ID>.cfargotunnel.com`
   - Proxied: Yes (orange cloud)

---

## Step 6: Create Tunnel Configuration

Create the configuration file:

```bash
# Create directory if it doesn't exist
sudo mkdir -p /etc/cloudflared

# Create config file
sudo nano /etc/cloudflared/config.yml
```

**Paste this configuration** (replace `<TUNNEL-ID>` and domain):

```yaml
tunnel: <YOUR-TUNNEL-ID>
credentials-file: /root/.cloudflared/<YOUR-TUNNEL-ID>.json

# Logging
logfile: /var/log/cloudflared.log
loglevel: info

# Ingress rules - routes traffic to your services
ingress:
  # Route all traffic from your domain to Caddy
  - hostname: api.yourdomain.com
    service: http://localhost:80
    originRequest:
      noTLSVerify: true  # Since Caddy handles HTTPS internally
  
  # Catch-all rule (required - must be last)
  - service: http_status:404
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

**Important Notes:**
- Replace `<YOUR-TUNNEL-ID>` with actual tunnel ID from Step 4
- Replace `api.yourdomain.com` with your actual domain
- Service `http://localhost:80` points to Caddy (which runs on port 80 in docker)

---

## Step 7: Test Tunnel (Manual First)

Before installing as a service, test it manually:

```bash
# Run tunnel in foreground
sudo cloudflared tunnel run placement-portal
```

**Expected Output:**
```
INFO Connection registered                      connIndex=0 location=IAD
INFO Connection registered                      connIndex=1 location=ATL  
INFO Connection registered                      connIndex=2 location=DFW
INFO Connection registered                      connIndex=3 location=ORD
```

**This means:** Tunnel is connected and ready!

**Test from another device:**
1. Open browser
2. Go to `https://api.yourdomain.com/api/health`
3. Should see: `{"status":"healthy",...}`

If it works, press `Ctrl+C` to stop the tunnel. Move to Step 8.

---

## Step 8: Install as System Service

Make the tunnel run automatically on boot:

```bash
# Install cloudflared as a system service
sudo cloudflared service install

# Enable service to start on boot
sudo systemctl enable cloudflared

# Start the service
sudo systemctl start cloudflared

# Check status
sudo systemctl status cloudflared
```

**Expected Output:**
```
● cloudflared.service - cloudflared
   Loaded: loaded (/etc/systemd/system/cloudflared.service; enabled)
   Active: active (running) since Mon 2026-02-10 11:00:00 IST; 5s ago
```

**Verify it's running:**
```bash
# Check tunnel status
sudo cloudflared tunnel info placement-portal

# View logs
sudo journalctl -u cloudflared -f
```

Press `Ctrl+C` to stop viewing logs.

---

## Step 9: Update Caddyfile for Production

Now update your Caddyfile to use the production domain:

```bash
# Navigate to backend directory
cd /path/to/placement-portal-kec-admin/backend

# Edit Caddyfile
nano Caddyfile
```

**Replace the entire file with:**

```caddyfile
{
    email your-email@example.com  # Change this to your email
}

# Production domain
api.yourdomain.com {
    # API routes
    @go_api {
        path /api/health
        path /api/v1/auth/*
        path /api/v1/admin/*
        path /api/v1/student/*
        path /api/v1/drives*
        path /api/v1/spocs*
        path /api/v1/brands/*
        path /api/v1/user/*
        path /api/v1/config/*
        path /api/v1/profile
        path /api/webhooks/*
    }
    handle @go_api {
        reverse_proxy api:8080
    }
    
    # Swagger documentation
    handle_path /docs/* {
        rewrite * /swagger{uri}
        reverse_proxy api:8080
    }

    # Garage object storage
    handle_path /storage/* {
        reverse_proxy garage:3900
    }

    # Health check
    handle /health {
        respond "OK" 200
    }

    # Default response
    handle /* {
        respond "Placement Portal API - Production" 200
    }
}

# Keep local access (optional - for testing when on college network)
:80 {
    # Same configuration as above
    @go_api {
        path /api/health
        path /api/v1/auth/*
        path /api/v1/admin/*
        path /api/v1/student/*
        path /api/v1/drives*
        path /api/v1/spocs*
        path /api/v1/brands/*
        path /api/v1/user/*
        path /api/v1/config/*
        path /api/v1/profile
        path /api/webhooks/*
    }
    handle @go_api {
        reverse_proxy api:8080
    }
    
    handle_path /docs/* {
        rewrite * /swagger{uri}
        reverse_proxy api:8080
    }

    handle_path /storage/* {
        reverse_proxy garage:3900
    }
    
    handle /* {
        respond "Placement Portal API - Local" 200
    }
}
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

---

## Step 10: Update Environment Variables

Update your `.env` file with the production URL:

```bash
nano .env
```

**Update this line:**

```env
# Change from localhost to your domain
GARAGE_PUBLIC_URL=https://api.yourdomain.com/storage
```

**Save and exit**

---

## Step 11: Restart Services

Restart your Docker containers to apply changes:

```bash
# Restart all services
docker compose down
docker compose up -d

# Check if services are running
docker compose ps

# Check Caddy logs
docker compose logs caddy --tail 50

# Check API logs
docker compose logs api --tail 50
```

---

## Step 12: Test Everything

### From Any Device (Anywhere with Internet)

1. **Health Check**
   ```bash
   curl https://api.yourdomain.com/api/health
   ```
   Expected: `{"status":"healthy",...}`

2. **Swagger Docs**
   - Open browser: `https://api.yourdomain.com/docs/`
   - Should see Swagger UI

3. **Login Test** (from frontend or Postman)
   POST to `https://api.yourdomain.com/api/v1/auth/login`

4. **Storage Test**
   - Upload a file via your frontend
   - URL should be: `https://api.yourdomain.com/storage/...`

---

## Step 13: Update Frontend & Mobile Apps

### Frontend (Vercel/Netlify)

Update your frontend environment variables:

```env
# .env.production or Vercel environment variables
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_STORAGE_URL=https://api.yourdomain.com/storage
```

Redeploy frontend to apply changes.

### Mobile App (Flutter)

Update API base URL in your Flutter app:

```dart
// lib/config/api_config.dart or similar
class ApiConfig {
  static const String baseUrl = 'https://api.yourdomain.com';
  static const String storageUrl = 'https://api.yourdomain.com/storage';
}
```

Rebuild and deploy app.

---

## Troubleshooting

### Tunnel Not Connecting

**Check tunnel status:**
```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -n 50
```

**Common issues:**
- Wrong tunnel ID in config
- Wrong credentials file path
- Firewall blocking outbound HTTPS (port 443)

**Fix:** Verify config at `/etc/cloudflared/config.yml`

### DNS Not Resolving

**Check DNS:**
```bash
nslookup api.yourdomain.com
# Should show Cloudflare IP (104.x.x.x or 172.x.x.x)
```

**Fix:**
- Wait up to 5 minutes for DNS propagation
- Check Cloudflare DNS settings
- Ensure CNAME record exists and is proxied (orange cloud)

### 502 Bad Gateway

**Means:** Tunnel is working but Caddy/API is not responding

**Check:**
```bash
# Check if Caddy is running
docker compose ps

# Check Caddy logs
docker compose logs caddy

# Check if port 80 is listened
sudo netstat -tlnp | grep :80
```

**Fix:** Restart containers: `docker compose restart`

### SSL Certificate Issues

Cloudflare handles SSL automatically. If you see SSL errors:

1. **Check Cloudflare SSL settings:**
   - Dashboard → SSL/TLS
   - Should be set to "Flexible" or "Full"
   - NOT "Full (Strict)" unless you have valid certs

2. **Recommended:** Use "Full" mode
   - Caddy automatically gets Let's Encrypt cert
   - More secure than "Flexible"

---

## Useful Commands

```bash
# View tunnel status
sudo cloudflared tunnel info placement-portal

# View tunnel list
cloudflared tunnel list

# View logs (live)
sudo journalctl -u cloudflared -f

# Restart tunnel service
sudo systemctl restart cloudflared

# Stop tunnel
sudo systemctl stop cloudflared

# Remove tunnel (if needed)
cloudflared tunnel delete placement-portal
```

---

## Security Best Practices

1. **Enable Cloudflare WAF** (Web Application Firewall)
   - Dashboard → Security → WAF
   - Set to "On" for automatic protection

2. **Enable Rate Limiting** (optional, on paid plans)
   - Or use Caddy rate limiting (already in PRODUCTION_DEPLOYMENT.md)

3. **Restrict Access by Country** (optional)
   - Dashboard → Security → Settings → Security Level
   - Can block countries if needed

4. **Monitor Access Logs**
   - Dashboard → Analytics → Traffic
   - See all requests to your API

---

## Summary

**What you've done:**
1. ✅ Added domain to Cloudflare
2. ✅ Installed cloudflared on VM
3. ✅ Created tunnel: `placement-portal`
4. ✅ Configured DNS routing
5. ✅ Set up tunnel configuration
6. ✅ Installed as systemd service
7. ✅ Updated Caddyfile for production
8. ✅ Updated environment variables
9. ✅ Tested from internet

**Result:**
- ✅ Your VM is now accessible from anywhere: `https://api.yourdomain.com`
- ✅ Automatic HTTPS/SSL
- ✅ DDoS protection included
- ✅ No firewall configuration needed
- ✅ GitHub Actions still works (local on VM)

**Next Steps:**
- Update and deploy frontend with new API URL
- Update and rebuild mobile apps
- Test all features end-to-end
- Monitor via Cloudflare dashboard

---

## Cost

- **Cloudflare Tunnel:** FREE ✅
- **Cloudflare DNS:** FREE ✅
- **Cloudflare CDN:** FREE ✅
- **Cloudflare DDoS:** FREE ✅
- **SSL Certificates:** FREE ✅
- **Domain:** ~$10/year (one-time cost)

**Total:** ~$0.83/month (domain only)

---

**Your production setup is now complete!** 🎉
