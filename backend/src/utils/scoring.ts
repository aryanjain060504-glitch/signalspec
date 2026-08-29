export interface ScoreBreakdown {
  frequencyScore: number;
  severityScore: number;
  sentimentScore: number;
  strategicScore: number;
  confidenceScore: number;
  totalScore: number;
  explanation: string;
}

export interface ScoreInput {
  frequency: number; // raw review count
  totalReviewsInProject: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  negativeSentimentRatio: number; // 0 to 1
  strategicRelevance?: number; // 0 to 1 (default 0.75)
  confidence: number; // 0 to 100
}

/**
 * Computes an explainable 0-100 Opportunity Score based on PRD Section 17.
 * 
 * Score components:
 * - Frequency (Max 30 pts): Higher proportion of user complaints = higher score.
 * - Severity (Max 25 pts): Low (5), Medium (12), High (20), Critical (25).
 * - Negative Sentiment (Max 20 pts): Higher dissatisfaction = higher score.
 * - Strategic Relevance (Max 15 pts): Relevance to core value prop.
 * - Confidence (Max 10 pts): AI extraction confidence.
 */
export function calculateOpportunityScore(input: ScoreInput): ScoreBreakdown {
  const total = Math.max(input.totalReviewsInProject, 1);
  const freqRatio = Math.min(input.frequency / total, 1);

  // 1. Frequency score (0 - 30)
  // Scale dynamically: if >= 20% of reviews complain, max out frequency points
  const frequencyScore = Math.min(Math.round((freqRatio / 0.2) * 30), 30);

  // 2. Severity score (0 - 25)
  let severityScore = 12;
  switch (input.severity) {
    case 'critical':
      severityScore = 25;
      break;
    case 'high':
      severityScore = 20;
      break;
    case 'medium':
      severityScore = 12;
      break;
    case 'low':
      severityScore = 5;
      break;
  }

  // 3. Negative Sentiment score (0 - 20)
  const sentimentScore = Math.min(Math.round(input.negativeSentimentRatio * 20), 20);

  // 4. Strategic Relevance score (0 - 15)
  const strategic = input.strategicRelevance ?? 0.8;
  const strategicScore = Math.min(Math.round(strategic * 15), 15);

  // 5. Confidence score (0 - 10)
  const confRatio = Math.min(Math.max(input.confidence / 100, 0), 1);
  const confidenceScore = Math.min(Math.round(confRatio * 10), 10);

  const totalScore = Math.min(
    Math.max(frequencyScore + severityScore + sentimentScore + strategicScore + confidenceScore, 0),
    100
  );

  const explanation =
    `Score ${totalScore}/100 derived from: Frequency (${frequencyScore}/30, ${input.frequency} mentions), ` +
    `Severity (${severityScore}/25, ${input.severity.toUpperCase()}), ` +
    `Negative Sentiment Impact (${sentimentScore}/20, ${(input.negativeSentimentRatio * 100).toFixed(0)}% neg), ` +
    `Strategic Relevance (${strategicScore}/15), and AI Confidence (${confidenceScore}/10, ${input.confidence}%).`;

  return {
    frequencyScore,
    severityScore,
    sentimentScore,
    strategicScore,
    confidenceScore,
    totalScore,
    explanation,
  };
}
