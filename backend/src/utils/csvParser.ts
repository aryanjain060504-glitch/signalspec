import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

export interface ParsedReviewInput {
  externalReviewId?: string;
  source: string;
  product: string;
  rating?: number;
  reviewText: string;
  author?: string;
  reviewDate?: Date;
  contentHash: string;
}

export interface ParseResult {
  validReviews: ParsedReviewInput[];
  invalidCount: number;
  duplicateCount: number;
  errors: string[];
}

/**
 * Normalizes text for deduplication hashing
 */
export function generateContentHash(product: string, text: string): string {
  const normalized = `${product.trim().toLowerCase()}:${text.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Parses CSV buffer or text string into structured review records.
 * Supports fuzzy header resolution for maximum compatibility with user CSVs.
 */
export function parseReviewCSV(csvContent: string | Buffer): ParseResult {
  const content = typeof csvContent === 'string' ? csvContent : csvContent.toString('utf-8');
  const errors: string[] = [];
  const validReviews: ParsedReviewInput[] = [];
  const seenHashes = new Set<string>();
  let duplicateCount = 0;
  let invalidCount = 0;

  let records: Record<string, string>[];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (err: any) {
    return {
      validReviews: [],
      invalidCount: 0,
      duplicateCount: 0,
      errors: [`Failed to parse CSV file: ${err.message}`],
    };
  }

  if (!records || records.length === 0) {
    return {
      validReviews: [],
      invalidCount: 0,
      duplicateCount: 0,
      errors: ['The uploaded CSV is empty or has no readable rows.'],
    };
  }

  records.forEach((row) => {
    // Find text column
    const textKey = Object.keys(row).find((k) =>
      /^(review_text|reviewtext|review|text|comment|feedback|content|body|description)$/i.test(k.trim())
    );
    const reviewText = textKey ? row[textKey]?.trim() : '';

    if (!reviewText || reviewText.length < 5) {
      invalidCount++;
      return;
    }

    // Find product/competitor column
    const productKey = Object.keys(row).find((k) =>
      /^(product|product_name|productname|competitor|competitor_name|app|app_name)$/i.test(k.trim())
    );
    const product = (productKey && row[productKey]?.trim()) || 'General';

    // Find source column
    const sourceKey = Object.keys(row).find((k) =>
      /^(source|platform|site|origin|channel)$/i.test(k.trim())
    );
    const source = (sourceKey && row[sourceKey]?.trim()) || 'CSV Import';

    // Find rating column
    const ratingKey = Object.keys(row).find((k) =>
      /^(rating|score|stars|star_rating)$/i.test(k.trim())
    );
    let rating: number | undefined;
    if (ratingKey && row[ratingKey]) {
      const parsedRating = parseFloat(row[ratingKey]);
      if (!isNaN(parsedRating) && parsedRating >= 0 && parsedRating <= 10) {
        rating = parsedRating <= 5 ? parsedRating : parsedRating / 2; // normalize 10-scale to 5-scale
      }
    }

    // Find external ID
    const idKey = Object.keys(row).find((k) =>
      /^(review_id|reviewid|id|external_id)$/i.test(k.trim())
    );
    const externalReviewId = idKey ? row[idKey]?.trim() : undefined;

    // Find author
    const authorKey = Object.keys(row).find((k) =>
      /^(author|user|user_name|username|reviewer|customer)$/i.test(k.trim())
    );
    const author = authorKey ? row[authorKey]?.trim() : undefined;

    // Find date
    const dateKey = Object.keys(row).find((k) =>
      /^(date|review_date|reviewdate|created_at|createdat|timestamp)$/i.test(k.trim())
    );
    let reviewDate: Date | undefined;
    if (dateKey && row[dateKey]) {
      const parsedDate = new Date(row[dateKey]);
      if (!isNaN(parsedDate.getTime())) {
        reviewDate = parsedDate;
      }
    }

    const contentHash = generateContentHash(product, reviewText);

    if (seenHashes.has(contentHash)) {
      duplicateCount++;
      return;
    }

    seenHashes.add(contentHash);
    validReviews.push({
      externalReviewId,
      source,
      product,
      rating,
      reviewText,
      author,
      reviewDate: reviewDate || new Date(),
      contentHash,
    });
  });

  return {
    validReviews,
    invalidCount,
    duplicateCount,
    errors,
  };
}
