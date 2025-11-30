const WebSocket = require('ws');
const { EventEmitter } = require('events');

class UnraidSubscriptionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // instanceId -> { ws, subscriptions }
  }

  async subscribe(instanceId, url, apiKey) {
    // Close existing connection if any
    if (this.connections.has(instanceId)) {
      this.unsubscribe(instanceId);
    }

    try {
      // Convert http(s) URL to ws(s)
      const wsUrl = url.replace(/^http/, 'ws') + '/graphql';
      
      console.log(`Connecting to Unraid WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl, {
        headers: {
          'x-api-key': apiKey,
          'Sec-WebSocket-Protocol': 'graphql-ws'
        }
      });

      // GraphQL WebSocket subprotocol initialization
      ws.on('open', () => {
        console.log(`WebSocket connected to Unraid instance ${instanceId}`);
        
        // Send connection_init message
        ws.send(JSON.stringify({
          type: 'connection_init',
          payload: {}
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`[Unraid WS ${instanceId}] Received message type: ${message.type}`);
          
          switch (message.type) {
            case 'connection_ack':
              console.log(`[Unraid WS ${instanceId}] Connection acknowledged`);
              // Start subscription after connection is acknowledged
              this.startSystemStatsSubscription(ws, instanceId);
              break;
              
            case 'data':
              // Emit system stats data
              console.log(`[Unraid WS ${instanceId}] Data message received:`, JSON.stringify(message, null, 2));
              if (message.payload && message.payload.data) {
                const data = message.payload.data;
                console.log(`[Unraid WS ${instanceId}] Stats data:`, JSON.stringify(data, null, 2));
                this.emit(`stats:${instanceId}`, message.payload.data);
              } else {
                console.log(`[Unraid WS ${instanceId}] No data in payload:`, JSON.stringify(message, null, 2));
              }
              break;
              
            case 'next':
              // Some GraphQL implementations use 'next' instead of 'data'
              console.log(`[Unraid WS ${instanceId}] Next message received:`, JSON.stringify(message, null, 2));
              if (message.payload && message.payload.data) {
                const data = message.payload.data;
                console.log(`[Unraid WS ${instanceId}] Stats data from 'next':`, JSON.stringify(data, null, 2));
                this.emit(`stats:${instanceId}`, message.payload.data);
              }
              break;
              
            case 'error':
              console.error(`[Unraid WS ${instanceId}] Error message:`, JSON.stringify(message.payload, null, 2));
              this.emit(`error:${instanceId}`, message.payload);
              break;
              
            case 'complete':
              console.log(`[Unraid WS ${instanceId}] Subscription complete`);
              break;
              
            default:
              console.log(`[Unraid WS ${instanceId}] Unknown message type '${message.type}':`, JSON.stringify(message, null, 2));
          }
        } catch (error) {
          console.error(`[Unraid WS ${instanceId}] Error parsing message:`, error);
          console.error(`[Unraid WS ${instanceId}] Raw data:`, data.toString());
        }
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for instance ${instanceId}:`, error.message);
        this.emit(`error:${instanceId}`, error);
      });

      ws.on('close', () => {
        console.log(`WebSocket closed for instance ${instanceId}`);
        this.connections.delete(instanceId);
        this.emit(`close:${instanceId}`);
      });

      this.connections.set(instanceId, { ws, subscriptions: new Set() });
      
      return true;
    } catch (error) {
      console.error(`Failed to connect WebSocket for instance ${instanceId}:`, error);
      throw error;
    }
  }

  startSystemStatsSubscription(ws, instanceId) {
    const subscriptionId = 'system-stats';
    
    // GraphQL subscription query for real-time system stats
    // Start with basic fields to test if subscription works at all
    const query = `
      subscription {
        info {
          cpu {
            speed
            usage
          }
          memory {
            total
            used
          }
          os {
            uptime
          }
        }
      }
    `;
    
    console.log(`[Unraid WS ${instanceId}] Starting subscription with query:`, query);

    const message = {
      id: subscriptionId,
      type: 'start',
      payload: {
        query: query,
        variables: {}
      }
    };

    ws.send(JSON.stringify(message));
    
    const connection = this.connections.get(instanceId);
    if (connection) {
      connection.subscriptions.add(subscriptionId);
    }
    
    console.log(`Started system stats subscription for instance ${instanceId}`);
  }

  unsubscribe(instanceId) {
    const connection = this.connections.get(instanceId);
    if (connection) {
      // Stop all subscriptions
      connection.subscriptions.forEach(subId => {
        connection.ws.send(JSON.stringify({
          id: subId,
          type: 'stop'
        }));
      });
      
      // Close WebSocket
      connection.ws.close();
      this.connections.delete(instanceId);
      
      console.log(`Unsubscribed from instance ${instanceId}`);
    }
  }

  unsubscribeAll() {
    this.connections.forEach((_, instanceId) => {
      this.unsubscribe(instanceId);
    });
  }

  isConnected(instanceId) {
    const connection = this.connections.get(instanceId);
    return connection && connection.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = UnraidSubscriptionManager;
