const { createClient } = require('@clickhouse/client');

class ClickHouseService {
  constructor() {
    this.isConnected = false;
    this.client = null;
    this.debugMode = process.env.DEBUG_ANALYTICS === 'true';
    
    const config = {
      url: process.env.CLICKHOUSE_URL || 'https://akl2spzdfi.us-east-2.aws.clickhouse.cloud:8443',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD_SECRET || process.env.CLICKHOUSE_PASSWORD || '',
      application: 'analytics-service',
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 0,
      },
    };
    
    // Debug credential detection
    console.log('🔧 ClickHouse Credential Check:');
    console.log(`   URL: "${config.url}"`);
    console.log(`   Username: "${config.username}"`);
    console.log(`   Password: "${config.password ? '[SET]' : '[EMPTY]'}"`);
    console.log(`   Password length: ${config.password ? config.password.length : 0}`);
    
    // Improved credential validation
    const hasRealCredentials = this.validateCredentials(config);
    
    if (hasRealCredentials) {
      console.log('✅ Real credentials detected, attempting ClickHouse connection');
      this.client = createClient(config);
      this.initializeDatabase();
    } else {
      this.logWithIST('⚠️  ClickHouse: No real credentials provided, running in mock mode');
      this.isConnected = false;
    }
  }

  // Fixed credential validation - allows Kubernetes service URLs
  validateCredentials(config) {
    // Check if it's a Kubernetes service URL (should be allowed)
    const isKubernetesService = config.url && config.url.includes('.svc.cluster.local');
    
    // Check URL - reject known placeholder URLs (but allow K8s services)
    if (!config.url) {
      console.log('❌ No URL provided');
      return false;
    }
    
    // Allow Kubernetes service URLs even if they contain certain keywords
    if (!isKubernetesService) {
      if (config.url.includes('your-clickhouse-url') || 
          config.url === 'https://akl2spzdfi.us-east-2.aws.clickhouse.cloud:8443') {
        console.log('❌ Placeholder URL detected');
        return false;
      }
    } else {
      console.log('✅ Kubernetes service URL detected, allowing');
    }

    // Check username
    if (!config.username || config.username.trim() === '') {
      console.log('❌ Empty username detected');
      return false;
    }

    // Password validation - allow empty password for default user
    if (config.password !== undefined && config.password !== null) {
      // If password is set, check it's not a placeholder
      if (config.password === 'your-secure-password' || 
          config.password === 'your-password') {
        console.log('❌ Placeholder password detected');
        return false;
      }
    }

    // Special case: reject if it's the demo hardcoded password from the original code
    if (config.password === 'jg3YoKz2K~vw9') {
      console.log('❌ Demo/hardcoded password detected');
      return false;
    }

    console.log('✅ Credentials appear valid (empty password allowed for default user)');
    return true;
  }

  // Helper function to log with IST timestamp
  logWithIST(message, isError = false) {
    const istTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const logMessage = `[${istTime} IST] ${message}`;
    
    if (isError) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  async initializeDatabase() {
    try {
      // Test connection first
      await this.client.ping();
      this.logWithIST('✅ ClickHouse connection successful');
      this.isConnected = true;

      // Create database if it doesn't exist
      await this.client.exec({
        query: `CREATE DATABASE IF NOT EXISTS lugx_analytics`
      });

      // Create real-time analytics tables for streaming data
      await this.client.exec({
        query: `
          CREATE TABLE IF NOT EXISTS lugx_analytics.page_views_stream (
            id UUID DEFAULT generateUUIDv4(),
            user_id String,
            session_id String,
            page_url String,
            page_title String,
            referrer String,
            user_agent String,
            ip_address String,
            time_on_page UInt32,
            viewport_width UInt16,
            viewport_height UInt16,
            device String,
            timestamp DateTime DEFAULT now(),
            date Date DEFAULT toDate(timestamp)
          ) ENGINE = MergeTree()
          PARTITION BY date
          ORDER BY (session_id, timestamp)
        `
      });

      await this.client.exec({
        query: `
          CREATE TABLE IF NOT EXISTS lugx_analytics.click_events_stream (
            id UUID DEFAULT generateUUIDv4(),
            user_id String,
            session_id String,
            page_url String,
            element_type String,
            element_text String,
            element_id String,
            element_class String,
            click_x UInt16,
            click_y UInt16,
            timestamp DateTime DEFAULT now(),
            date Date DEFAULT toDate(timestamp)
          ) ENGINE = MergeTree()
          PARTITION BY date
          ORDER BY (session_id, timestamp)
        `
      });

      await this.client.exec({
        query: `
          CREATE TABLE IF NOT EXISTS lugx_analytics.scroll_depth_stream (
            id UUID DEFAULT generateUUIDv4(),
            user_id String,
            session_id String,
            page_url String,
            max_scroll_depth UInt8,
            scroll_milestones String,
            page_height UInt16,
            viewport_height UInt16,
            time_to_max_scroll UInt32,
            timestamp DateTime DEFAULT now(),
            date Date DEFAULT toDate(timestamp)
          ) ENGINE = MergeTree()
          PARTITION BY date
          ORDER BY (session_id, timestamp)
        `
      });

      await this.client.exec({
        query: `
          CREATE TABLE IF NOT EXISTS lugx_analytics.sessions_stream (
            id UUID DEFAULT generateUUIDv4(),
            session_id String,
            user_id String,
            start_time DateTime,
            end_time DateTime,
            duration UInt32,
            page_count UInt16,
            initial_referrer String,
            initial_user_agent String,
            ip_address String,
            timestamp DateTime DEFAULT now(),
            date Date DEFAULT toDate(timestamp)
          ) ENGINE = MergeTree()
          PARTITION BY date
          ORDER BY (session_id, timestamp)
        `
      });

      // Create custom events table
      await this.client.exec({
        query: `
          CREATE TABLE IF NOT EXISTS lugx_analytics.custom_events_stream (
            id UUID DEFAULT generateUUIDv4(),
            user_id String,
            session_id String,
            page_url String,
            event_type String,
            event_name String,
            properties String,
            timestamp DateTime DEFAULT now(),
            date Date DEFAULT toDate(timestamp)
          ) ENGINE = MergeTree()
          PARTITION BY date
          ORDER BY (session_id, timestamp)
        `
      });

      this.logWithIST('✅ ClickHouse analytics database and tables initialized successfully');
    } catch (error) {
      this.logWithIST(`❌ Error initializing ClickHouse database: ${error.message}`, true);
      this.isConnected = false;
    }
  }

  // Insert methods for real-time streaming
  async insertPageView(data) {
    if (this.debugMode) {
      this.logWithIST(`🔍 DEBUG: Received page view data: ${JSON.stringify(data, null, 2)}`);
    }

    if (!this.isConnected) {
      this.logWithIST('⚠️  ClickHouse not connected, skipping page view insert');
      return;
    }

    try {
      await this.client.insert({
        table: 'lugx_analytics.page_views_stream',
        values: [{
          user_id: data.userId || 'anonymous',
          session_id: data.sessionId,
          page_url: data.pageUrl,
          page_title: data.pageTitle || '',
          referrer: data.referrer || '',
          user_agent: data.userAgent || '',
          ip_address: data.ipAddress || '',
          time_on_page: data.timeOnPage || 0,
          viewport_width: data.viewport?.width || 0,
          viewport_height: data.viewport?.height || 0,
          device: data.device || 'unknown'
        }],
        format: 'JSONEachRow'
      });
      
      if (this.debugMode) {
        this.logWithIST('✅ Page view inserted successfully');
      }
    } catch (error) {
      this.logWithIST(`❌ Error inserting page view to ClickHouse: ${error.message}`, true);
    }
  }

  async insertClickEvent(data) {
    if (this.debugMode) {
      this.logWithIST(`🔍 DEBUG: Received click event data: ${JSON.stringify(data, null, 2)}`);
    }

    if (!this.isConnected) {
      this.logWithIST('⚠️  ClickHouse not connected, skipping click event insert');
      return;
    }

    try {
      await this.client.insert({
        table: 'lugx_analytics.click_events_stream',
        values: [{
          user_id: data.userId || 'anonymous',
          session_id: data.sessionId,
          page_url: data.pageUrl,
          element_type: data.elementType,
          element_text: data.elementText || '',
          element_id: data.elementId || '',
          element_class: data.elementClass || '',
          click_x: data.clickPosition?.x || 0,
          click_y: data.clickPosition?.y || 0
        }],
        format: 'JSONEachRow'
      });

      if (this.debugMode) {
        this.logWithIST('✅ Click event inserted successfully');
      }
    } catch (error) {
      this.logWithIST(`❌ Error inserting click event to ClickHouse: ${error.message}`, true);
    }
  }

  async insertScrollDepth(data) {
    if (this.debugMode) {
      this.logWithIST(`🔍 DEBUG: Received scroll depth data: ${JSON.stringify(data, null, 2)}`);
    }

    if (!this.isConnected) {
      this.logWithIST('⚠️  ClickHouse not connected, skipping scroll depth insert');
      return;
    }

    try {
      await this.client.insert({
        table: 'lugx_analytics.scroll_depth_stream',
        values: [{
          user_id: data.userId || 'anonymous',
          session_id: data.sessionId,
          page_url: data.pageUrl,
          max_scroll_depth: data.maxScrollDepth,
          scroll_milestones: JSON.stringify(data.scrollMilestones || []),
          page_height: data.pageHeight || 0,
          viewport_height: data.viewportHeight || 0,
          time_to_max_scroll: data.timeToMaxScroll || 0
        }],
        format: 'JSONEachRow'
      });

      if (this.debugMode) {
        this.logWithIST('✅ Scroll depth inserted successfully');
      }
    } catch (error) {
      this.logWithIST(`❌ Error inserting scroll depth to ClickHouse: ${error.message}`, true);
    }
  }

  async insertSession(data) {
    if (this.debugMode) {
      this.logWithIST(`🔍 DEBUG: Received session data: ${JSON.stringify(data, null, 2)}`);
    }

    if (!this.isConnected) {
      this.logWithIST('⚠️  ClickHouse not connected, skipping session insert');
      return;
    }

    try {
      await this.client.insert({
        table: 'lugx_analytics.sessions_stream',
        values: [{
          session_id: data.sessionId,
          user_id: data.userId || 'anonymous',
          start_time: data.startTime,
          end_time: data.endTime || null,
          duration: data.duration || 0,
          page_count: data.pageCount || 1,
          initial_referrer: data.initialReferrer || '',
          initial_user_agent: data.initialUserAgent || '',
          ip_address: data.ipAddress || ''
        }],
        format: 'JSONEachRow'
      });

      if (this.debugMode) {
        this.logWithIST('✅ Session inserted successfully');
      }
    } catch (error) {
      this.logWithIST(`❌ Error inserting session to ClickHouse: ${error.message}`, true);
    }
  }

  async insertCustomEvent(data) {
    if (this.debugMode) {
      this.logWithIST(`🔍 DEBUG: Received custom event data: ${JSON.stringify(data, null, 2)}`);
    }

    if (!this.isConnected) {
      this.logWithIST('⚠️  ClickHouse not connected, skipping custom event insert');
      return;
    }

    try {
      await this.client.insert({
        table: 'lugx_analytics.custom_events_stream',
        values: [{
          user_id: data.userId || 'anonymous',
          session_id: data.sessionId,
          page_url: data.pageUrl,
          event_type: data.eventType || 'custom',
          event_name: data.eventName,
          properties: JSON.stringify(data.properties || {})
        }],
        format: 'JSONEachRow'
      });

      if (this.debugMode) {
        this.logWithIST('✅ Custom event inserted successfully');
      }
    } catch (error) {
      this.logWithIST(`❌ Error inserting custom event to ClickHouse: ${error.message}`, true);
    }
  }

  // Analytics queries for real-time insights
  async getRealtimePageViews(minutes = 30) {
    try {
      if (!this.isConnected) {
        this.logWithIST('⚠️  ClickHouse not connected, returning empty page views');
        return [];
      }

      const result = await this.client.query({
        query: `
          SELECT 
            page_url,
            count() as views,
            uniq(user_id) as unique_users,
            avg(time_on_page) as avg_time_on_page
          FROM lugx_analytics.page_views_stream 
          WHERE timestamp >= now() - INTERVAL ${minutes} MINUTE
          GROUP BY page_url
          ORDER BY views DESC
          LIMIT 20
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      this.logWithIST(`❌ Error fetching realtime page views: ${error.message}`, true);
      return [];
    }
  }

  async getRealtimeClickHeatmap(pageUrl, minutes = 30) {
    try {
      if (!this.isConnected) {
        this.logWithIST('⚠️  ClickHouse not connected, returning empty click heatmap');
        return [];
      }

      const result = await this.client.query({
        query: `
          SELECT 
            click_x,
            click_y,
            count() as click_count,
            element_type,
            element_text
          FROM lugx_analytics.click_events_stream 
          WHERE page_url = '${pageUrl}' 
          AND timestamp >= now() - INTERVAL ${minutes} MINUTE
          GROUP BY click_x, click_y, element_type, element_text
          ORDER BY click_count DESC
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      this.logWithIST(`❌ Error fetching click heatmap: ${error.message}`, true);
      return [];
    }
  }

  async getScrollAnalytics(pageUrl, minutes = 30) {
    try {
      if (!this.isConnected) {
        this.logWithIST('⚠️  ClickHouse not connected, returning empty scroll analytics');
        return [];
      }

      const result = await this.client.query({
        query: `
          SELECT 
            avg(max_scroll_depth) as avg_scroll_depth,
            count() as total_sessions,
            countIf(max_scroll_depth >= 25) as reached_25_percent,
            countIf(max_scroll_depth >= 50) as reached_50_percent,
            countIf(max_scroll_depth >= 75) as reached_75_percent,
            countIf(max_scroll_depth >= 100) as reached_100_percent
          FROM lugx_analytics.scroll_depth_stream 
          WHERE page_url = '${pageUrl}' 
          AND timestamp >= now() - INTERVAL ${minutes} MINUTE
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      this.logWithIST(`❌ Error fetching scroll analytics: ${error.message}`, true);
      return [];
    }
  }

  // Dashboard data aggregation
  async getDashboardData(hours = 24) {
    try {
      if (!this.isConnected) {
        this.logWithIST('⚠️  ClickHouse not connected, returning empty dashboard data');
        return null;
      }

      const [pageViews, sessions, topPages, deviceBreakdown] = await Promise.all([
        this.getTotalPageViews(hours),
        this.getTotalSessions(hours),
        this.getTopPages(hours),
        this.getDeviceBreakdown(hours)
      ]);

      return {
        summary: {
          totalPageViews: pageViews,
          totalSessions: sessions,
          timeRange: `${hours} hours`
        },
        topPages,
        deviceBreakdown
      };
    } catch (error) {
      this.logWithIST(`❌ Error fetching dashboard data: ${error.message}`, true);
      return null;
    }
  }

  async getTotalPageViews(hours) {
    try {
      if (!this.isConnected) return 0;
      
      const result = await this.client.query({
        query: `
          SELECT COUNT(*) as count
          FROM lugx_analytics.page_views_stream 
          WHERE timestamp >= now() - INTERVAL ${hours} HOUR
        `,
        format: 'JSONEachRow'
      });
      
      const data = await result.json();
      return data[0]?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  async getTotalSessions(hours) {
    try {
      if (!this.isConnected) return 0;
      
      const result = await this.client.query({
        query: `
          SELECT COUNT(DISTINCT session_id) as count
          FROM lugx_analytics.page_views_stream 
          WHERE timestamp >= now() - INTERVAL ${hours} HOUR
        `,
        format: 'JSONEachRow'
      });
      
      const data = await result.json();
      return data[0]?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  async getTopPages(hours) {
    try {
      if (!this.isConnected) return [];
      
      const result = await this.client.query({
        query: `
          SELECT 
            page_url,
            page_title,
            COUNT(*) as views,
            COUNT(DISTINCT user_id) as unique_users
          FROM lugx_analytics.page_views_stream 
          WHERE timestamp >= now() - INTERVAL ${hours} HOUR
          GROUP BY page_url, page_title
          ORDER BY views DESC
          LIMIT 10
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      return [];
    }
  }

  async getDeviceBreakdown(hours) {
    try {
      if (!this.isConnected) return [];
      
      const result = await this.client.query({
        query: `
          SELECT 
            device,
            COUNT(*) as count,
            COUNT(DISTINCT user_id) as unique_users
          FROM lugx_analytics.page_views_stream 
          WHERE timestamp >= now() - INTERVAL ${hours} HOUR
          GROUP BY device
          ORDER BY count DESC
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      return [];
    }
  }

  // Get data for MySQL synchronization
  async getDataForMySQLSync(table, lastSyncTime) {
    try {
      if (!this.isConnected) return [];
      
      const result = await this.client.query({
        query: `
          SELECT * FROM lugx_analytics.${table}
          WHERE timestamp > '${lastSyncTime}'
          ORDER BY timestamp
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      this.logWithIST(`❌ Error fetching data for MySQL sync: ${error.message}`, true);
      return [];
    }
  }
}

module.exports = new ClickHouseService();
