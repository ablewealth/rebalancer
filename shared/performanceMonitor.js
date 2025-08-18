/**
 * Performance Monitoring and Baseline Metrics
 * 
 * Provides comprehensive performance tracking for tax harvesting calculations
 * 
 * @version 1.0.0
 */

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      enableDetailedMetrics: config.enableDetailedMetrics !== false,
      sampleSize: config.sampleSize || 100,
      alertThresholds: {
        calculationTime: config.alertThresholds?.calculationTime || 5000, // 5 seconds
        memoryUsage: config.alertThresholds?.memoryUsage || 100 * 1024 * 1024, // 100MB
        accuracyThreshold: config.alertThresholds?.accuracyThreshold || 85 // 85%
      }
    };
    
    this.metrics = {
      calculations: [],
      baselines: {},
      alerts: []
    };
    
    this.startTime = Date.now();
  }

  /**
   * Start performance measurement for a calculation
   */
  startMeasurement(calculationId, metadata = {}) {
    const measurement = {
      id: calculationId,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      metadata,
      timestamp: new Date().toISOString()
    };
    
    return measurement;
  }

  /**
   * End performance measurement and record results
   */
  endMeasurement(measurement, result = {}) {
    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    const metrics = {
      ...measurement,
      endTime,
      duration: endTime - measurement.startTime,
      endMemory,
      memoryDelta: endMemory - measurement.startMemory,
      result: {
        success: result.success || false,
        recommendationsCount: result.recommendations?.length || 0,
        positionsAnalyzed: result.metadata?.positionsAnalyzed || 0,
        accuracy: result.summary?.accuracy || {}
      }
    };
    
    this.metrics.calculations.push(metrics);
    this.checkAlerts(metrics);
    
    // Keep only recent measurements to prevent memory bloat
    if (this.metrics.calculations.length > this.config.sampleSize) {
      this.metrics.calculations = this.metrics.calculations.slice(-this.config.sampleSize);
    }
    
    return metrics;
  }

  /**
   * Get current memory usage (Node.js specific, fallback for browser)
   */
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    
    // Browser fallback - estimate based on performance
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize || 0;
    }
    
    return 0;
  }

  /**
   * Check for performance alerts
   */
  checkAlerts(metrics) {
    const alerts = [];
    
    // Check calculation time
    if (metrics.duration > this.config.alertThresholds.calculationTime) {
      alerts.push({
        type: 'SLOW_CALCULATION',
        severity: 'WARNING',
        message: `Calculation took ${metrics.duration.toFixed(2)}ms (threshold: ${this.config.alertThresholds.calculationTime}ms)`,
        calculationId: metrics.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check memory usage
    if (metrics.memoryDelta > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'WARNING',
        message: `Memory usage increased by ${(metrics.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        calculationId: metrics.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check accuracy
    const avgAccuracy = (metrics.result.accuracy.stAccuracy + metrics.result.accuracy.ltAccuracy) / 2;
    if (avgAccuracy < this.config.alertThresholds.accuracyThreshold) {
      alerts.push({
        type: 'LOW_ACCURACY',
        severity: 'ERROR',
        message: `Low calculation accuracy: ${avgAccuracy.toFixed(1)}% (threshold: ${this.config.alertThresholds.accuracyThreshold}%)`,
        calculationId: metrics.id,
        timestamp: new Date().toISOString()
      });
    }
    
    this.metrics.alerts.push(...alerts);
    return alerts;
  }

  /**
   * Calculate baseline performance metrics
   */
  calculateBaselines() {
    if (this.metrics.calculations.length < 10) {
      return { error: 'Insufficient data for baseline calculation (minimum 10 samples required)' };
    }
    
    const calculations = this.metrics.calculations;
    const durations = calculations.map(c => c.duration);
    const memoryDeltas = calculations.map(c => c.memoryDelta);
    const accuracies = calculations.map(c => {
      const acc = c.result.accuracy;
      return (acc.stAccuracy + acc.ltAccuracy) / 2;
    });
    
    this.metrics.baselines = {
      calculationTime: {
        mean: this.calculateMean(durations),
        median: this.calculateMedian(durations),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
        min: Math.min(...durations),
        max: Math.max(...durations)
      },
      memoryUsage: {
        mean: this.calculateMean(memoryDeltas),
        median: this.calculateMedian(memoryDeltas),
        p95: this.calculatePercentile(memoryDeltas, 95),
        max: Math.max(...memoryDeltas)
      },
      accuracy: {
        mean: this.calculateMean(accuracies),
        median: this.calculateMedian(accuracies),
        min: Math.min(...accuracies)
      },
      throughput: {
        calculationsPerSecond: calculations.length / ((Date.now() - this.startTime) / 1000),
        avgPositionsPerSecond: this.calculateMean(calculations.map(c => 
          c.result.positionsAnalyzed / (c.duration / 1000)
        ))
      },
      lastUpdated: new Date().toISOString(),
      sampleSize: calculations.length
    };
    
    return this.metrics.baselines;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const baselines = this.calculateBaselines();
    const recentAlerts = this.metrics.alerts.slice(-10);
    const recentCalculations = this.metrics.calculations.slice(-5);
    
    return {
      summary: {
        totalCalculations: this.metrics.calculations.length,
        totalAlerts: this.metrics.alerts.length,
        uptime: Date.now() - this.startTime,
        lastCalculation: recentCalculations[recentCalculations.length - 1]?.timestamp
      },
      baselines,
      recentAlerts,
      recentCalculations: recentCalculations.map(c => ({
        id: c.id,
        duration: c.duration,
        memoryDelta: c.memoryDelta,
        positionsAnalyzed: c.result.positionsAnalyzed,
        recommendationsCount: c.result.recommendationsCount,
        timestamp: c.timestamp
      })),
      recommendations: this.generatePerformanceRecommendations()
    };
  }

  /**
   * Generate performance improvement recommendations
   */
  generatePerformanceRecommendations() {
    const recommendations = [];
    const baselines = this.metrics.baselines;
    
    if (!baselines.calculationTime) return recommendations;
    
    // Slow calculations
    if (baselines.calculationTime.p95 > 2000) {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'HIGH',
        message: 'Consider algorithm optimization - 95th percentile calculation time exceeds 2 seconds',
        suggestion: 'Implement caching or optimize position selection algorithm'
      });
    }
    
    // High memory usage
    if (baselines.memoryUsage.p95 > 50 * 1024 * 1024) {
      recommendations.push({
        type: 'MEMORY',
        priority: 'MEDIUM',
        message: 'High memory usage detected',
        suggestion: 'Implement data streaming or pagination for large portfolios'
      });
    }
    
    // Low accuracy
    if (baselines.accuracy.mean < 90) {
      recommendations.push({
        type: 'ACCURACY',
        priority: 'HIGH',
        message: 'Algorithm accuracy below optimal threshold',
        suggestion: 'Review target selection logic and precision parameters'
      });
    }
    
    // Low throughput
    if (baselines.throughput.calculationsPerSecond < 0.1) {
      recommendations.push({
        type: 'THROUGHPUT',
        priority: 'MEDIUM',
        message: 'Low calculation throughput detected',
        suggestion: 'Consider parallel processing or algorithm optimization'
      });
    }
    
    return recommendations;
  }

  /**
   * Benchmark against portfolio sizes
   */
  benchmarkPortfolioSizes() {
    const sizes = [10, 50, 100, 500, 1000];
    const benchmarks = {};
    
    for (const size of sizes) {
      const relevantCalcs = this.metrics.calculations.filter(c => 
        c.result.positionsAnalyzed >= size * 0.8 && c.result.positionsAnalyzed <= size * 1.2
      );
      
      if (relevantCalcs.length > 0) {
        const durations = relevantCalcs.map(c => c.duration);
        benchmarks[size] = {
          samples: relevantCalcs.length,
          avgDuration: this.calculateMean(durations),
          medianDuration: this.calculateMedian(durations),
          maxDuration: Math.max(...durations)
        };
      }
    }
    
    return benchmarks;
  }

  // Statistical utility functions
  calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics() {
    return {
      version: '1.0.0',
      exportTime: new Date().toISOString(),
      config: this.config,
      metrics: this.metrics,
      baselines: this.metrics.baselines
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      calculations: [],
      baselines: {},
      alerts: []
    };
    this.startTime = Date.now();
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceMonitor };
} else if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}
