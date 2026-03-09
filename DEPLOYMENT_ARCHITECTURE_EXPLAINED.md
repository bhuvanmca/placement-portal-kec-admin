# The Big Picture: How Everything Connects

Here is the entire roadmap of your architecture from front to back, explained in simple layman terms. 

Think of your project as a **Restaurant**.

### 1. The VM & College Network (The Kitchen)
*   **What you have:** The VM running on the college network.
*   **What it does:** This is where the actual cooking happens. Your `backend-api`, `chat-service`, `postgres` database, and `garage` storage are all running here using Docker Compose.
*   **The Static SSH IP:** This is the **Staff Only Backdoor**. You use this IP (only when connected to the college Wi-Fi) to walk into the kitchen, check the logs, or manually fix things. Students and regular users **never** use this IP.

### 2. GitHub Actions Runner (The Sous-Chef)
*   **What it does:** Right now, you have a runner installed in your VM. When you push code to the `main` branch on GitHub, GitHub tells the runner: *"Hey, there's a new recipe!"* The runner automatically pulls the new code, runs `docker compose build`, and restarts the containers.
*   **The Problem:** Your `chat-service` folder is outside your `backend` folder, but your GitHub repo only contains the `backend` folder. When the runner downloads the code, it doesn't get the `chat-service` code!
*   **The Fix for Later:** We will need to either move the `chat-service` folder *inside* the backend repository or create a new "monorepo" that contains both, so the runner pulls everything together.

### 3. The Cloudflare Tunnel (The Delivery Driver)
*   **What it does:** Right now, your API is trapped inside the college network. No one on the outside internet can reach it. By running that `cloudflared service install` command in your VM, you create a dedicated "Delivery Driver."
*   **How it works:** This driver takes whatever data your API dishes out on `localhost:80` (where Caddy is running) and drives it out to Cloudflare's massive public servers on the internet. It does this from the *inside out*, which is why we don't need the college to open any firewall ports.

### 4. The Domain Name (The Restaurant Signboard)
*   **What you get:** The SysAdmin gives you a public domain name: `placement-portal-kec.kongu.edu`.
*   **DNS Delegation:** By giving control of this domain (via Nameservers) to Cloudflare, Cloudflare becomes the boss of this domain. 
*   **The Connection:** Inside the Cloudflare Zero Trust dashboard, you will say: *"Whenever someone visits `api.placement-portal-kec.kongu.edu`, send that traffic down the Tunnel to the VM's `localhost:80`."*

---

## 5. The Final User Flow (How Students Connect)

You asked: *"Will we be make api calls to the api... or with the static ip...?"*

**Answer: You will ONLY use the public domain.**

Once this is all set up:
1.  **In your Flutter App (`constants.dart`):** You will change the `baseUrl` from `http://172.20.10.6/api` to `https://api.placement-portal-kec.kongu.edu/api`.
2.  **In your Vercel React App:** You will set the backend URL to `https://api.placement-portal-kec.kongu.edu/api`.
3.  **The Flow:**
    *   A student opens the app on their 5G network at home.
    *   The app sends a login request to `https://api.placement-portal-kec.kongu.edu/api/v1/auth/login`.
    *   Cloudflare receives this request instantly.
    *   Cloudflare sends the request down the secure **Tunnel** directly to your VM.
    *   Your VM's **Caddy** receives it on port 80 and proxies it to the Go backend on port 8080.
    *   The Go backend verifies the login, connects to the database, and sends the JWT token back up the tunnel.
    *   The student is logged in!

---

## Step-by-Step Action Plan

1.  **Right Now:** Ask the SysAdmin to create the domain `placement-portal-kec.kongu.edu` and "Delegate the Nameservers to Cloudflare" using the 2 nameservers Cloudflare provides you.
2.  **Next:** Once Cloudflare says your domain is "Active", you log into the VM using your SSH Static IP.
3.  **Next:** Run the Cloudflare Tunnel installation command in the VM.
4.  **Next:** In the Cloudflare dashboard, route `api.placement-portal-kec.kongu.edu` to `http://localhost:80`.
5.  **Finally:** Update your mobile app and Vercel app to talk to `https://api.placement-portal-kec.kongu.edu`.

*(We can fix the GitHub actions/chat-service folder structure issue after the tunnel is online!)*
