# Production Deployment Guide - Placement Portal

> **Complete architecture and deployment guide for production setup on Ubuntu VM with 10K+ concurrent users**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Components](#infrastructure-components)
3. [Container Orchestration (K8s vs Docker Compose)](#container-orchestration)
4. [Production Setup Guide](#production-setup-guide)
5. [Scaling Strategy](#scaling-strategy)
6. [Security & Monitoring](#security--monitoring)
7. [Cost Analysis](#cost-analysis)

---

## Architecture Overview

### Current Setup

```
┌─────────────────────────────────────────────────────────────┐
│                         Local Network                        │
│                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐           │
│  │ Frontend │────▶│  Caddy   │────▶│ Go API   │           │
│  │  (Web)   │     │ (Reverse │     │ (Fiber)  │           │
│  └──────────┘     │  Proxy)  │     └────┬─────┘           │
│                   └────┬─────┘           │                  │
│                        │       ┌─────────▼────────┐         │
│                        └──────▶│ DB Migrations    │         │
│                                └─────────┬────────┘         │
│                                          │                  │
│                                          ▼                  │
│                                      PostgreSQL             │
└─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### Production Architecture

```
                                    ┌─────────────────────────┐
                                    │   Cloudflare Network    │
                                    │  (Edge, DDoS Protection)│
                                    └───────────┬─────────────┘
                                                │ HTTPS
                                ┌───────────────▼────────────────┐
                                │   Cloudflare Tunnel (Agent)    │
                                │   Running on Ubuntu VM         │
                                └───────────────┬────────────────┘
                                                │
                                ┌───────────────▼────────────────┐
                                │         Caddy (Port 80)        │
                                │    - Reverse Proxy             │
                                │    - Load Balancer             │
                                │    - SSL Termination           │
                                └───┬────────┬──────────┬────────┘
                                    │        │          │
                         ┌──────────┴──┐  ┌──┴───┐  ┌──┴────────┐
                         │  API Pod 1  │  │ Pod 2│  │  Pod 3    │
                         │  (Replica)  │  │      │  │           │
                         └──────┬──────┘  └──┬───┘  └──┬────────┘
                                │            │         │
                                └────────────┴─────────┘
                                             │
                                   ┌─────────▼──────────┐
                                   │   PostgreSQL       │
                                   │  (Shared Database) │
                                   └────────────────────┘
                                             
                                   ┌────────────────────┐
                                   │   Garage Storage   │
                                   │  (Shared Storage)  │
                                   └────────────────────┘
```

**Request Flow**:
1. Client → Cloudflare Edge (DDoS protection, SSL encryption)
2. Cloudflare → Tunnel → VM (encrypted connection through firewall)
3. Tunnel → Caddy (reverse proxy, load balancing)
4. Caddy → Go API instances (Round Robin distribution)
5. Go API → PostgreSQL/Garage (data and file storage)

---

## Infrastructure Components

### 1. API Gateway

**What is it?**
Single entry point for all API requests providing routing, authentication, rate limiting, and monitoring.

**Popular Options:**
- Kong
- AWS API Gateway
- Nginx Plus
- Traefik

**Your Setup:** ✅ **No separate service needed**

Your **Go API (Fiber) + Caddy** already provides all API Gateway features:

| Feature | Implementation |
|---------|----------------|
| Request Routing | Caddy → API routes, Fiber handles internal routing |
| Authentication | JWT middleware in Fiber |
| Rate Limiting | Can add to Caddy |
| CORS | Fiber CORS middleware |
| Logging | Fiber logger |
| SSL/TLS | Caddy auto-HTTPS |
| Load Balancing | Caddy built-in |

**Verdict:** Your Go API IS your API Gateway ✅

---

### 2. Reverse Proxy

**What is it?**
Sits in front of servers and forwards requests, providing SSL termination, load balancing, and security.

**Your Choice:** ✅ **Caddy** (already configured)

**Why Caddy?**
- ✅ Automatic HTTPS with Let's Encrypt
- ✅ Simple configuration (Caddyfile)
- ✅ Built-in load balancing
- ✅ Built-in rate limiting
- ✅ Lightweight and fast
- ✅ Written in Go (same as your API)

**Alternatives:** Nginx (complex), Traefik (overkill), HAProxy (no auto-HTTPS)

---

### 3. Load Balancer

**What is it?**
Distributes requests across multiple servers to prevent overload and improve availability.

**Your Setup:** ✅ **Caddy's built-in load balancing**

**Load Balancing Algorithms:**

| Algorithm | Description | Best For | Recommended? |
|-----------|-------------|----------|--------------|
| **Round Robin** | Sequential distribution | Equal server capacity | ✅ **YES** (Start here) |
| Least Connections | Server with fewest connections | Varying request times | ✅ Use if Round Robin insufficient |
| IP Hash | Same client → same server | Session persistence | ❌ Not needed (stateless JWT) |
| Random | Random selection | Simple distribution | ❌ Less predictable |
| Weighted | Based on server capacity | Different specs | ⚠️ Only if servers differ |

**Choice:** **Round Robin** - Simple, effective, works perfectly when all Docker containers are identical.

---

### 4. Internet Exposure

**Problem:** VM behind college firewall, cannot accept incoming connections.

**Solution:** ✅ **Cloudflare Tunnel** (FREE)

**Why Cloudflare Tunnel?**
- ✅ FREE unlimited bandwidth
- ✅ No firewall ports needed
- ✅ Built-in DDoS protection
- ✅ Automatic HTTPS
- ✅ Zero-trust security
- ✅ Works behind NAT/firewall
- ✅ No public IP required

**Alternatives:**

| Solution | Cost | Pros | Cons |
|----------|------|------|------|
| Cloudflare Tunnel | FREE | All features, unlimited | Requires Cloudflare domain |
| Ngrok | $8/mo | Simple setup | Limited bandwidth (free tier) |
| Tailscale | FREE | Secure mesh VPN | Requires client on devices |
| Port Forwarding | FREE | Direct connection | Need firewall access ❌ |

---

## Container Orchestration

### Kubernetes vs Docker Compose

**Question:** Do we need Kubernetes (K8s) to manage replicas?

**Answer:** ❌ **NO - Docker Compose is perfect for your use case**

#### Docker Compose is Sufficient ✅

**Why:**
- ✅ Single VM deployment (K8s is for multi-node clusters)
- ✅ Simple replica management: `deploy.replicas: 3`
- ✅ Caddy automatically discovers and load balances replicas
- ✅ Easy to understand and maintain
- ✅ No operational overhead
- ✅ Native to Docker, zero additional setup

**Example:**
```yaml
services:
  api:
    build: .
    deploy:
      replicas: 3  # Run 3 instances
    environment:
      # Same env vars
```

Caddy automatically balances across all 3 replicas. Done!

#### Kubernetes is Overkill ❌

**Why NOT use K8s:**
- ❌ Designed for **multi-node clusters** (you have 1 VM)
- ❌ Complex setup and maintenance
- ❌ Resource overhead (~2GB RAM for control plane)
- ❌ Multi-node benefits don't apply to single VM
- ❌ Over-engineering for 10K users

**When you'd actually need K8s:**
- Multiple physical servers/VMs (10+ nodes)
- 100K+ concurrent users
- Complex microservices (50+ services)
- Multi-region deployment
- Advanced auto-scaling requirements

**Decision:** ✅ **Use Docker Compose** - Simpler, sufficient, scalable to 10K+ users

---

## Production Setup Guide

### Phase 1: VM Setup (Ubuntu 24 LTS)

**Requirements:**
- Ubuntu 24 LTS, 500GB storage
- Docker & Docker Compose
- SSH access

**Commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git curl

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Clone repository
git clone <your-repo-url>
cd placement-portal-kec-admin/backend

# Configure environment
cp .env.example .env
# Edit .env with production values

# Deploy all services (Migrations will run automatically)
docker compose up -d --build
```

---

### Phase 2: Garage Initialization

**Commands:**

```bash
# 1. Get Garage node ID
docker exec -it local_storage /garage status

# 2. Create cluster layout (replace <node_id_prefix> with your actual ID)
docker exec -it local_storage /garage layout assign -z dc1 -c 10G <node_id_prefix>
docker exec -it local_storage /garage layout apply --version 1

# 3. Create bucket
docker exec -it local_storage /garage bucket create placement-portal-bucket

# 4. Create API key (SAVE THESE CREDENTIALS!)
docker exec -it local_storage /garage key create admin

# 5. Grant permissions
docker exec -it local_storage /garage bucket allow \
  --read --write --owner \
  placement-portal-bucket \
  --key admin

# 6. Update .env with real credentials from step 4
# GARAGE_ACCESS_KEY=<key_id>
# GARAGE_SECRET_KEY=<secret_key>

# 7. Restart API
docker compose restart api
```

**Verification:**
```bash
# Check Garage health
curl http://localhost:3903/health
# Response: "Garage is fully operational"

# Check bucket info
docker exec local_storage /garage bucket info placement-portal-bucket
```

---

### Phase 3: Cloudflare Tunnel Setup

**Prerequisites:**
- Domain name (e.g., `api.yourdomain.com`)
- Cloudflare account (free)

**Steps:**

1. **Add domain to Cloudflare**
   - Sign up at cloudflare.com
   - Add your domain
   - Update nameservers at registrar

2. **Install cloudflared on VM**

```bash
# Download and install
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login
```

3. **Create tunnel**

```bash
# Create tunnel named 'placement-portal'
cloudflared tunnel create placement-portal

# Note the Tunnel ID from output
```

4. **Route domain to tunnel**

```bash
# Route your domain to the tunnel
cloudflared tunnel route dns placement-portal api.yourdomain.com
```

5. **Configure tunnel**

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /root/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  # Route all traffic to Caddy
  - hostname: api.yourdomain.com
    service: http://localhost:80
  
  # Catch-all (required)
  - service: http_status:404
```

6. **Install as system service**

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

---

### Phase 4: Caddy Configuration

**Update Caddyfile for production:**

```caddyfile
{
    email your-email@example.com
}

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
        reverse_proxy api:8080  # Auto-discovers replicas
    }
    
    # Swagger docs
    handle_path /docs/* {
        rewrite * /swagger{uri}
        reverse_proxy api:8080
    }

    # Garage Storage
    handle_path /storage/* {
        reverse_proxy garage:3900
    }

    # Default response
    handle /* {
        respond "Placement Portal API" 200
    }
}
```

**Update .env:**

```env
GARAGE_PUBLIC_URL=https://api.yourdomain.com/storage
```

---

## Scaling Strategy

### Performance Estimates

**Single Server (1 instance):**
- Concurrent Users: 1,000-2,000
- Requests/Second: 500-1,000
- Response Time: 50-200ms

**Scaled Setup (3 replicas):**
- Concurrent Users: 3,000-6,000
- Requests/Second: 1,500-3,000
- Response Time: 50-150ms

**For 10K+ Users:**
- API Replicas: 5-7 instances
- Database: Consider read replicas
- **Caching**: Redis (Already included in `docker-compose.yml`)
- CDN: Cloudflare for static assets

### Redis Usage Note
Redis is currently running in your infrastructure (`redis_cache` container). It is **ready for use** but currently **inactive** in the Go code. 
- **Purpose**: Future implementation of caching for hot routes (Drive lists, Student profiles) and WebHook rate limiting.
- **Overhead**: Negligible (< 20MB RAM). It is safe to keep running.

---

### Horizontal Scaling (Docker Compose)

**Update docker-compose.yml:**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    deploy:
      replicas: 3  # Scale to 3 instances
    environment:
      # Same environment variables
    depends_on:
      postgres:
        condition: service_healthy
      garage:
        condition: service_started
```

Caddy automatically load balances across all replicas. No additional configuration needed!

---

### Rate Limiting (Prevent Abuse)

**Add to Caddyfile:**

```caddyfile
api.yourdomain.com {
    # Rate limiting: 100 req/sec per IP
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1s
        }
    }
    
    # Rest of config...
}
```

**Recommended Limits:**
- Per IP: 100 requests/second
- Burst: 200 requests/second
- Global: 10,000 requests/second

---

## Security & Monitoring

### Defense in Depth (6 Layers)

```
1. Cloudflare WAF & DDoS Protection    ← First defense
2. Cloudflare Tunnel (Encrypted)       ← No exposed ports
3. Caddy Rate Limiting                 ← Prevent abuse
4. JWT Authentication (Fiber)          ← Verify identity
5. Role-Based Access (RBAC)            ← Admin vs Student
6. Input Validation                    ← Prevent injection
```

---

### Monitoring

**Essential Metrics:**

1. **API Performance**
   - Request rate (RPS)
   - Response time (p50, p95, p99)
   - Error rate (4xx, 5xx)

2. **System Resources**
   - CPU/Memory usage
   - Disk usage (via `/api/v1/admin/system/storage`)
   - Network bandwidth

3. **Database**
   - Connection pool usage
   - Query performance
   - Slow queries

4. **Storage (Garage)**
   - Object count
   - Total size
   - Upload/download speed

**Tools:**
- Prometheus + Grafana (industry standard, free)
- Caddy `/metrics` endpoint
- Docker stats: `docker stats`

---

## Cost Analysis

| Service | Cost | Notes |
|---------|------|-------|
| Ubuntu VM | College-provided | FREE |
| Cloudflare Tunnel | FREE | Unlimited bandwidth |
| Docker/Garage | FREE | Open source |
| Domain | ~$10-15/year | For professional URL |
| **Total Monthly** | **$0-1** | Extremely cost-effective |

**No paid services required!**

---

## Decision Matrix

| Component | Solution | Why |
|-----------|----------|-----|
| **Reverse Proxy** | Caddy | Auto-HTTPS, simple config, built-in load balancing |
| **API Gateway** | Go API + Caddy | Already have all features |
| **Load Balancer** | Caddy | Built-in, Round Robin |
| **Container Orchestration** | Docker Compose | Simple, sufficient for single VM |
| **Internet Exposure** | Cloudflare Tunnel | Free, secure, works behind firewall |
| **SSL/TLS** | Caddy + Cloudflare | Automatic, zero config |
| **Rate Limiting** | Caddy | Simple, effective |
| **Authentication** | JWT in Go API | Stateless, scalable |
| **Load Balancing Algorithm** | Round Robin | Simple, effective for equal containers |

---

## Implementation Checklist

### Phase 1: Basic Production ✅
- [x] Caddy reverse proxy configured
- [x] Go API serving requests
- [x] PostgreSQL database
- [x] Garage object storage initialized
- [ ] Cloudflare Tunnel setup
- [ ] Production domain configured
- [ ] SSL certificates (automatic)

### Phase 2: Optimization
- [ ] Add rate limiting to Caddy
- [ ] Enable Caddy access logs
- [ ] Configure health checks
- [ ] Set up monitoring (Prometheus/Grafana)

### Phase 3: Scaling (When Needed)
- [ ] Docker Compose replicas (3-5 instances)
- [ ] Load balancing verification
- [ ] Database connection pooling optimization
- [ ] Redis caching layer
- [ ] Database read replicas

---

## Summary

**What You Have** ✅:
- ✅ Reverse Proxy: Caddy
- ✅ API Gateway: Go API + Caddy
- ✅ Load Balancer: Caddy built-in
- ✅ Container Orchestration: Docker Compose
- ✅ Authentication: JWT
- ✅ Database: PostgreSQL
- ✅ Storage: Garage

**What You Don't Need** ❌:
- ❌ Kubernetes (overkill for single VM)
- ❌ Standalone API Gateway (Kong, AWS)
- ❌ Separate Load Balancer (HAProxy, Nginx)
- ❌ Service Mesh (Istio, Linkerd)

**Your Stack:**
- ✅ Simple to manage
- ✅ Cost-effective (FREE)
- ✅ Scalable to 10K+ users
- ✅ Production-ready

**Next Steps:**
1. Set up VM with Docker
2. Initialize Garage with real credentials
3. Configure Cloudflare Tunnel
4. Deploy and test
5. Scale as needed with Docker Compose replicas

**Architecture Status:** ✅ **Production-Ready, Simple, Cost-Effective, Scalable**
