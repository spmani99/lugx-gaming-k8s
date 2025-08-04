#!/bin/bash
# 📊 Lugx Gaming Test Report Generator

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="test-results"
OUTPUT_FILE="$REPORT_DIR/test-report-$TIMESTAMP.html"

echo "📊 Generating Lugx Gaming Test Report"
echo "====================================="
echo "⏰ Timestamp: $TIMESTAMP"
echo "📁 Output: $OUTPUT_FILE"

# Create report directory
mkdir -p $REPORT_DIR

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Generate HTML report
cat > $OUTPUT_FILE << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Lugx Gaming - Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            opacity: 0.9;
            font-size: 1.2em;
        }
        
        .content {
            padding: 30px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            border-left: 5px solid #667eea;
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        
        .section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
        }
        
        .section h2 {
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .test-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .test-table th,
        .test-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        .test-table th {
            background: #667eea;
            color: white;
        }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .badge-pass {
            background: #d4edda;
            color: #155724;
        }
        
        .badge-fail {
            background: #f8d7da;
            color: #721c24;
        }
        
        .badge-warn {
            background: #fff3cd;
            color: #856404;
        }
        
        .health-score {
            text-align: center;
            margin: 30px 0;
        }
        
        .health-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 2em;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
        }
        
        .chart-container {
            text-align: center;
            margin: 20px 0;
        }
        
        .footer {
            background: #343a40;
            color: white;
            text-align: center;
            padding: 20px;
        }
        
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Lugx Gaming</h1>
            <div class="subtitle">Automated Test Report</div>
            <div style="margin-top: 10px; opacity: 0.8;">
EOF

# Add timestamp to HTML
echo "                Generated: $(date)" >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'EOF'
            </div>
        </div>
        
        <div class="content">
            <!-- System Overview -->
            <div class="section">
                <h2>📊 System Overview</h2>
                <div class="metrics-grid">
EOF

# Get system metrics and add to HTML
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Read results from CSV files if they exist
if [ -f "$REPORT_DIR/results.csv" ]; then
    PASSED_TESTS=$(grep -c "PASS," "$REPORT_DIR/results.csv" 2>/dev/null || echo 0)
    FAILED_TESTS=$(grep -c "FAIL," "$REPORT_DIR/results.csv" 2>/dev/null || echo 0)
    TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))
fi

if [ -f "$REPORT_DIR/periodic/periodic_results.csv" ]; then
    PERIODIC_PASSED=$(grep -c "PASS," "$REPORT_DIR/periodic/periodic_results.csv" 2>/dev/null || echo 0)
    PERIODIC_FAILED=$(grep -c "FAIL," "$REPORT_DIR/periodic/periodic_results.csv" 2>/dev/null || echo 0)
    WARNINGS=$(grep -c "WARN," "$REPORT_DIR/periodic/periodic_results.csv" 2>/dev/null || echo 0)
    
    PASSED_TESTS=$((PASSED_TESTS + PERIODIC_PASSED))
    FAILED_TESTS=$((FAILED_TESTS + PERIODIC_FAILED))
    TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS + WARNINGS))
fi

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0.0")
else
    SUCCESS_RATE="0.0"
fi

# Add metrics to HTML
cat >> $OUTPUT_FILE << EOF
                    <div class="metric-card">
                        <div class="metric-value success">$PASSED_TESTS</div>
                        <div class="metric-label">Tests Passed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value error">$FAILED_TESTS</div>
                        <div class="metric-label">Tests Failed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value warning">$WARNINGS</div>
                        <div class="metric-label">Warnings</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">$SUCCESS_RATE%</div>
                        <div class="metric-label">Success Rate</div>
                    </div>
EOF

cat >> $OUTPUT_FILE << 'EOF'
                </div>
                
                <!-- Health Score -->
                <div class="health-score">
EOF

# Determine health score color
if (( $(echo "$SUCCESS_RATE >= 90" | bc -l 2>/dev/null || echo 0) )); then
    HEALTH_COLOR="#28a745"
    HEALTH_STATUS="Excellent"
elif (( $(echo "$SUCCESS_RATE >= 70" | bc -l 2>/dev/null || echo 0) )); then
    HEALTH_COLOR="#ffc107"
    HEALTH_STATUS="Good"
else
    HEALTH_COLOR="#dc3545"
    HEALTH_STATUS="Needs Attention"
fi

cat >> $OUTPUT_FILE << EOF
                    <div class="health-circle" style="background: $HEALTH_COLOR;">
                        $SUCCESS_RATE%
                    </div>
                    <div style="font-size: 1.2em; font-weight: bold;">System Health: $HEALTH_STATUS</div>
EOF

cat >> $OUTPUT_FILE << 'EOF'
                </div>
            </div>
            
            <!-- Test Results -->
            <div class="section">
                <h2>🧪 Test Results Details</h2>
EOF

# Add test results table
if [ -f "$REPORT_DIR/results.csv" ] || [ -f "$REPORT_DIR/periodic/periodic_results.csv" ]; then
    cat >> $OUTPUT_FILE << 'EOF'
                <table class="test-table">
                    <thead>
                        <tr>
                            <th>Test Name</th>
                            <th>Status</th>
                            <th>Timestamp</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
EOF

    # Process regular test results
    if [ -f "$REPORT_DIR/results.csv" ]; then
        while IFS=',' read -r status test_name timestamp message; do
            case $status in
                "PASS") badge_class="badge-pass" ;;
                "FAIL") badge_class="badge-fail" ;;
                "WARN") badge_class="badge-warn" ;;
                *) badge_class="badge-warn" ;;
            esac
            
            cat >> $OUTPUT_FILE << EOF
                        <tr>
                            <td>$test_name</td>
                            <td><span class="status-badge $badge_class">$status</span></td>
                            <td>$timestamp</td>
                            <td>${message:-"N/A"}</td>
                        </tr>
EOF
        done < "$REPORT_DIR/results.csv"
    fi
    
    # Process periodic test results
    if [ -f "$REPORT_DIR/periodic/periodic_results.csv" ]; then
        while IFS=',' read -r timestamp status test_name message; do
            case $status in
                "PASS") badge_class="badge-pass" ;;
                "FAIL") badge_class="badge-fail" ;;
                "WARN") badge_class="badge-warn" ;;
                *) badge_class="badge-warn" ;;
            esac
            
            cat >> $OUTPUT_FILE << EOF
                        <tr>
                            <td>$test_name (Periodic)</td>
                            <td><span class="status-badge $badge_class">$status</span></td>
                            <td>$timestamp</td>
                            <td>${message:-"N/A"}</td>
                        </tr>
EOF
        done < "$REPORT_DIR/periodic/periodic_results.csv"
    fi
    
    cat >> $OUTPUT_FILE << 'EOF'
                    </tbody>
                </table>
EOF
else
    cat >> $OUTPUT_FILE << 'EOF'
                <p>No test results available. Run the integration tests to generate results.</p>
EOF
fi

# Add service status section
cat >> $OUTPUT_FILE << 'EOF'
            </div>
            
            <!-- Service Status -->
            <div class="section">
                <h2>🎮 Service Status</h2>
                <div class="metrics-grid">
EOF

# Get current service status
SERVICES=("frontend" "game-service" "order-service" "analytics-service")

for service in "${SERVICES[@]}"; do
    deployment="${service}-deployment"
    if [ "$service" = "frontend" ]; then
        deployment="frontend"
    fi
    
    # Get pod status
    ready_pods=$(kubectl get deployment $deployment -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    desired_pods=$(kubectl get deployment $deployment -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
    
    if [ "$ready_pods" = "$desired_pods" ] && [ "$ready_pods" != "0" ]; then
        status_color="success"
        status_text="Healthy"
    else
        status_color="error"
        status_text="Unhealthy"
    fi
    
    cat >> $OUTPUT_FILE << EOF
                    <div class="metric-card">
                        <div class="metric-value $status_color">$ready_pods/$desired_pods</div>
                        <div class="metric-label">$service</div>
                        <div style="font-size: 0.8em; margin-top: 5px;" class="$status_color">$status_text</div>
                    </div>
EOF
done

cat >> $OUTPUT_FILE << 'EOF'
                </div>
            </div>
            
            <!-- Recommendations -->
            <div class="section">
                <h2>💡 Recommendations</h2>
EOF

# Generate recommendations based on test results
if [ $FAILED_TESTS -gt 0 ]; then
    cat >> $OUTPUT_FILE << 'EOF'
                <ul>
                    <li><strong>🔴 Critical:</strong> Address failed tests immediately to restore system stability</li>
                    <li><strong>📊 Monitor:</strong> Check service logs for detailed error information</li>
                    <li><strong>🔄 Recovery:</strong> Consider rollback if issues persist</li>
                </ul>
EOF
elif [ $WARNINGS -gt 0 ]; then
    cat >> $OUTPUT_FILE << 'EOF'
                <ul>
                    <li><strong>🟡 Attention:</strong> Review warning conditions for potential improvements</li>
                    <li><strong>⚡ Performance:</strong> Optimize services showing performance warnings</li>
                    <li><strong>📈 Scale:</strong> Consider scaling resources if needed</li>
                </ul>
EOF
else
    cat >> $OUTPUT_FILE << 'EOF'
                <ul>
                    <li><strong>🟢 Excellent:</strong> All systems are functioning optimally</li>
                    <li><strong>🔄 Maintain:</strong> Continue regular monitoring and maintenance</li>
                    <li><strong>📋 Plan:</strong> Schedule next maintenance window</li>
                </ul>
EOF
fi

cat >> $OUTPUT_FILE << 'EOF'
            </div>
        </div>
        
        <div class="footer">
            <p>🎮 Lugx Gaming Platform - Automated CI/CD Pipeline</p>
            <p style="margin-top: 5px; opacity: 0.8;">Generated by GitHub Actions</p>
        </div>
    </div>
</body>
</html>
EOF

# Generate JSON summary for API consumption
cat > $REPORT_DIR/summary.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "system_health": {
    "score": $SUCCESS_RATE,
    "status": "$HEALTH_STATUS",
    "total_tests": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "warnings": $WARNINGS
  },
  "services": {
EOF

# Add service status to JSON
first_service=true
for service in "${SERVICES[@]}"; do
    deployment="${service}-deployment"
    if [ "$service" = "frontend" ]; then
        deployment="frontend"
    fi
    
    ready_pods=$(kubectl get deployment $deployment -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    desired_pods=$(kubectl get deployment $deployment -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
    
    if [ "$ready_pods" = "$desired_pods" ] && [ "$ready_pods" != "0" ]; then
        status="healthy"
    else
        status="unhealthy"
    fi
    
    if [ "$first_service" = false ]; then
        echo "," >> $REPORT_DIR/summary.json
    fi
    first_service=false
    
    cat >> $REPORT_DIR/summary.json << EOF
    "$service": {
      "status": "$status",
      "ready_pods": $ready_pods,
      "desired_pods": $desired_pods
    }
EOF
done

cat >> $REPORT_DIR/summary.json << 'EOF'
  },
  "report_files": {
    "html": "test-report-TIMESTAMP.html",
    "json": "summary.json"
  }
}
EOF

# Replace TIMESTAMP placeholder
sed -i "s/TIMESTAMP/$TIMESTAMP/g" $REPORT_DIR/summary.json

echo -e "${GREEN}✅ Test report generated successfully!${NC}"
echo -e "${BLUE}📄 HTML Report: $OUTPUT_FILE${NC}"
echo -e "${BLUE}📊 JSON Summary: $REPORT_DIR/summary.json${NC}"

# If running in GitHub Actions, set output
if [ -n "$GITHUB_ACTIONS" ]; then
    echo "report_file=$OUTPUT_FILE" >> $GITHUB_OUTPUT
    echo "summary_file=$REPORT_DIR/summary.json" >> $GITHUB_OUTPUT
    echo "health_score=$SUCCESS_RATE" >> $GITHUB_OUTPUT
    echo "health_status=$HEALTH_STATUS" >> $GITHUB_OUTPUT
fi