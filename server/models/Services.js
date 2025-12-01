const crypto = require('crypto');
const db = require('../config/database');

class ServicesModel {
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get all services
   */
  async getAllServices() {
    try {
      const services = await db.all(
        'SELECT id, type, name, url, api_key, username, password, enabled, created_at, updated_at FROM services ORDER BY type, name'
      );
      
      // Group by type for backward compatibility
      const grouped = {};
      for (const service of services) {
        if (!grouped[service.type]) {
          grouped[service.type] = [];
        }
        grouped[service.type].push({
          id: service.id,
          name: service.name,
          url: service.url,
          apiKey: service.api_key,
          username: service.username,
          password: service.password,
          enabled: service.enabled === 1,
          createdAt: service.created_at,
          updatedAt: service.updated_at
        });
      }
      
      return grouped;
    } catch (error) {
      console.error('Error getting all services:', error);
      return {};
    }
  }

  /**
   * Get services by type
   */
  async getServicesByType(type) {
    try {
      const services = await db.all(
        'SELECT id, name, url, api_key, username, password, enabled, created_at, updated_at FROM services WHERE type = ? ORDER BY name',
        [type]
      );
      
      return services.map(service => ({
        id: service.id,
        name: service.name,
        url: service.url,
        apiKey: service.api_key,
        username: service.username,
        password: service.password,
        enabled: service.enabled === 1,
        createdAt: service.created_at,
        updatedAt: service.updated_at
      }));
    } catch (error) {
      console.error('Error getting services for type:', type, error);
      return [];
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(id) {
    try {
      const service = await db.get(
        'SELECT * FROM services WHERE id = ?',
        [id]
      );
      
      if (!service) return null;
      
      return {
        id: service.id,
        type: service.type,
        name: service.name,
        url: service.url,
        apiKey: service.api_key,
        username: service.username,
        password: service.password,
        enabled: service.enabled === 1,
        createdAt: service.created_at,
        updatedAt: service.updated_at
      };
    } catch (error) {
      console.error('Error getting service:', id, error);
      return null;
    }
  }

  /**
   * Create a new service
   */
  async createService(type, serviceData) {
    const id = this.generateId();
    
    try {
      await db.run(
        `INSERT INTO services (id, type, name, url, api_key, username, password, enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          type,
          serviceData.name || type,
          serviceData.url || '',
          serviceData.apiKey || null,
          serviceData.username || null,
          serviceData.password || null,
          serviceData.enabled !== false ? 1 : 0
        ]
      );
      
      return await this.getServiceById(id);
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  /**
   * Update an existing service
   */
  async updateService(id, updates) {
    const service = await this.getServiceById(id);
    if (!service) {
      throw new Error('Service not found');
    }

    try {
      const fields = [];
      const values = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.url !== undefined) {
        fields.push('url = ?');
        values.push(updates.url);
      }
      if (updates.apiKey !== undefined) {
        fields.push('api_key = ?');
        values.push(updates.apiKey);
      }
      if (updates.username !== undefined) {
        fields.push('username = ?');
        values.push(updates.username);
      }
      if (updates.password !== undefined) {
        fields.push('password = ?');
        values.push(updates.password);
      }
      if (updates.enabled !== undefined) {
        fields.push('enabled = ?');
        values.push(updates.enabled ? 1 : 0);
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await db.run(
        `UPDATE services SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return await this.getServiceById(id);
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  /**
   * Delete a service
   */
  async deleteService(id) {
    try {
      await db.run('DELETE FROM services WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  /**
   * Save all services (for backward compatibility)
   */
  async saveServices(servicesObject) {
    try {
      // Delete all existing services
      await db.run('DELETE FROM services');
      
      // Insert new services
      for (const [type, instances] of Object.entries(servicesObject)) {
        if (Array.isArray(instances)) {
          for (const instance of instances) {
            await this.createService(type, instance);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving services:', error);
      throw error;
    }
  }
}

module.exports = new ServicesModel();
