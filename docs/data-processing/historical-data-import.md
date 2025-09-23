# Historical Data Import Functionality

This document describes the historical data import functionality in QuantFlow, which allows users to import historical price data for backtesting and analysis.

## Overview

QuantFlow provides functionality to import historical price data from various sources, including:
- CSV files
- JSON data
- Exchange APIs
- Database exports

## Supported Data Formats

### CSV Format

CSV files should have the following columns:
```csv
timestamp,symbol,price,volume
2023-01-01 00:00:00,BTCUSDT,45000.00,1000.50
2023-01-01 01:00:00,BTCUSDT,45100.50,1100.75
```

### JSON Format

JSON data should be structured as an array of objects:
```json
[
  {
    "timestamp": "2023-01-01T00:00:00Z",
    "symbol": "BTCUSDT",
    "price": 45000.00,
    "volume": 1000.50
  },
  {
    "timestamp": "2023-01-01T01:00:00Z",
    "symbol": "BTCUSDT",
    "price": 45100.50,
    "volume": 1100.75
  }
]
```

## Data Import API

### Upload CSV File

```javascript
// POST /api/import/csv
app.post('/api/import/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const results = [];
    const errors = [];
    
    // Parse CSV file
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true
    });
    
    fs.createReadStream(req.file.path)
      .pipe(parser)
      .on('data', async (row) => {
        try {
          // Validate and transform data
          const data = {
            timestamp: new Date(row.timestamp),
            symbol: row.symbol.toUpperCase(),
            price: parseFloat(row.price),
            volume: parseFloat(row.volume)
          };
          
          // Store in database
          await priceTracker.storePriceData(data.symbol, data);
          results.push(data);
        } catch (error) {
          errors.push({ row, error: error.message });
        }
      })
      .on('end', () => {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          imported: results.length,
          errors: errors.length,
          details: { results, errors }
        });
      })
      .on('error', (error) => {
        res.status(500).json({ error: error.message });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Import JSON Data

```javascript
// POST /api/import/json
app.post('/api/import/json', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }
    
    const results = [];
    const errors = [];
    
    for (const row of data) {
      try {
        // Validate and transform data
        const validatedData = {
          timestamp: new Date(row.timestamp),
          symbol: row.symbol.toUpperCase(),
          price: parseFloat(row.price),
          volume: parseFloat(row.volume)
        };
        
        // Store in database
        await priceTracker.storePriceData(validatedData.symbol, validatedData);
        results.push(validatedData);
      } catch (error) {
        errors.push({ row, error: error.message });
      }
    }
    
    res.json({
      imported: results.length,
      errors: errors.length,
      details: { results, errors }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Data Validation

### Schema Validation

```javascript
class DataValidator {
  static validatePriceData(data) {
    const errors = [];
    
    // Validate timestamp
    if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) {
      errors.push('Invalid timestamp');
    }
    
    // Validate symbol
    if (!data.symbol || typeof data.symbol !== 'string') {
      errors.push('Invalid symbol');
    }
    
    // Validate price
    if (typeof data.price !== 'number' || data.price <= 0) {
      errors.push('Invalid price');
    }
    
    // Validate volume
    if (typeof data.volume !== 'number' || data.volume < 0) {
      errors.push('Invalid volume');
    }
    
    return errors;
  }
  
  static async validateSymbol(symbol) {
    // Check if symbol is supported by the exchange
    const supportedSymbols = await getSupportedSymbols();
    return supportedSymbols.includes(symbol.toUpperCase());
  }
}
```

### Data Quality Checks

```javascript
class DataQualityChecker {
  static checkDataQuality(data) {
    const issues = [];
    
    // Check for duplicates
    const timestamps = data.map(d => d.timestamp.getTime());
    const uniqueTimestamps = new Set(timestamps);
    if (uniqueTimestamps.size !== timestamps.length) {
      issues.push('Duplicate timestamps found');
    }
    
    // Check for missing values
    const missingValues = data.filter(d => 
      d.price === null || d.price === undefined || 
      d.volume === null || d.volume === undefined
    );
    if (missingValues.length > 0) {
      issues.push(`Missing values in ${missingValues.length} records`);
    }
    
    // Check for outliers
    const prices = data.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    const outliers = data.filter(d => 
      Math.abs(d.price - mean) > 3 * stdDev
    );
    if (outliers.length > 0) {
      issues.push(`Found ${outliers.length} potential outliers`);
    }
    
    return issues;
  }
}
```

## Batch Processing

### Large Dataset Import

```javascript
class BatchImporter {
  constructor(batchSize = 1000) {
    this.batchSize = batchSize;
  }
  
  async importData(data) {
    const results = {
      imported: 0,
      errors: [],
      batches: 0
    };
    
    // Process data in batches
    for (let i = 0; i < data.length; i += this.batchSize) {
      const batch = data.slice(i, i + this.batchSize);
      const batchResult = await this.importBatch(batch);
      
      results.imported += batchResult.imported;
      results.errors.push(...batchResult.errors);
      results.batches++;
      
      // Report progress
      console.log(`Processed batch ${results.batches}, imported ${batchResult.imported} records`);
    }
    
    return results;
  }
  
  async importBatch(batch) {
    const results = {
      imported: 0,
      errors: []
    };
    
    // Validate batch
    for (const row of batch) {
      const validationErrors = DataValidator.validatePriceData(row);
      if (validationErrors.length > 0) {
        results.errors.push({ row, errors: validationErrors });
        continue;
      }
    }
    
    // Import valid data
    const validData = batch.filter(row => 
      DataValidator.validatePriceData(row).length === 0
    );
    
    try {
      await priceTracker.storePriceDataBatch(validData);
      results.imported = validData.length;
    } catch (error) {
      results.errors.push({ batch, error: error.message });
    }
    
    return results;
  }
}
```

## Exchange API Integration

### Binance Historical Data

```javascript
class BinanceDataImporter {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseURL = 'https://api.binance.com';
  }
  
  async importHistoricalData(symbol, interval, startTime, endTime) {
    const endpoint = '/api/v3/klines';
    const params = {
      symbol: symbol.toUpperCase(),
      interval: interval, // 1m, 5m, 15m, 30m, 1h, 4h, 1d, etc.
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      limit: 1000 // Max limit per request
    };
    
    const results = [];
    let currentStartTime = params.startTime;
    
    while (currentStartTime < params.endTime) {
      params.startTime = currentStartTime;
      
      try {
        const response = await axios.get(this.baseURL + endpoint, { params });
        const klines = response.data;
        
        if (klines.length === 0) break;
        
        // Transform klines to our format
        const transformedData = klines.map(kline => ({
          timestamp: new Date(kline[0]),
          symbol: symbol.toUpperCase(),
          price: parseFloat(kline[4]), // Close price
          volume: parseFloat(kline[5])  // Volume
        }));
        
        // Store in database
        await priceTracker.storePriceDataBatch(transformedData);
        results.push(...transformedData);
        
        // Update start time for next request
        currentStartTime = klines[klines.length - 1][0] + 1;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error importing data:', error);
        break;
      }
    }
    
    return results;
  }
}
```

## Data Transformation

### Timezone Handling

```javascript
class TimezoneHandler {
  static convertToUTC(timestamp, sourceTimezone) {
    // Convert timestamp from source timezone to UTC
    const moment = require('moment-timezone');
    return moment.tz(timestamp, sourceTimezone).utc().toDate();
  }
  
  static convertToLocalTime(timestamp, targetTimezone) {
    // Convert UTC timestamp to target timezone
    const moment = require('moment-timezone');
    return moment.utc(timestamp).tz(targetTimezone).toDate();
  }
}
```

### Data Resampling

```javascript
class DataResampler {
  static resample(data, fromInterval, toInterval) {
    // Convert intervals to milliseconds
    const fromMs = this.intervalToMs(fromInterval);
    const toMs = this.intervalToMs(toInterval);
    
    if (toMs <= fromMs) {
      throw new Error('Target interval must be larger than source interval');
    }
    
    const resampled = [];
    const ratio = toMs / fromMs;
    
    for (let i = 0; i < data.length; i += ratio) {
      const slice = data.slice(i, i + ratio);
      
      if (slice.length === 0) continue;
      
      const open = slice[0].price;
      const high = Math.max(...slice.map(d => d.price));
      const low = Math.min(...slice.map(d => d.price));
      const close = slice[slice.length - 1].price;
      const volume = slice.reduce((sum, d) => sum + d.volume, 0);
      
      resampled.push({
        timestamp: slice[0].timestamp,
        symbol: slice[0].symbol,
        price: close,
        volume: volume,
        ohlc: { open, high, low, close }
      });
    }
    
    return resampled;
  }
  
  static intervalToMs(interval) {
    const multipliers = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    return multipliers[interval] || 60 * 60 * 1000; // Default to 1 hour
  }
}
```

## Progress Tracking

### Import Progress API

```javascript
class ImportProgressTracker {
  constructor() {
    this.progress = new Map();
  }
  
  startImport(importId, totalRecords) {
    this.progress.set(importId, {
      total: totalRecords,
      processed: 0,
      errors: 0,
      status: 'running',
      startTime: new Date()
    });
  }
  
  updateProgress(importId, processed, errors = 0) {
    const progress = this.progress.get(importId);
    if (progress) {
      progress.processed += processed;
      progress.errors += errors;
      
      if (progress.processed >= progress.total) {
        progress.status = 'completed';
        progress.endTime = new Date();
      }
    }
  }
  
  getProgress(importId) {
    return this.progress.get(importId);
  }
  
  cancelImport(importId) {
    const progress = this.progress.get(importId);
    if (progress) {
      progress.status = 'cancelled';
      progress.endTime = new Date();
    }
  }
}

const progressTracker = new ImportProgressTracker();

// GET /api/import/progress/{importId}
app.get('/api/import/progress/:importId', (req, res) => {
  const progress = progressTracker.getProgress(req.params.importId);
  if (progress) {
    res.json(progress);
  } else {
    res.status(404).json({ error: 'Import not found' });
  }
});
```

## Data Deduplication

### Handling Duplicate Records

```javascript
class DataDeduplicator {
  static async deduplicateData(symbol, startTime, endTime) {
    // Find duplicate records
    const duplicates = await priceTracker.findDuplicateRecords(symbol, startTime, endTime);
    
    // Remove duplicates, keeping the most recent record
    const removed = await priceTracker.removeDuplicateRecords(duplicates);
    
    return {
      found: duplicates.length,
      removed: removed
    };
  }
  
  static async mergeOverlappingData(newData, existingData) {
    // Merge new data with existing data, handling overlaps
    const merged = [...existingData];
    
    for (const newRecord of newData) {
      const existingIndex = merged.findIndex(record => 
        record.timestamp.getTime() === newRecord.timestamp.getTime() &&
        record.symbol === newRecord.symbol
      );
      
      if (existingIndex >= 0) {
        // Update existing record with new data
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...newRecord
        };
      } else {
        // Add new record
        merged.push(newRecord);
      }
    }
    
    // Sort by timestamp
    merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return merged;
  }
}
```

## Performance Optimization

### Parallel Processing

```javascript
class ParallelImporter {
  constructor(concurrency = 4) {
    this.concurrency = concurrency;
  }
  
  async importData(data) {
    const chunks = this.chunkArray(data, Math.ceil(data.length / this.concurrency));
    const promises = chunks.map(chunk => this.importChunk(chunk));
    
    const results = await Promise.all(promises);
    
    return {
      imported: results.reduce((sum, result) => sum + result.imported, 0),
      errors: results.reduce((errors, result) => [...errors, ...result.errors], [])
    };
  }
  
  async importChunk(chunk) {
    const importer = new BatchImporter();
    return await importer.importBatch(chunk);
  }
  
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
```

## CLI Tool for Data Import

### Command Line Interface

```javascript
//!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { importCSV, importJSON } = require('./import-utils');

const program = new Command();

program
  .name('quantflow-import')
  .description('CLI tool for importing historical data into QuantFlow')
  .version('1.0.0');

program
  .command('csv')
  .description('Import data from CSV file')
  .argument('<file>', 'CSV file path')
  .option('-s, --symbol <symbol>', 'Symbol to import data for')
  .option('-b, --batch-size <size>', 'Batch size for processing', '1000')
  .action(async (file, options) => {
    try {
      if (!fs.existsSync(file)) {
        console.error('File not found:', file);
        process.exit(1);
      }
      
      const result = await importCSV(file, {
        symbol: options.symbol,
        batchSize: parseInt(options.batchSize)
      });
      
      console.log('Import completed:');
      console.log(`  Imported: ${result.imported} records`);
      console.log(`  Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.slice(0, 5).forEach(error => {
          console.log(`  - ${error.message}`);
        });
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more errors`);
        }
      }
    } catch (error) {
      console.error('Import failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('binance')
  .description('Import data from Binance API')
  .argument('<symbol>', 'Trading pair symbol')
  .argument('<interval>', 'Time interval (1m, 5m, 15m, 30m, 1h, 4h, 1d, etc.)')
  .argument('<start>', 'Start time (YYYY-MM-DD)')
  .argument('<end>', 'End time (YYYY-MM-DD)')
  .option('-k, --api-key <key>', 'Binance API key')
  .option('-s, --api-secret <secret>', 'Binance API secret')
  .action(async (symbol, interval, start, end, options) => {
    try {
      const importer = new BinanceDataImporter(options.apiKey, options.apiSecret);
      const result = await importer.importHistoricalData(symbol, interval, start, end);
      
      console.log('Import completed:');
      console.log(`  Imported: ${result.length} records`);
    } catch (error) {
      console.error('Import failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

## Testing

### Import Functionality Tests

```javascript
describe('Historical Data Import', () => {
  describe('CSV Import', () => {
    it('should import valid CSV data', async () => {
      const csvData = `timestamp,symbol,price,volume
2023-01-01 00:00:00,BTCUSDT,45000.00,1000.50
2023-01-01 01:00:00,BTCUSDT,45100.50,1100.75`;
      
      const filePath = '/tmp/test-data.csv';
      fs.writeFileSync(filePath, csvData);
      
      const result = await importCSV(filePath);
      
      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
      
      fs.unlinkSync(filePath);
    });
    
    it('should handle invalid CSV data', async () => {
      const csvData = `timestamp,symbol,price,volume
invalid,data,here
2023-01-01 00:00:00,BTCUSDT,45000.00,1000.50`;
      
      const filePath = '/tmp/invalid-test-data.csv';
      fs.writeFileSync(filePath, csvData);
      
      const result = await importCSV(filePath);
      
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(1);
      
      fs.unlinkSync(filePath);
    });
  });
  
  describe('JSON Import', () => {
    it('should import valid JSON data', async () => {
      const jsonData = [
        {
          timestamp: '2023-01-01T00:00:00Z',
          symbol: 'BTCUSDT',
          price: 45000.00,
          volume: 1000.50
        }
      ];
      
      const result = await importJSON(jsonData);
      
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });
  
  describe('Data Validation', () => {
    it('should validate price data correctly', () => {
      const validData = {
        timestamp: '2023-01-01T00:00:00Z',
        symbol: 'BTCUSDT',
        price: 45000.00,
        volume: 1000.50
      };
      
      const errors = DataValidator.validatePriceData(validData);
      expect(errors).toHaveLength(0);
    });
    
    it('should detect invalid price data', () => {
      const invalidData = {
        timestamp: 'invalid',
        symbol: '',
        price: -100,
        volume: -500
      };
      
      const errors = DataValidator.validatePriceData(invalidData);
      expect(errors).toHaveLength(4);
    });
  });
});
```

## Error Handling and Recovery

### Import Error Recovery

```javascript
class ImportErrorHandler {
  static async handleImportError(error, context) {
    console.error('Import error:', error);
    
    // Log error details
    await this.logError({
      error: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date()
    });
    
    // Attempt recovery based on error type
    if (error.code === 'SQLITE_BUSY') {
      // Database is busy, retry after delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      return { retry: true };
    }
    
    if (error.message.includes('constraint')) {
      // Data constraint violation, skip record
      return { skip: true };
    }
    
    // For other errors, stop import
    return { stop: true };
  }
  
  static async logError(errorInfo) {
    // Log to file or database
    const logEntry = {
      ...errorInfo,
      id: require('crypto').randomBytes(16).toString('hex')
    };
    
    // Append to error log file
    const logPath = path.join(__dirname, 'import-errors.log');
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  }
}
```

## Security Considerations

### File Upload Security

```javascript
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only CSV and JSON files
    const allowedTypes = [
      'text/csv',
      'application/json',
      'text/plain' // For CSV files on some systems
    ];
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.csv', '.json'];
    
    if (allowedTypes.includes(file.mimetype) && allowedExts.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  }
});
```

## Monitoring and Logging

### Import Monitoring

```javascript
class ImportMonitor {
  static async logImport(importId, details) {
    const logEntry = {
      importId,
      timestamp: new Date(),
      ...details
    };
    
    // Log to monitoring system
    console.log('Import event:', JSON.stringify(logEntry));
    
    // Send to external monitoring service if configured
    if (process.env.MONITORING_SERVICE_URL) {
      try {
        await fetch(process.env.MONITORING_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
      } catch (error) {
        console.error('Failed to send monitoring data:', error);
      }
    }
  }
}
```