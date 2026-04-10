# FIX-R EC2 AI Server — Setup Guide

This guide walks you through launching an AWS EC2 instance to serve as the AI
inference backend for your FIX-R platform.

---

## 1. Launch the EC2 Instance

### Recommended Instance Types

| Use Case | Instance | vCPUs | RAM | GPU | Est. Cost |
|---|---|---|---|---|---|
| Light / Testing | `t3.xlarge` | 4 | 16 GB | None | ~$0.17/hr |
| General Chat | `m5.2xlarge` | 8 | 32 GB | None | ~$0.38/hr |
| GPU (fast inference) | `g4dn.xlarge` | 4 | 16 GB | T4 16GB | ~$0.53/hr |
| GPU (large models) | `g4dn.2xlarge` | 8 | 32 GB | T4 16GB | ~$0.75/hr |

> **Tip:** GPU instances (`g4dn`) are 5–20× faster for inference. Use CPU instances
> only for smaller models (≤7B parameters) where speed is less critical.

### AMI
- **Ubuntu Server 22.04 LTS** (x86_64) — search for it in the AMI catalog.
- For GPU instances, also select the **Deep Learning AMI** variant — it ships
  with CUDA pre-installed.

### Storage
- Minimum **30 GB** root volume (EBS gp3).
- Add **50–100 GB** for model storage (each model is 2–7 GB).

### Security Group — Required Inbound Rules

| Port | Protocol | Source | Purpose |
|---|---|---|---|
| 22 | TCP | Your IP only | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP (Nginx proxy) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (optional, for SSL) |

> **Do NOT open port 11434** (Ollama's native port) to the public.
> The Nginx proxy handles all external access.

---

## 2. Connect to Your Instance

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

---

## 3. Run the Setup Script

Copy the files from this folder to your EC2 instance:

```bash
# From your local machine
scp -i your-key.pem setup.sh add-model.sh rotate-api-key.sh status.sh ubuntu@<EC2-PUBLIC-IP>:~/
```

Then on the EC2 instance:

```bash
sudo bash setup.sh
```

The script will:
1. Install and start **Ollama** (the inference engine)
2. Generate a random **API key** (saved to `/etc/fixr/api.key`)
3. Configure **Nginx** as a reverse proxy with Bearer token authentication
4. Enable **UFW firewall** (ports 22, 80, 443 only)
5. Enable **fail2ban** (brute-force protection)
6. Optionally pull the `llama3.2` model (~2 GB)

At the end, the script prints your **Base URL** and **API Key** — save these.

---

## 4. Pull a Model

If you skipped the model pull during setup, or want a different model:

```bash
sudo bash add-model.sh
```

This shows a list of popular models and lets you choose one.

### Model Recommendations by Instance

| Instance RAM | Recommended Model | Notes |
|---|---|---|
| 16 GB | `llama3.2`, `phi3`, `gemma2:2b` | Fast, good quality |
| 32 GB | `llama3.1:8b`, `mistral`, `qwen2.5:7b` | High quality |
| 32 GB + GPU | `llama3.1:8b`, `mistral-nemo` | Fast + high quality |

---

## 5. (Optional) Add HTTPS with Let's Encrypt

If you have a domain pointing to your EC2 instance:

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot will automatically update the Nginx config and set up auto-renewal.

After this, your Base URL becomes `https://your-domain.com`.

---

## 6. Verify Everything Is Working

Run the status check:

```bash
bash status.sh
```

Test the endpoint manually (replace values with yours):

```bash
# Health check (no auth required)
curl http://<EC2-PUBLIC-IP>/health

# Chat completion test
curl http://<EC2-PUBLIC-IP>/v1/chat/completions \
  -H "Authorization: Bearer <YOUR-API-KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Say hello in one sentence."}]
  }'
```

You should get a JSON response with a `choices[0].message.content` field.

---

## 7. Add the Server to FIX-R

1. Open your FIX-R app and log in as an admin
2. Go to **Admin → Servers** (or the Servers page)
3. Click **Add Server** and fill in:

| Field | Value |
|---|---|
| Name | `EC2 AI Server` (or whatever you like) |
| Base URL | `http://<EC2-PUBLIC-IP>` (or `https://your-domain.com`) |
| Model | `llama3.2` (or whichever model you pulled) |
| API Key | The key printed at the end of `setup.sh` |

4. Optionally set it as the **default server**
5. Click **Save**

FIX-R will now route chat requests to your EC2 instance.

---

## 8. Ongoing Management

### Check server status
```bash
bash status.sh
```

### Add or change the model
```bash
sudo bash add-model.sh llama3.1:8b
```

### Rotate the API key
```bash
sudo bash rotate-api-key.sh
```
Then update the API Key field in FIX-R Admin → Servers.

### View Ollama logs
```bash
journalctl -u ollama -f
```

### View Nginx access logs
```bash
tail -f /var/log/nginx/access.log
```

### Restart services
```bash
sudo systemctl restart ollama
sudo systemctl restart nginx
```

---

## 9. Cost Optimization Tips

- **Use a Spot Instance** for non-production or batch workloads — up to 70% cheaper.
- **Stop the instance** when not in use (you only pay for running hours).
- **Use EBS snapshot** before stopping so you don't lose downloaded models.
- For production, consider **Reserved Instances** (1-year) for ~40% savings.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `curl: (7) Connection refused` | Check `sudo systemctl status nginx` |
| `401 Unauthorized` | Verify your API key matches `/etc/fixr/api.key` |
| Ollama not responding | `sudo systemctl restart ollama` |
| Model not found | Run `ollama list` and check the model name spelling |
| Very slow responses | Upgrade to a GPU instance or use a smaller model |
| Port 11434 not reachable | Correct — it's internal only; use port 80/443 via Nginx |
