// analytics-service/s3ExportDemo.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const clickHouse = require('./clickhouse');

class DemoS3ExportService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    this.bucketName = process.env.S3_BUCKET_NAME || 'lugx-analytics-demo';
    this.uploadInterval = parseInt(process.env.UPLOAD_INTERVAL_MINUTES) || 10;
    
    // IMPORTANT: Initialize lastUploadTime properly for UTC comparison
    this.lastUploadTime = new Date(); // This will be in UTC when converted to ISO string
    
    console.log(`🚀 Demo S3 Export: Uploading every ${this.uploadInterval} minutes to ${this.bucketName}`);
    console.log(`🕒 Initial lastUploadTime (UTC): ${this.lastUploadTime.toISOString()}`);
    console.log(`🕒 Initial lastUploadTime (IST): ${this.lastUploadTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    // Test S3 connection after a short delay (to let the service start)
    setTimeout(() => this.testS3Connection(), 5000);
    
    this.startScheduledUploads();
  }

  async testS3Connection() {
    try {
      console.log('🧪 Testing S3 connection and credentials...');
      
      const { ListBucketsCommand } = require('@aws-sdk/client-s3');
      const command = new ListBucketsCommand({});
      const result = await this.s3Client.send(command);
      
      console.log('✅ S3 Authentication successful!');
      
      // Check if our target bucket exists
      const bucketExists = result.Buckets?.some(bucket => bucket.Name === this.bucketName);
      if (bucketExists) {
        console.log(`✅ Target bucket '${this.bucketName}' exists and accessible`);
      } else {
        console.log(`⚠️  Target bucket '${this.bucketName}' NOT found in your AWS account`);
        console.log(`📝 You may need to create it or check bucket permissions`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ S3 Connection test failed:', error.name, error.message);
      if (error.name === 'CredentialsError') {
        console.log('🔑 Check your AWS credentials');
      } else if (error.name === 'UnknownEndpoint') {
        console.log('🌍 Check your AWS region setting');
      }
      return false;
    }
  }

  startScheduledUploads() {
    // Upload aggregated data every X minutes
    setInterval(async () => {
      console.log('📊 Starting scheduled S3 upload...');
      await this.uploadRecentAnalytics();
    }, this.uploadInterval * 60 * 1000);
    
    // REDUCED initial upload time for testing - start after 30 seconds instead of 1 minute
    setTimeout(async () => {
      console.log('🎯 Initial S3 upload starting...');
      await this.uploadRecentAnalytics();
    }, 30000); // 30 seconds
  }

  async uploadRecentAnalytics() {
    try {
      const now = new Date();
      const timestamp = this.formatTimestamp(now);
      
      // Both times are in UTC - this is correct for ClickHouse
      const startTime = this.lastUploadTime;
      const endTime = now;
      
      // Debug logging
      console.log(`📤 Time window check:`);
      console.log(`  - Start (UTC): ${startTime.toISOString()}`);
      console.log(`  - End (UTC): ${endTime.toISOString()}`);
      console.log(`  - Start (IST): ${startTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`  - End (IST): ${endTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`  - Duration: ${Math.round((endTime - startTime) / 1000)} seconds`);

      // Check if we have any meaningful data before uploading
      const hasData = await this.hasMeaningfulData(startTime, endTime);
      
      if (!hasData) {
        console.log(`⏭️ Skipping upload - no meaningful data in specified time range`);
        
        // Debug: Check for any data in the last hour
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        console.log(`🔍 Checking for any data in last hour...`);
        const recentData = await this.hasMeaningfulData(oneHourAgo, now);
        console.log(`🔍 Found data in last hour: ${recentData}`);
        
        this.lastUploadTime = now;
        return { success: true, skipped: true, reason: 'no_meaningful_data' };
      }

      console.log(`✅ Found meaningful data, proceeding with upload...`);

      // Aggregate and upload all data types in parallel
      const uploads = await Promise.allSettled([
        this.uploadAggregatedPageViews(startTime, endTime, timestamp),
        this.uploadAggregatedClickEvents(startTime, endTime, timestamp),
        this.uploadAggregatedSessions(startTime, endTime, timestamp),
        this.uploadAggregatedScrollDepth(startTime, endTime, timestamp),
        this.uploadRealTimeMetrics(timestamp)
      ]);

      const successful = uploads.filter(result => result.status === 'fulfilled' && result.value !== null).length;
      
      if (successful > 0) {
        console.log(`✅ S3 Upload completed: ${successful}/${uploads.length} files uploaded`);
      } else {
        console.log(`⏭️ All uploads skipped - aggregated data was empty`);
      }

      this.lastUploadTime = now;
      return { success: true, uploads: successful, total: uploads.length, timestamp };
    } catch (error) {
      console.error('❌ Error in scheduled S3 upload:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if we have meaningful data (now includes scroll depth)
  async hasMeaningfulData(startTime, endTime) {
    try {
      // Check if we have any new records in any table
      const [pageViews, clickEvents, sessions, scrollDepth] = await Promise.all([
        this.getRecordCount('page_views_stream', startTime, endTime),
        this.getRecordCount('click_events_stream', startTime, endTime),
        this.getRecordCount('sessions_stream', startTime, endTime),
        this.getRecordCount('scroll_depth_stream', startTime, endTime)
      ]);

      return pageViews > 0 || clickEvents > 0 || sessions > 0 || scrollDepth > 0;
    } catch (error) {
      console.error('Error checking for meaningful data:', error);
      // If we can't check, err on the side of uploading
      return true;
    }
  }

  // Enhanced debugging for record count
  async getRecordCount(table, startTime, endTime) {
    try {
      if (!clickHouse.isConnected) {
        console.log(`❌ ClickHouse not connected for ${table}`);
        return 0;
      }
      
      console.log(`🔍 Querying ${table}:`);
      console.log(`    Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      
      const result = await clickHouse.client.query({
        query: `
          SELECT COUNT(*) as count
          FROM lugx_analytics.${table}
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}'
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
        `,
        format: 'JSONEachRow'
      });
      
      const data = await result.json();
      const count = parseInt(data[0]?.count || 0);
      console.log(`    Result: ${count} records`);
      
      // If no records found, let's see what's in the table
      if (count === 0) {
        try {
          const recentResult = await clickHouse.client.query({
            query: `
              SELECT COUNT(*) as total, MAX(timestamp) as latest 
              FROM lugx_analytics.${table}
            `,
            format: 'JSONEachRow'
          });
          
          const recent = await recentResult.json();
          console.log(`    🔍 Table stats: ${recent[0]?.total || 0} total records, latest: ${recent[0]?.latest || 'none'}`);
        } catch (e) {
          console.log(`    ⚠️ Could not get table stats: ${e.message}`);
        }
      }
      
      return count;
    } catch (error) {
      console.error(`❌ Error counting records in ${table}:`, error);
      return 0;
    }
  }

  async uploadAggregatedPageViews(startTime, endTime, timestamp) {
    try {
      const aggregatedData = await this.getAggregatedPageViews(startTime, endTime);
      
      if (aggregatedData.length === 0) {
        console.log('📄 No page views to upload');
        return null;
      }

      // Date-based folder structure for partitioning
      const dateFolder = this.getDateFolder(endTime);
      const fileName = `page-views/${dateFolder}/page_views_${timestamp}.json`;
      
      await this.uploadToS3(fileName, {
        dataType: 'page_views',
        timeRange: { start: startTime, end: endTime },
        recordCount: aggregatedData.length,
        data: aggregatedData
      });

      console.log(`📊 Page views uploaded: ${aggregatedData.length} records -> ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('Error uploading page views:', error);
      return null;
    }
  }

  async uploadAggregatedClickEvents(startTime, endTime, timestamp) {
    try {
      const aggregatedData = await this.getAggregatedClickEvents(startTime, endTime);
      
      if (aggregatedData.length === 0) {
        console.log('🖱️ No click events to upload');
        return null;
      }

      const dateFolder = this.getDateFolder(endTime);
      const fileName = `click-events/${dateFolder}/click_events_${timestamp}.json`;
      
      await this.uploadToS3(fileName, {
        dataType: 'click_events',
        timeRange: { start: startTime, end: endTime },
        recordCount: aggregatedData.length,
        data: aggregatedData
      });

      console.log(`🖱️ Click events uploaded: ${aggregatedData.length} records -> ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('Error uploading click events:', error);
      return null;
    }
  }

  async uploadAggregatedSessions(startTime, endTime, timestamp) {
    try {
      const sessionData = await this.getSessionSummary(startTime, endTime);
      
      if (sessionData.length === 0) {
        console.log('🔄 No session data to upload');
        return null;
      }

      const dateFolder = this.getDateFolder(endTime);
      const fileName = `sessions/${dateFolder}/sessions_${timestamp}.json`;
      
      await this.uploadToS3(fileName, {
        dataType: 'sessions',
        timeRange: { start: startTime, end: endTime },
        recordCount: sessionData.length,
        data: sessionData
      });

      console.log(`🔄 Sessions uploaded: ${sessionData.length} records -> ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('Error uploading sessions:', error);
      return null;
    }
  }

  async uploadRealTimeMetrics(timestamp) {
    try {
      const metrics = await this.getRealTimeMetrics();
      
      // Check if metrics are meaningful (not all zeros)
      if (!this.hasNonZeroMetrics(metrics)) {
        console.log('📈 All metrics are zero - skipping metrics upload');
        return null;
      }
      
      const dateFolder = this.getDateFolder(new Date());
      const fileName = `metrics/${dateFolder}/metrics_${timestamp}.json`;
      
      await this.uploadToS3(fileName, {
        dataType: 'real_time_metrics',
        recordCount: 1, // ← Add this! Metrics is always 1 record
        timestamp: new Date(),
        metrics
      });

      console.log(`📈 Real-time metrics uploaded -> ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('Error uploading real-time metrics:', error);
      return null;
    }
  }

  // Check if metrics have any non-zero values
  hasNonZeroMetrics(metrics) {
    if (!metrics || !metrics.last_hour) return false;
    
    const { page_views, click_events, active_sessions } = metrics.last_hour;
    return page_views > 0 || click_events > 0 || active_sessions > 0;
  }

  async getAggregatedPageViews(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];
      
      const result = await clickHouse.client.query({
        query: `
          SELECT 
            page_url,
            page_title,
            COUNT(*) as view_count,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT session_id) as unique_sessions,
            AVG(time_on_page) as avg_time_on_page,
            device,
            toStartOfMinute(timestamp) as time_bucket
          FROM lugx_analytics.page_views_stream
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}'
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          GROUP BY page_url, page_title, device, time_bucket
          ORDER BY time_bucket DESC, view_count DESC
        `,
        format: 'JSONEachRow'
      });
      
      const data = await result.json();
      return data || [];
    } catch (error) {
      console.error(`❌ Error getting aggregated page views:`, error);
      return [];
    }
  }

  async getAggregatedClickEvents(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];
      
      const result = await clickHouse.client.query({
        query: `
          SELECT 
            page_url,
            element_type,
            element_text,
            COUNT(*) as click_count,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT session_id) as unique_sessions,
            formatDateTime(timestamp, '%Y-%m-%d %H:%M:00') as time_bucket
          FROM lugx_analytics.click_events_stream 
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}' 
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          GROUP BY page_url, element_type, element_text, time_bucket
          ORDER BY time_bucket
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      console.error('Error getting aggregated click events:', error);
      return [];
    }
  }

  async getSessionSummary(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];
      
      const result = await clickHouse.client.query({
        query: `
          SELECT 
            user_id,
            session_id,
            start_time,
            end_time,
            duration,
            page_count,
            initial_referrer,
            formatDateTime(start_time, '%Y-%m-%d %H:00:00') as hour_bucket
          FROM lugx_analytics.sessions_stream 
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}' 
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          ORDER BY start_time
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      console.error('Error getting session summary:', error);
      return [];
    }
  }

  async getRealTimeMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [pageViews, clickEvents, activeSessions] = await Promise.all([
        this.getMetricCount('page_views_stream', oneHourAgo),
        this.getMetricCount('click_events_stream', oneHourAgo),
        this.getActiveSessionsCount(oneHourAgo)
      ]);

      return {
        last_hour: {
          page_views: pageViews,
          click_events: clickEvents,
          active_sessions: activeSessions,
          timestamp: now
        }
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {};
    }
  }

  async getMetricCount(table, since) {
    try {
      if (!clickHouse.isConnected) return 0;
      
      const result = await clickHouse.client.query({
        query: `
          SELECT COUNT(*) as count
          FROM lugx_analytics.${table}
          WHERE timestamp >= '${this.toClickHouseDateTime(since)}'
        `,
        format: 'JSONEachRow'
      });
      
      const data = await result.json();
      return parseInt(data[0]?.count || 0);
    } catch (error) {
      return 0;
    }
  }

  async getActiveSessionsCount(since) {
    try {
      if (!clickHouse.isConnected) return 0;
      
      const result = await clickHouse.client.query({
        query: `
          SELECT COUNT(DISTINCT session_id) as count
          FROM lugx_analytics.page_views_stream
          WHERE timestamp >= '${this.toClickHouseDateTime(since)}'
        `,
        format: 'JSONEachRow'
      });
      
      const data = await result.json();
      return parseInt(data[0]?.count || 0);
    } catch (error) {
      return 0;
    }
  }

  // NEW: Upload scroll depth data
  async uploadAggregatedScrollDepth(startTime, endTime, timestamp) {
    try {
      const aggregatedData = await this.getAggregatedScrollDepth(startTime, endTime);
      
      if (aggregatedData.length === 0) {
        console.log('📜 No scroll depth data to upload');
        return null;
      }

      const dateFolder = this.getDateFolder(endTime);
      const fileName = `scroll-depth/${dateFolder}/scroll_depth_${timestamp}.json`;
      
      await this.uploadToS3(fileName, {
        dataType: 'scroll_depth',
        timeRange: { start: startTime, end: endTime },
        recordCount: aggregatedData.length,
        data: aggregatedData
      });

      console.log(`📜 Scroll depth uploaded: ${aggregatedData.length} records -> ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('Error uploading scroll depth:', error);
      return null;
    }
  }

  // NEW: Get aggregated scroll depth data
  async getAggregatedScrollDepth(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];
      
      const result = await clickHouse.client.query({
        query: `
          SELECT 
            page_url,
            COUNT(*) as total_scrolls,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT session_id) as unique_sessions,
            AVG(max_scroll_depth) as avg_max_scroll_depth,
            AVG(time_to_max_scroll) as avg_time_to_max_scroll,
            AVG(page_height) as avg_page_height,
            AVG(viewport_height) as avg_viewport_height,
            countIf(max_scroll_depth >= 25) as reached_25_percent,
            countIf(max_scroll_depth >= 50) as reached_50_percent,
            countIf(max_scroll_depth >= 75) as reached_75_percent,
            countIf(max_scroll_depth >= 100) as reached_100_percent,
            formatDateTime(timestamp, '%Y-%m-%d %H:%M:00') as time_bucket
          FROM lugx_analytics.scroll_depth_stream 
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}' 
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          GROUP BY page_url, time_bucket
          ORDER BY time_bucket
        `,
        format: 'JSONEachRow'
      });
      
      return await result.json();
    } catch (error) {
      console.error('Error getting aggregated scroll depth:', error);
      return [];
    }
  }

  formatTimestamp(date) {
    return date.toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '_')
      .split('Z')[0];
  }

  // Add this helper function for ClickHouse DateTime format
  toClickHouseDateTime(date) {
    return date.toISOString()
      .replace('T', ' ')          // Replace T with space
      .replace(/\.\d{3}Z$/, '');  // Remove milliseconds and Z
    // Result: '2025-08-04 04:08:12'
  }

  async uploadToS3(fileName, data) {
    try {
      // Debug the data structure
      console.log(`🔍 S3 Upload Debug for ${fileName}:`);
      console.log(`  - dataType: ${data.dataType}`);
      console.log(`  - recordCount: ${data.recordCount} (type: ${typeof data.recordCount})`);
      
      const params = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
        Metadata: {
          dataType: data.dataType || 'unknown',
          recordCount: (data.recordCount || 0).toString(), // ← Safe fallback needed
          uploadedAt: new Date().toISOString(),
        },
      };

      const command = new PutObjectCommand(params);
      const result = await this.s3Client.send(command);
      
      console.log(`✅ S3 Upload successful: ${fileName}`);
      return result;
    } catch (error) {
      console.error(`❌ S3 Upload failed: ${fileName}`, error);
      throw error;
    }
  }

  // Manual trigger for demo purposes
  async triggerManualUpload() {
    console.log('🎯 Manual upload triggered for demo');
    return await this.uploadRecentAnalytics();
  }

  // NEW: Generate date folder for partitioning
  getDateFolder(date) {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }
}

module.exports = new DemoS3ExportService(); 