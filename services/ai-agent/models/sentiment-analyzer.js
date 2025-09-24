// Advanced Sentiment Analyzer using NLP techniques
class SentimentAnalyzer {
  constructor() {
    // Sentiment lexicons and weights
    this.positiveWords = new Set([
      'bullish', 'pump', 'moon', 'strong', 'buy', 'accumulate', 'growth', 'rise', 'surge', 'jump',
      'soar', 'climb', 'gain', 'profit', 'success', 'win', 'breakout', 'support', 'resistance'
    ]);
    
    this.negativeWords = new Set([
      'bearish', 'dump', 'crash', 'weak', 'sell', 'liquidate', 'loss', 'fall', 'drop', 'plunge',
      'crash', 'decline', 'slump', 'lose', 'failure', 'fear', 'panic', 'dumping', 'resistance'
    ]);
    
    this.intensifiers = new Set(['very', 'extremely', 'incredibly', 'absolutely', 'totally']);
    this.negations = new Set(['not', 'no', 'never', 'none', 'nothing', 'neither', 'nobody']);
    
    console.log('Sentiment Analyzer initialized');
  }

  // Analyze sentiment of text
  analyzeSentiment(text) {
    if (!text) return { score: 0, confidence: 0 };
    
    // Preprocess text
    const words = this.preprocessText(text);
    
    let score = 0;
    let wordCount = 0;
    let intensity = 1;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      
      // Check for intensifiers
      if (this.intensifiers.has(word)) {
        intensity = 2;
        continue;
      }
      
      // Check for negations
      const isNegated = i > 0 && this.negations.has(words[i-1].toLowerCase());
      
      // Score words
      if (this.positiveWords.has(word)) {
        score += isNegated ? -intensity : intensity;
        wordCount++;
      } else if (this.negativeWords.has(word)) {
        score += isNegated ? intensity : -intensity;
        wordCount++;
      }
      
      intensity = 1; // Reset intensity
    }
    
    // Normalize score
    const normalizedScore = wordCount > 0 ? score / wordCount : 0;
    const confidence = Math.min(1, wordCount / 10); // Confidence based on word count
    
    return {
      score: this.clamp(normalizedScore, -1, 1),
      confidence: this.clamp(confidence, 0, 1),
      wordCount
    };
  }

  // Preprocess text for analysis
  preprocessText(text) {
    // Remove URLs, mentions, hashtags
    let processed = text.replace(/https?:\/\/[^\s]+/g, '');
    processed = processed.replace(/@[^\s]+/g, '');
    processed = processed.replace(/#[^\s]+/g, '');
    
    // Remove special characters but keep spaces
    processed = processed.replace(/[^a-zA-Z\s]/g, ' ');
    
    // Split into words and filter empty strings
    return processed.split(/\s+/).filter(word => word.length > 0);
  }

  // Clamp value between min and max
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // Analyze multiple texts and aggregate sentiment
  analyzeMultiple(texts) {
    if (!texts || texts.length === 0) return { score: 0, confidence: 0 };
    
    let totalScore = 0;
    let totalConfidence = 0;
    let totalCount = 0;
    
    for (const text of texts) {
      const result = this.analyzeSentiment(text);
      totalScore += result.score * result.confidence;
      totalConfidence += result.confidence;
      totalCount++;
    }
    
    const avgScore = totalCount > 0 ? totalScore / totalCount : 0;
    const avgConfidence = totalCount > 0 ? totalConfidence / totalCount : 0;
    
    return {
      score: this.clamp(avgScore, -1, 1),
      confidence: this.clamp(avgConfidence, 0, 1),
      totalCount
    };
  }

  // Get sentiment category
  getSentimentCategory(score) {
    if (score > 0.5) return 'Very Positive';
    if (score > 0.1) return 'Positive';
    if (score < -0.5) return 'Very Negative';
    if (score < -0.1) return 'Negative';
    return 'Neutral';
  }
}

module.exports = SentimentAnalyzer;