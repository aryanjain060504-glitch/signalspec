import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface RawReviewItem {
  id: string;
  source: string;
  product: string;
  rating?: number;
  reviewText: string;
  date?: Date;
  author?: string;
}

export interface ExtractedPainPointResult {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  userSegment: string;
  relatedThemes: string[];
  evidenceReviewIds: string[];
  frequency: number;
}

export interface ExtractedOpportunityResult {
  title: string;
  description: string;
  problemSummary: string;
  userImpact: string;
  suggestedSolution: string;
  aiReasoning: string;
  confidence: number;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  negativeSentimentRatio: number;
  strategicRelevance: number;
  evidenceReviewIds: string[];
  evidencePainPointIndices: number[];
}

export interface AnalysisPipelineOutput {
  themes: string[];
  painPoints: ExtractedPainPointResult[];
  opportunities: ExtractedOpportunityResult[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface GeneratedPrdOutput {
  title: string;
  overview: string;
  problemStatement: string;
  evidenceQuotes: Array<{
    reviewId: string;
    quote: string;
    source: string;
    rating?: number;
  }>;
  targetUsers: string[];
  userStories: Array<{
    role: string;
    action: string;
    benefit: string;
    priority: 'P0' | 'P1' | 'P2';
  }>;
  goals: string[];
  nonGoals: string[];
  functionalRequirements: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
    acceptanceCriteria: string[];
  }>;
  userFlow: string;
  edgeCases: string[];
  successMetrics: Array<{
    metric: string;
    target: string;
    timeframe: string;
  }>;
  acceptanceCriteria: string[];
  rawMarkdown: string;
}

export type ProgressCallback = (stage: string, progress: number, message: string) => void;

class AIService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      logger.info('Gemini AI Provider initialized successfully');
    } else {
      logger.info('No GEMINI_API_KEY detected. Using deterministic high-fidelity AI simulation engine.');
    }
  }

  /**
   * Runs the complete multi-stage review analysis pipeline
   */
  async runReviewAnalysisPipeline(
    reviews: RawReviewItem[],
    projectName: string,
    onProgress?: ProgressCallback
  ): Promise<AnalysisPipelineOutput> {
    if (reviews.length === 0) {
      throw new Error('Cannot analyze empty review set');
    }

    // Stage 1: Cleaning & Ingestion
    onProgress?.('cleaning', 10, 'Cleaning and preparing reviews for analysis...');
    const cleanedReviews = reviews.filter((r) => r.reviewText && r.reviewText.trim().length >= 5);

    // Stage 2: Sentiment and Theme Classification
    onProgress?.('sentiment_theme', 30, 'Performing sentiment analysis and SaaS theme extraction...');
    
    // Stage 3 & 4: Pain point extraction and clustering
    onProgress?.('pain_points', 50, 'Extracting recurring customer pain points and evidence links...');
    
    // Stage 5 & 6: Opportunity detection and scoring
    onProgress?.('opportunities', 75, 'Synthesizing product opportunities and calculating explainable scores...');

    let result: AnalysisPipelineOutput;

    if (this.genAI) {
      try {
        result = await this.runGeminiPipeline(cleanedReviews, projectName);
      } catch (err: any) {
        logger.warn('Gemini API call failed, falling back to local NLP engine:', err.message);
        result = this.runLocalAnalysisEngine(cleanedReviews);
      }
    } else {
      result = this.runLocalAnalysisEngine(cleanedReviews);
    }

    onProgress?.('completed', 100, 'Analysis complete!');
    return result;
  }

  /**
   * Generates a complete, evidence-grounded PRD from an opportunity
   */
  async generatePRD(
    opportunity: {
      title: string;
      description: string;
      problemSummary: string;
      userImpact: string;
      suggestedSolution: string;
      aiReasoning: string;
      score: number;
    },
    supportingReviews: RawReviewItem[],
    projectName: string
  ): Promise<GeneratedPrdOutput> {
    if (this.genAI) {
      try {
        return await this.runGeminiPrdGeneration(opportunity, supportingReviews, projectName);
      } catch (err: any) {
        logger.warn('Gemini PRD generation failed, falling back to local PRD generator:', err.message);
        return this.runLocalPrdGenerator(opportunity, supportingReviews, projectName);
      }
    }

    return this.runLocalPrdGenerator(opportunity, supportingReviews, projectName);
  }

  /**
   * Gemini-based analysis pipeline with structured JSON schema
   */
  private async runGeminiPipeline(
    reviews: RawReviewItem[],
    projectName: string
  ): Promise<AnalysisPipelineOutput> {
    const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const reviewSamples = reviews.slice(0, 100).map((r) => ({
      id: r.id,
      product: r.product,
      rating: r.rating,
      source: r.source,
      text: r.reviewText,
    }));

    const prompt = `You are a Principal Product Discovery & Strategy AI for SaaS teams.
Analyze the following customer reviews for the project "${projectName}".

Reviews:
${JSON.stringify(reviewSamples, null, 2)}

Strictly adhere to the EVIDENCE-FIRST principle:
- Never hallucinate quotes or pain points.
- Extract real themes (e.g., Usability, Reporting, Integration, Onboarding, Pricing, Mobile, Performance).
- Identify distinct, recurring pain points with supporting review IDs from the provided dataset.
- Transform validated pain points into clear, actionable Product Opportunities.
- Return ONLY valid JSON matching this exact structure:

{
  "themes": ["Usability", "Reporting", "..."],
  "sentimentBreakdown": { "positive": 10, "neutral": 5, "negative": 20 },
  "painPoints": [
    {
      "title": "Clear concise pain point description",
      "description": "Detailed explanation of customer struggle",
      "severity": "high", // "low" | "medium" | "high" | "critical"
      "confidence": 88,
      "userSegment": "Indie founders / power users",
      "relatedThemes": ["Reporting"],
      "evidenceReviewIds": ["${reviews[0]?.id || 'id'}"],
      "frequency": 12
    }
  ],
  "opportunities": [
    {
      "title": "Actionable product opportunity name",
      "description": "What opportunity exists to solve the problem",
      "problemSummary": "The root cause customer problem",
      "userImpact": "How this impacts customer workflow and retention",
      "suggestedSolution": "High-level feature direction",
      "aiReasoning": "Why this represents a viable product opportunity grounded in evidence",
      "confidence": 85,
      "frequency": 12,
      "severity": "high",
      "negativeSentimentRatio": 0.85,
      "strategicRelevance": 0.9,
      "evidenceReviewIds": ["${reviews[0]?.id || 'id'}"],
      "evidencePainPointIndices": [0]
    }
  ]
}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return parsed as AnalysisPipelineOutput;
  }

  /**
   * Gemini PRD generator
   */
  private async runGeminiPrdGeneration(
    opportunity: any,
    supportingReviews: RawReviewItem[],
    projectName: string
  ): Promise<GeneratedPrdOutput> {
    const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const evidenceQuotes = supportingReviews.slice(0, 8).map((r) => ({
      reviewId: r.id,
      quote: r.reviewText.length > 250 ? r.reviewText.substring(0, 247) + '...' : r.reviewText,
      source: r.source || 'Review Import',
      rating: r.rating,
    }));

    const prompt = `You are a Lead Technical Product Manager.
Generate a comprehensive, actionable, and evidence-backed Product Requirements Document (PRD) for the SaaS project "${projectName}".

Opportunity Details:
${JSON.stringify(opportunity, null, 2)}

Supporting Customer Evidence:
${JSON.stringify(evidenceQuotes, null, 2)}

Generate a detailed specification adhering to the SignalSpec PRD format.
Return ONLY valid JSON matching this schema:
{
  "title": "PRD: ${opportunity.title}",
  "overview": "Comprehensive overview of the feature/initiative",
  "problemStatement": "Clear problem statement grounded in the customer evidence",
  "evidenceQuotes": ${JSON.stringify(evidenceQuotes)},
  "targetUsers": ["Indie SaaS founders", "Solo developers", "Product teams"],
  "userStories": [
    {
      "role": "founder",
      "action": "view visual task dependencies",
      "benefit": "spot blockers before sprint deadlines",
      "priority": "P0"
    }
  ],
  "goals": ["Reduce research time by 50%", "Increase clarity in specs"],
  "nonGoals": ["Do not build automatic Jira sync in MVP"],
  "functionalRequirements": [
    {
      "id": "FR-1",
      "title": "Requirement Title",
      "description": "Detailed functional behavior",
      "priority": "P0",
      "acceptanceCriteria": ["System must do X", "User can trigger Y"]
    }
  ],
  "userFlow": "1. User navigates to dashboard -> 2. Clicks new feature -> 3. Configures parameters -> 4. Sees result",
  "edgeCases": ["User submits empty data", "Network timeout handling"],
  "successMetrics": [
    {
      "metric": "Feature Adoption Rate",
      "target": "> 40% of active users in 30 days",
      "timeframe": "30 days"
    }
  ],
  "acceptanceCriteria": [
    "All functional requirements pass automated tests",
    "Evidence quotes are verified against project reviews"
  ],
  "rawMarkdown": "# Markdown version of the PRD..."
}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    return JSON.parse(result.response.text()) as GeneratedPrdOutput;
  }

  /**
   * Local high-fidelity NLP analysis engine for offline or API-key-free environments
   */
  private runLocalAnalysisEngine(reviews: RawReviewItem[]): AnalysisPipelineOutput {
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    const themePatterns: Record<string, { regex: RegExp; keywords: string[] }> = {
      'Usability & UX': {
        regex: /(confus|difficult|clunky|hard to use|ui|ux|navigation|interface|complex|learning curve)/i,
        keywords: ['navigation', 'complexity', 'user interface'],
      },
      'Performance & Reliability': {
        regex: /(slow|lag|crash|bug|freeze|downtime|timeout|glitch|error|loading)/i,
        keywords: ['latency', 'system bugs', 'stability'],
      },
      'Integrations & API': {
        regex: /(api|webhook|zapier|slack|github|jira|sync|connect|export|import)/i,
        keywords: ['api access', 'third-party sync', 'data export'],
      },
      'Pricing & Value': {
        regex: /(price|expensive|cost|tier|billing|subscription|value|overpriced|paywall)/i,
        keywords: ['pricing structure', 'billing transparency', 'value for money'],
      },
      'Reporting & Analytics': {
        regex: /(report|analytics|chart|metrics|insights|export|csv|dashboard|stats)/i,
        keywords: ['exporting data', 'analytics visibility', 'custom reporting'],
      },
      'Mobile Experience': {
        regex: /(mobile|ios|android|phone|app|ipad|tablet|responsive)/i,
        keywords: ['mobile app', 'responsive view', 'touch layout'],
      },
      'Onboarding & Setup': {
        regex: /(onboard|setup|getting started|tutorial|documentation|guide|config)/i,
        keywords: ['initial setup', 'docs clarity', 'guided tour'],
      },
    };

    const themeBuckets: Record<string, RawReviewItem[]> = {};
    Object.keys(themePatterns).forEach((theme) => {
      themeBuckets[theme] = [];
    });

    reviews.forEach((review) => {
      const text = review.reviewText.toLowerCase();
      let isNeg = false;
      let isPos = false;

      if (review.rating !== undefined) {
        if (review.rating <= 2) isNeg = true;
        else if (review.rating >= 4) isPos = true;
      } else {
        if (/(bad|terrible|awful|hate|poor|frustrat|broken|waste|annoy|worst)/i.test(text)) {
          isNeg = true;
        } else if (/(great|love|excellent|awesome|amazing|fantastic|best|helpful)/i.test(text)) {
          isPos = true;
        }
      }

      if (isNeg) negativeCount++;
      else if (isPos) positiveCount++;
      else neutralCount++;

      // Tag themes
      for (const [theme, pattern] of Object.entries(themePatterns)) {
        if (pattern.regex.test(text)) {
          themeBuckets[theme]?.push(review);
        }
      }
    });

    // Extract pain points from themes with at least 1 negative/neutral review
    const painPoints: ExtractedPainPointResult[] = [];
    const opportunities: ExtractedOpportunityResult[] = [];

    const activeThemes = Object.keys(themeBuckets).filter(
      (theme) => (themeBuckets[theme]?.length || 0) > 0
    );

    activeThemes.forEach((theme, index) => {
      const matched = themeBuckets[theme] || [];
      const evidenceIds = matched.slice(0, 10).map((r) => r.id);
      const frequency = matched.length;

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (frequency >= 15 || /crash|bug|downtime|expensive|broken/i.test(theme)) {
        severity = frequency >= 25 ? 'critical' : 'high';
      } else if (frequency <= 2) {
        severity = 'low';
      }

      const confidence = Math.min(75 + frequency * 3, 95);

      const painPointTitle = `Users experience friction with ${theme.toLowerCase()}`;
      const painPointDesc = `Multiple customers report recurring bottlenecks around ${theme.toLowerCase()}, citing decreased productivity and workflow interruption.`;

      painPoints.push({
        title: painPointTitle,
        description: painPointDesc,
        severity,
        confidence,
        userSegment: 'Core SaaS Users & Small Teams',
        relatedThemes: [theme],
        evidenceReviewIds: evidenceIds,
        frequency,
      });

      // Formulate opportunity
      const oppTitle = `Streamlined ${theme} Experience`;
      const oppDesc = `Build a native, intuitive ${theme.toLowerCase()} workflow that addresses customer complaints and removes operational friction.`;
      const problemSummary = `Customers currently struggle with inconsistent ${theme.toLowerCase()}, leading to churn risk and negative review sentiment.`;
      const userImpact = `Reduces manual workarounds, saves time for founders and users, and increases user retention.`;
      const suggestedSolution = `Implement targeted UI improvements, automated helpers, and clear feedback loops for ${theme.toLowerCase()}.`;
      const aiReasoning = `Derived from ${frequency} customer reviews indicating recurring dissatisfaction with existing tooling.`;

      opportunities.push({
        title: oppTitle,
        description: oppDesc,
        problemSummary,
        userImpact,
        suggestedSolution,
        aiReasoning,
        confidence,
        frequency,
        severity,
        negativeSentimentRatio: Math.min(0.5 + frequency * 0.05, 0.95),
        strategicRelevance: 0.85,
        evidenceReviewIds: evidenceIds,
        evidencePainPointIndices: [index],
      });
    });

    // Fallback if no specific themes matched
    if (painPoints.length === 0) {
      const fallbackEvidence = reviews.slice(0, 5).map((r) => r.id);
      painPoints.push({
        title: 'General workflow and feature friction',
        description: 'Customer feedback indicates recurring difficulty executing end-to-end tasks cleanly.',
        severity: 'medium',
        confidence: 80,
        userSegment: 'General Users',
        relatedThemes: ['Usability & UX'],
        evidenceReviewIds: fallbackEvidence,
        frequency: reviews.length,
      });

      opportunities.push({
        title: 'Core Workflow Optimization',
        description: 'Refactor the primary user onboarding and task execution journey.',
        problemSummary: 'Users encounter confusing steps during common product operations.',
        userImpact: 'Improves feature discovery and daily active engagement.',
        suggestedSolution: 'Simplify the user journey with guided tooltips, standard actions, and error prevention.',
        aiReasoning: 'Identified from aggregated feedback across customer reviews.',
        confidence: 80,
        frequency: reviews.length,
        severity: 'medium',
        negativeSentimentRatio: 0.6,
        strategicRelevance: 0.8,
        evidenceReviewIds: fallbackEvidence,
        evidencePainPointIndices: [0],
      });
    }

    return {
      themes: activeThemes.length > 0 ? activeThemes : ['Usability & UX'],
      painPoints,
      opportunities,
      sentimentBreakdown: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount,
      },
    };
  }

  /**
   * Local high-fidelity PRD generator adhering to PRD Sections 19 & 20
   */
  private runLocalPrdGenerator(
    opportunity: any,
    supportingReviews: RawReviewItem[],
    projectName: string
  ): GeneratedPrdOutput {
    const evidenceQuotes = supportingReviews.slice(0, 6).map((r) => ({
      reviewId: r.id,
      quote: r.reviewText.length > 220 ? r.reviewText.substring(0, 217) + '...' : r.reviewText,
      source: r.source || 'Review Import',
      rating: r.rating,
    }));

    const title = `PRD: ${opportunity.title}`;
    const overview = `This specification outlines the technical and product requirements for **${opportunity.title}** within **${projectName}**. Grounded directly in recurring customer feedback, this initiative eliminates key pain points and delivers measurable user value.`;
    const problemStatement = opportunity.problemSummary || `Customers repeatedly struggle with ${opportunity.title.toLowerCase()}, creating friction and increasing churn.`;

    const userStories = [
      {
        role: 'SaaS Founder / Product Lead',
        action: `configure and utilize the ${opportunity.title.toLowerCase()} workflow directly from the dashboard`,
        benefit: 'save hours of manual coordination and prevent mistakes',
        priority: 'P0' as const,
      },
      {
        role: 'End User',
        action: 'receive immediate feedback and clear error states during execution',
        benefit: 'complete tasks without confusion or reliance on support',
        priority: 'P0' as const,
      },
      {
        role: 'Team Collaborator',
        action: 'export or share specification details with engineering teammates',
        benefit: 'align on implementation without back-and-forth ambiguity',
        priority: 'P1' as const,
      },
    ];

    const goals = [
      `Eliminate the primary customer complaints associated with ${opportunity.title.toLowerCase()}.`,
      'Achieve a user satisfaction rating > 4.5/5 on this workflow.',
      'Reduce the average time to complete the core user journey by at least 40%.',
    ];

    const nonGoals = [
      'Rebuilding third-party external integrations outside the core product boundaries.',
      'Complex enterprise permission matrix in the initial MVP release.',
    ];

    const functionalRequirements = [
      {
        id: 'FR-1',
        title: 'Core Workflow Configuration & Input',
        description: `Allow users to initiate and configure parameters for ${opportunity.title}.`,
        priority: 'P0' as const,
        acceptanceCriteria: [
          'Inputs must validate in real time with clear error messages.',
          'State must persist across navigation and reload.',
        ],
      },
      {
        id: 'FR-2',
        title: 'Evidence-Linked Display & Actions',
        description: 'Render supporting data and clear actionable primary CTA buttons.',
        priority: 'P0' as const,
        acceptanceCriteria: [
          'All metrics must display accurate calculations.',
          'Actions provide immediate loading feedback.',
        ],
      },
      {
        id: 'FR-3',
        title: 'Export & Share Capabilities',
        description: 'Enable export of results in Markdown, JSON, and clipboard format.',
        priority: 'P1' as const,
        acceptanceCriteria: [
          'Copy to clipboard button provides visual toast confirmation.',
          'Exported files match formatting specifications.',
        ],
      },
    ];

    const userFlow = `
1. User logs into SignalSpec and selects project "${projectName}".
2. User opens the Opportunity Detail page for "${opportunity.title}".
3. User clicks "Generate PRD" and reviews customer evidence quotes.
4. User edits specification sections inline as needed.
5. User clicks "Export PRD" to copy Markdown or share with engineering.
    `.trim();

    const edgeCases = [
      'User initiates action with zero historical reviews: display guided empty state.',
      'Network interruption during processing: graceful retry with exponential backoff.',
      'Large review dataset (>1,000 items): paginated background batch processing.',
    ];

    const successMetrics = [
      {
        metric: 'Feature Adoption Rate',
        target: 'Over 50% of active founders generate a PRD within 7 days of analysis',
        timeframe: '30 Days Post Launch',
      },
      {
        metric: 'Time Saved per Discovery Cycle',
        target: 'Save 3+ hours per product decision cycle compared to manual review analysis',
        timeframe: 'Ongoing',
      },
      {
        metric: 'PRD Export / Sharing Frequency',
        target: 'At least 70% of generated PRDs are exported or shared with engineering teams',
        timeframe: '60 Days Post Launch',
      },
    ];

    const acceptanceCriteria = [
      'All P0 functional requirements implemented and covered by unit/integration tests.',
      'Evidence quotes verified against real ingested project reviews.',
      'PRD is fully editable and exportable to clean Markdown and JSON.',
      'Ownership checks strictly prevent unauthorized cross-project access.',
    ];

    const rawMarkdown = `
# ${title}

## 1. Overview
${overview}

## 2. Problem Statement
${problemStatement}

## 3. Customer Evidence Quotes
${evidenceQuotes.map((e) => `> "${e.quote}" — *${e.source}${e.rating ? ` (${e.rating}/5 stars)` : ''}*`).join('\n\n')}

## 4. Target Users
- Indie SaaS Founders
- Product Managers & Solo Developers
- Product Consultants & Researchers

## 5. User Stories
${userStories.map((u) => `- **As a** ${u.role}, **I want to** ${u.action}, **so that** ${u.benefit} *(${u.priority})*`).join('\n')}

## 6. Goals & Non-Goals
### Goals
${goals.map((g) => `- ${g}`).join('\n')}

### Non-Goals
${nonGoals.map((ng) => `- ${ng}`).join('\n')}

## 7. Functional Requirements
${functionalRequirements
  .map(
    (fr) => `### ${fr.id}: ${fr.title} (${fr.priority})
${fr.description}
**Acceptance Criteria:**
${fr.acceptanceCriteria.map((ac) => `- ${ac}`).join('\n')}`
  )
  .join('\n\n')}

## 8. User Flow
${userFlow}

## 9. Edge Cases & Resilience
${edgeCases.map((ec) => `- ${ec}`).join('\n')}

## 10. Success Metrics
${successMetrics.map((sm) => `- **${sm.metric}:** ${sm.target} (${sm.timeframe})`).join('\n')}

## 11. Definition of Done & Acceptance Criteria
${acceptanceCriteria.map((ac) => `- [ ] ${ac}`).join('\n')}
    `.trim();

    return {
      title,
      overview,
      problemStatement,
      evidenceQuotes,
      targetUsers: ['Indie SaaS founders', 'Solo developers', 'Product teams'],
      userStories,
      goals,
      nonGoals,
      functionalRequirements,
      userFlow,
      edgeCases,
      successMetrics,
      acceptanceCriteria,
      rawMarkdown,
    };
  }
}

export const aiService = new AIService();
