import React, { useState, useEffect } from 'react';
import analyticsService from '../services/analyticsService';
import { usePageTitle } from '../hooks/usePageTitle';

const Analytics = () => {
  usePageTitle('LUGX Gaming - Analytics Page');
  const [dashboardData, setDashboardData] = useState(null);
  const [realtimeData, setRealtimeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    fetchDashboardData();
    fetchRealtimeData();

    // Set up auto-refresh for realtime data
    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboardData(timeRange);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const data = await analyticsService.getRealtimePageViews(30);
      setRealtimeData(data);
    } catch (error) {
      console.error('Error fetching realtime data:', error);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Analytics Dashboard</h1>
          
          {/* Time Range Selector */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Time Range</h5>
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn ${timeRange === 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setTimeRange(1)}
                >
                  Last Hour
                </button>
                <button
                  type="button"
                  className={`btn ${timeRange === 24 ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setTimeRange(24)}
                >
                  Last 24 Hours
                </button>
                <button
                  type="button"
                  className={`btn ${timeRange === 168 ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setTimeRange(168)}
                >
                  Last Week
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {dashboardData?.summary && (
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-primary">Page Views</h5>
                    <h2 className="card-text">{dashboardData.summary.pageViews.toLocaleString()}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-success">Unique Sessions</h5>
                    <h2 className="card-text">{dashboardData.summary.uniqueSessions.toLocaleString()}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-warning">Clicks</h5>
                    <h2 className="card-text">{dashboardData.summary.clicks.toLocaleString()}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-info">Scroll Events</h5>
                    <h2 className="card-text">{dashboardData.summary.scrollEvents.toLocaleString()}</h2>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Page Views */}
          <div className="row">
            <div className="col-md-8 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Real-time Page Views (Last 30 minutes)</h5>
                  {realtimeData.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Page URL</th>
                            <th>Views</th>
                            <th>Unique Users</th>
                            <th>Avg Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {realtimeData.map((page, index) => (
                            <tr key={index}>
                              <td>{page.page_url}</td>
                              <td>{page.views}</td>
                              <td>{page.unique_users}</td>
                              <td>{Math.round(page.avg_time_on_page || 0)}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>No real-time data available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Top Pages</h5>
                  {dashboardData?.realtimePages && dashboardData.realtimePages.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {dashboardData.realtimePages.slice(0, 5).map((page, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted d-block">{page.page_url}</small>
                          </div>
                          <span className="badge bg-primary rounded-pill">{page.views}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Tools */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Analytics Tools</h5>
                  <p className="card-text">
                    This dashboard shows real-time analytics data captured by ClickHouse and stored in MySQL.
                    The system tracks:
                  </p>
                  <ul>
                    <li><strong>Page Views:</strong> Every page visit with time on page tracking</li>
                    <li><strong>Click Events:</strong> All user clicks with element details and positioning</li>
                    <li><strong>Scroll Depth:</strong> How far users scroll on each page</li>
                    <li><strong>Session Data:</strong> User session duration and behavior patterns</li>
                  </ul>
                  
                  <div className="mt-3">
                    <h6>Current Session Info:</h6>
                    <small className="text-muted">
                      Session ID: {analyticsService.sessionId}<br/>
                      User ID: {analyticsService.userId}<br/>
                      Device: {analyticsService.getDeviceInfo().device}<br/>
                      Viewport: {analyticsService.getDeviceInfo().viewport.width}x{analyticsService.getDeviceInfo().viewport.height}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;