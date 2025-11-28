const ServicesModel = require('../models/Services');

/**
 * ConfigManager - Wrapper around ServicesModel for backward compatibility
 * This maintains the same API as the old file-based config manager
 * but uses SQLite database underneath
 */
class ConfigManager {
  async getServices(type) {
    return await ServicesModel.getServicesByType(type);
  }

  async addService(type, service) {
    return await ServicesModel.createService(type, service);
  }

  async updateService(type, id, updates) {
    return await ServicesModel.updateService(id, updates);
  }

  async deleteService(type, id) {
    await ServicesModel.deleteService(id);
    return true;
  }

  async getAllServices() {
    return await ServicesModel.getAllServices();
  }
}

module.exports = new ConfigManager();
