const fs = require('fs');
const path = require('path');

const CONFIG_FILE = process.env.CONFIG_FILE || '/config/services.json';
const DEFAULT_CONFIG = {
  services: {
    sonarr: [],
    radarr: [],
    lidarr: [],
    readarr: [],
    sabnzbd: [],
    nzbget: [],
    qbittorrent: [],
    transmission: [],
    deluge: [],
    overseerr: [],
    tautulli: [],
    prowlarr: [],
    jackett: [],
    unraid: []
  }
};

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return DEFAULT_CONFIG;
  }

  saveConfig() {
    try {
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  getServices(type) {
    return this.config.services[type] || [];
  }

  addService(type, service) {
    if (!this.config.services[type]) {
      this.config.services[type] = [];
    }
    service.id = Date.now().toString();
    this.config.services[type].push(service);
    this.saveConfig();
    return service;
  }

  updateService(type, id, updates) {
    const services = this.config.services[type] || [];
    const index = services.findIndex(s => s.id === id);
    if (index !== -1) {
      this.config.services[type][index] = { ...services[index], ...updates };
      this.saveConfig();
      return this.config.services[type][index];
    }
    return null;
  }

  deleteService(type, id) {
    const services = this.config.services[type] || [];
    this.config.services[type] = services.filter(s => s.id !== id);
    this.saveConfig();
    return true;
  }

  getAllServices() {
    return this.config.services;
  }
}

module.exports = new ConfigManager();
