/**
 * AWS OpenSearch client for academic content indexing.
 *
 * Uses @opensearch-project/opensearch with AWS SigV4 request signing.
 * Falls back gracefully when OPENSEARCH_URL is not set (local dev).
 *
 * Indices managed:
 *   academic-courses-v1          — all OCW courses
 *   academic-research-topics-v1  — all research topics
 */

import { logger as baseLogger } from './logger.js';

const logger = baseLogger.child({ module: 'opensearch-client' });

export interface CourseDoc {
  id: string;
  mit_course_num: string;
  title: string;
  description: string;
  level: string;
  discipline_id: string;
  discipline_name: string;
  specialization_id: string | null;
  specialization_name: string | null;
  instructors: string[];
  topics: string[];
  resource_types: string[];
  difficulty: number;
  hours_per_week: number;
  semester: string;
  year: number;
  url: string;
  indexed_at: string;
}

export interface TopicDoc {
  id: string;
  title: string;
  description: string;
  why_it_matters: string;
  discipline_id: string;
  discipline_name: string;
  key_skills: string[];
  open_questions: string[];
  career_paths: string[];
  difficulty: number;
  course_ids: string[];
  indexed_at: string;
}

// ─── Singleton client ─────────────────────────────────────────────────────────

let _client: unknown = null;

async function getClient() {
  if (_client) return _client as { index: Function; search: Function; bulk: Function };

  const url = process.env.OPENSEARCH_URL;
  if (!url) return null;

  try {
    // Dynamic imports to keep local dev working without AWS credentials
    const { Client } = await import('@opensearch-project/opensearch') as any;
    const { AwsSigv4Signer } = await import('@opensearch-project/opensearch/aws') as any;
    const { fromNodeProviderChain } = await import('@aws-sdk/credential-providers');

    _client = new Client({
      ...AwsSigv4Signer({
        region: process.env.AWS_REGION ?? 'us-east-1',
        service: 'es',
        getCredentials: fromNodeProviderChain(),
      }),
      node: url,
    });

    logger.info({ url }, 'OpenSearch client initialised');
    return _client as { index: Function; search: Function; bulk: Function };
  } catch (err) {
    logger.warn({ err }, 'OpenSearch client failed to initialise — indexing disabled');
    return null;
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export const COURSES_INDEX = 'academic-courses-v1';
export const TOPICS_INDEX  = 'academic-research-topics-v1';

export async function indexCourse(doc: CourseDoc): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.index({ index: COURSES_INDEX, id: doc.id, body: doc, refresh: false });
  } catch (err) {
    logger.error({ err, course_id: doc.id }, 'OpenSearch course index failed');
  }
}

export async function indexTopic(doc: TopicDoc): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.index({ index: TOPICS_INDEX, id: doc.id, body: doc, refresh: false });
  } catch (err) {
    logger.error({ err, topic_id: doc.id }, 'OpenSearch topic index failed');
  }
}

export async function bulkIndexCourses(docs: CourseDoc[]): Promise<void> {
  const client = await getClient();
  if (!client || docs.length === 0) return;
  try {
    const body = docs.flatMap(d => [
      { index: { _index: COURSES_INDEX, _id: d.id } },
      d,
    ]);
    const { body: resp } = await client.bulk({ body, refresh: false });
    if (resp.errors) {
      logger.warn({ errors: resp.items.filter((i: any) => i.index?.error) }, 'Some bulk index docs failed');
    } else {
      logger.info({ count: docs.length }, 'Bulk indexed courses to OpenSearch');
    }
  } catch (err) {
    logger.error({ err }, 'OpenSearch bulk course index failed');
  }
}

export async function searchCourses(query: string, opts: {
  discipline_id?: string; level?: string; size?: number;
} = {}): Promise<CourseDoc[]> {
  const client = await getClient();
  if (!client) return [];
  try {
    const must: unknown[] = [];
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'description', 'topics^2', 'mit_course_num^4', 'instructors'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }
    if (opts.discipline_id) must.push({ term: { discipline_id: opts.discipline_id } });
    if (opts.level)         must.push({ term: { level: opts.level } });

    const body = {
      size: opts.size ?? 20,
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      sort: must.length === 0 ? [{ difficulty: 'asc' }] : ['_score'],
    };

    const { body: resp } = await client.search({ index: COURSES_INDEX, body });
    return resp.hits.hits.map((h: any) => h._source as CourseDoc);
  } catch (err) {
    logger.error({ err }, 'OpenSearch course search failed');
    return [];
  }
}
