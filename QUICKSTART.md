# Quick Start Guide

Get Media Connector running in under 5 minutes!

## For Docker Users (Easiest)

### Step 1: Run the Container
```bash
docker run -d \
  --name=media-connector \
  -p 3001:3001 \
  -v $(pwd)/config:/config \
  --restart unless-stopped \
  ghcr.io/gittimerider/media-connector:latest
```

### Step 2: Open Web Interface
Open your browser and go to:
```
http://localhost:3001
```

### Step 3: Add Your Services
1. Click **Settings** in the sidebar
2. Click **Add** for your service (e.g., Sonarr)
3. Fill in:
   - Name: `My Sonarr`
   - URL: `http://192.168.1.100:8989` (your server)
   - API Key: (found in Sonarr Settings → General → Security)
4. Click **Test Connection**
5. Click **Save**

### Step 4: Browse Your Media
- Click **TV Shows** to see your Sonarr library
- Click **Movies** to see your Radarr library
- Click **Downloads** to monitor active downloads
- Click **Dashboard** for an overview

**That's it! You're ready to manage your media!**

---

## For Docker Compose Users

### Step 1: Create docker-compose.yml
```yaml
version: '3.8'
services:
  media-connector:
    image: ghcr.io/gittimerider/media-connector:latest
    container_name: media-connector
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./config:/config
```

### Step 2: Start
```bash
docker-compose up -d
```

### Step 3: Configure
Open `http://localhost:3001` and add your services in Settings.

---

## Common Service URLs

If you're running services on the same machine:
- **Sonarr**: `http://localhost:8989`
- **Radarr**: `http://localhost:7878`
- **SABnzbd**: `http://localhost:8080`
- **qBittorrent**: `http://localhost:8081`
- **Overseerr**: `http://localhost:5055`

If services are on another machine:
- Replace `localhost` with the IP address
- Example: `http://192.168.1.100:8989`

---

## Finding API Keys

### Sonarr/Radarr/Lidarr/Readarr
Settings → General → Security → API Key

### SABnzbd
Config → General → Security → API Key

### Overseerr
Settings → General → API Key

### Tautulli
Settings → Web Interface → API Key

---

## Troubleshooting

### Can't connect to services?
- Check if the URL is correct
- Make sure ports are open
- Try accessing the service URL in a browser first
- Use the **Test Connection** button in Settings

### Container won't start?
```bash
# Check logs
docker logs media-connector

# Check if port 3001 is already in use
```

### Services not showing data?
- Verify API key is correct
- Check service is actually running
- Look at browser console for errors (F12)

---

## Next Steps

Once configured:
- ⭐ **Star the project** on GitHub
- 📖 Read the full [README](README.md) for advanced features
- 🐛 Report issues on [GitHub Issues](https://github.com/GitTimeraider/media-connector/issues)
- 💡 Request features in [Discussions](https://github.com/GitTimeraider/media-connector/discussions)

---

## Need Help?

- 📚 [Full Installation Guide](docs/INSTALLATION.md)
- 🔒 [Security Best Practices](SECURITY.md)
- 🤝 [Contributing Guide](CONTRIBUTING.md)
- 💬 [GitHub Discussions](https://github.com/GitTimeraider/media-connector/discussions)

---

**Enjoy your centralized media management! 🎬🎵📚**
