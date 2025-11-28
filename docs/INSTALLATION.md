# Installation Guide

This guide will help you install and configure Media Connector.

## Table of Contents
- [Docker Installation](#docker-installation)
- [Docker Compose Installation](#docker-compose-installation)
- [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [Troubleshooting](#troubleshooting)

## Docker Installation

### Prerequisites
- Docker installed on your system
- Basic understanding of Docker commands

### Steps

1. Create a directory for configuration:
```bash
mkdir -p ~/media-connector/config
cd ~/media-connector
```

2. Pull and run the container:
```bash
docker run -d \
  --name=media-connector \
  -p 3001:3001 \
  -v $(pwd)/config:/config \
  --restart unless-stopped \
  ghcr.io/gittimerider/media-connector:latest
```

3. Access the web interface:
```
http://localhost:3001
```

### Docker Run Options Explained

- `-d` - Run in detached mode (background)
- `--name=media-connector` - Container name
- `-p 3001:3001` - Port mapping (host:container)
- `-v $(pwd)/config:/config` - Mount config directory
- `--restart unless-stopped` - Auto-restart policy
- `ghcr.io/gittimerider/media-connector:latest` - Image to use

## Docker Compose Installation

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. Create a directory and download the compose file:
```bash
mkdir -p ~/media-connector
cd ~/media-connector
```

2. Create `docker-compose.yml`:
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
    environment:
      - NODE_ENV=production
      - PORT=3001
      - CONFIG_FILE=/config/services.json
```

3. Start the service:
```bash
docker-compose up -d
```

4. View logs:
```bash
docker-compose logs -f
```

5. Stop the service:
```bash
docker-compose down
```

## Manual Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Git

### Steps

1. Clone the repository:
```bash
git clone https://github.com/GitTimeraider/media-connector.git
cd media-connector
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

4. Build the frontend:
```bash
cd client
npm run build
cd ..
```

5. Create configuration directory:
```bash
mkdir -p config
```

6. Create environment file:
```bash
cp .env.example .env
```

7. Start the server:
```bash
npm start
```

8. For development with hot-reload:
```bash
npm run dev
```

## Configuration

### Initial Setup

1. Open your browser and navigate to `http://localhost:3001`

2. Click on **Settings** in the sidebar

3. Add your first service:
   - Click **Add** button for the service type
   - Enter a name (e.g., "Main Sonarr")
   - Enter the URL (e.g., `http://192.168.1.100:8989`)
   - Enter the API key (found in service settings)
   - Click **Test Connection**
   - Click **Save**

### Service-Specific Configuration

#### Sonarr/Radarr/Lidarr/Readarr
- URL: `http://your-server:port`
- API Key: Settings → General → Security → API Key

#### SABnzbd
- URL: `http://your-server:port`
- API Key: Config → General → Security → API Key

#### qBittorrent
- URL: `http://your-server:port`
- Username: Your qBittorrent username
- Password: Your qBittorrent password
- Note: Enable Web UI in qBittorrent settings

#### NZBGet
- URL: `http://your-server:port`
- Username: Control username from nzbget.conf
- Password: Control password from nzbget.conf

#### Overseerr
- URL: `http://your-server:port`
- API Key: Settings → General → API Key

#### Tautulli
- URL: `http://your-server:port`
- API Key: Settings → Web Interface → API Key

### Environment Variables

You can configure the following environment variables:

```env
NODE_ENV=production          # Environment mode
PORT=3001                    # Server port
CONFIG_FILE=/config/services.json  # Config file location
```

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name media-connector.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik (Docker Labels)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.media-connector.rule=Host(`media-connector.example.com`)"
  - "traefik.http.routers.media-connector.entrypoints=websecure"
  - "traefik.http.routers.media-connector.tls.certresolver=myresolver"
  - "traefik.http.services.media-connector.loadbalancer.server.port=3001"
```

### Caddy

```
media-connector.example.com {
    reverse_proxy localhost:3001
}
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs media-connector

# Check if port is in use
netstat -tulpn | grep 3001
```

### Can't connect to services
- Verify service URLs are accessible from the container
- Check firewall rules
- Ensure API keys are correct
- Test connection using the "Test Connection" button

### Configuration not persisting
- Ensure config volume is mounted correctly
- Check file permissions on config directory
- Verify CONFIG_FILE environment variable

### Frontend not loading
```bash
# Rebuild frontend
cd client
npm run build

# Or pull latest image
docker pull ghcr.io/gittimerider/media-connector:latest
```

### Common Issues

1. **CORS errors** - Make sure proxy settings in client/package.json are correct
2. **API timeouts** - Increase timeout in server/utils/apiClient.js
3. **Memory issues** - Increase Docker memory limits
4. **Permission denied** - Check user permissions on config directory

For more help, open an issue on GitHub: https://github.com/GitTimeraider/media-connector/issues
