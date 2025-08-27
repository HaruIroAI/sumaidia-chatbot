# Metrics System Documentation

## Overview

The Sumaidia chatbot includes a minimal metrics collection system for monitoring expression usage patterns. This helps improve the quality of emotional responses and understand user interactions.

## Purpose

1. **Expression Quality Monitoring**: Track which expressions are selected and whether they come from the AI model or the expression engine
2. **Performance Analysis**: Understand the distribution of emotions in conversations
3. **System Health**: Identify potential issues with expression selection
4. **Development Insights**: Guide improvements to the expression mapping system

## Data Collected

The metrics endpoint collects only the following minimal data:

```json
{
  "t": "expr",           // Type: always "expr" for expression metrics
  "id": "happy",         // Expression ID that was selected
  "source": "model",     // Source: "model" (AI provided) or "engine" (computed)
  "ts": 1234567890000    // Timestamp in milliseconds
}
```

### Additional Server-Side Context (Logs Only)
- User-Agent header (for debugging browser compatibility)
- Referer header (to identify the page source)
- Timestamp in ISO format

## Privacy Policy

### What We DO Collect
- Expression IDs used in conversations
- Whether the expression was selected by AI or the engine
- Timestamps of expression changes
- Basic browser information (User-Agent)

### What We DON'T Collect
- Conversation content or messages
- User identities or personal information
- IP addresses (beyond what Netlify logs by default)
- Session tracking or cookies
- Location data
- Device identifiers

### Data Storage
- **Current Implementation**: Metrics are only logged to console (stdout)
- **Retention**: Follows Netlify Functions log retention policy (typically 1-7 days)
- **No Database**: Currently no persistent storage of metrics

### Data Usage
Metrics are used exclusively for:
- Debugging expression selection issues
- Understanding emotion distribution patterns
- Improving the expression engine algorithm
- System health monitoring

## Technical Implementation

### Client Side (index.html)
```javascript
// Fire-and-forget beacon after expression selection
navigator.sendBeacon('/.netlify/functions/metrics', JSON.stringify({
    t: 'expr',
    id: finalEmotion,
    source: emotionSource,
    ts: Date.now()
}));
```

### Server Side (netlify/functions/metrics.js)
- Receives POST requests with JSON payload
- Validates data format
- Logs to console for visibility
- Returns 204 No Content

### Security
- CORS configured for same-origin (expandable to specific domains)
- Input validation to prevent log injection
- No sensitive data collection
- Rate limiting handled by Netlify

## Future Considerations

### Potential Enhancements
1. **Aggregation**: Add daily/weekly aggregation of expression usage
2. **Persistence**: Store aggregated metrics in a database
3. **Dashboard**: Create a simple dashboard for metrics visualization
4. **A/B Testing**: Support for testing different expression algorithms
5. **Error Tracking**: Log expression selection failures

### Privacy Enhancements
1. **Opt-out**: Add user preference to disable metrics
2. **Data Minimization**: Further reduce collected data
3. **Anonymization**: Hash any potentially identifying information
4. **GDPR Compliance**: Add consent mechanisms if expanding to EU

## Monitoring

### How to View Metrics
1. **Netlify Dashboard**: Functions → metrics → View logs
2. **CLI**: `netlify logs:function metrics`
3. **Real-time**: `netlify logs:function metrics --tail`

### Example Log Output
```
[Metrics] Expression: id=happy source=model ts=2024-08-27T10:30:45.123Z
{
  "type": "expr",
  "emotionId": "happy",
  "source": "model",
  "timestamp": "2024-08-27T10:30:45.123Z",
  "userAgent": "Mozilla/5.0...",
  "referer": "https://cute-frangipane-efe657.netlify.app/"
}
```

## Compliance

### Current Status
- ✅ No personal data collection
- ✅ No cookies or tracking
- ✅ Minimal data principle
- ✅ Purpose limitation
- ✅ Transparent documentation

### Recommendations
- Consider adding a privacy notice to the UI
- Implement data retention policies
- Add user control mechanisms if expanding metrics
- Regular privacy impact assessments

## Contact

For questions about metrics or privacy:
- Repository: https://github.com/HaruIroAI/sumaidia-chatbot
- Issues: https://github.com/HaruIroAI/sumaidia-chatbot/issues

---

*Last updated: 2024-08-27*