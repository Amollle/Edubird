import Parser from 'rss-parser';
import { getFallbackArticles } from '@/lib/mock-data';
import { type ArticleSource } from '@/lib/types';

const parser = new Parser();

const FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://www.npr.org/rss/rss.php?id=1001',
  'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'
];

type GNewsArticle = {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  image?: string;
  publishedAt?: string;
  source?: { name?: string; url?: string };
};

/**
 * Removes duplicate articles by normalized title and by link. News APIs and
 * RSS feeds frequently return the same story more than once (syndicated
 * across sources, or literally repeated within one response).
 */
function dedupeArticles(articles: ArticleSource[]): ArticleSource[] {
  const seenTitles = new Set<string>();
  const seenLinks = new Set<string>();
  const deduped: ArticleSource[] = [];

  for (const article of articles) {
    const titleKey = article.title.toLowerCase().trim();
    const linkKey = (article.link || '').toLowerCase().trim();

    if (titleKey && seenTitles.has(titleKey)) {
      continue;
    }
    if (linkKey && seenLinks.has(linkKey)) {
      continue;
    }

    seenTitles.add(titleKey);
    if (linkKey) {
      seenLinks.add(linkKey);
    }
    deduped.push(article);
  }

  return deduped;
}

async function searchGNews(topic: string): Promise<ArticleSource[] | null> {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.GNEWS_BASE_URL || 'https://gnews.io/api/v4';
  const endpoint = topic.trim() ? 'search' : 'top-headlines';
  const params = new URLSearchParams({
    apikey: apiKey,
    lang: 'en',
    max: '12'
  });

  if (topic.trim()) {
    params.set('q', topic.trim());
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${endpoint}?${params.toString()}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const articles: GNewsArticle[] = Array.isArray(data?.articles) ? data.articles : [];

    if (articles.length === 0) {
      return null;
    }

    return dedupeArticles(
      articles.map((article) => ({
        title: article.title || 'Untitled',
        link: article.url || '',
        source: article.source?.name || 'GNews',
        publishedAt: article.publishedAt || '',
        summary: article.description || article.content || '',
        imageUrl: article.image || undefined,
        category: undefined
      }))
    );
  } catch {
    return null;
  }
}

export async function searchNewsArticles(topic: string): Promise<ArticleSource[]> {
  const normalizedTopic = topic.trim().toLowerCase();

  const gnewsResults = await searchGNews(topic);
  if (gnewsResults && gnewsResults.length > 0) {
    return gnewsResults;
  }

  if (process.env.NEWS_API_BASE_URL) {
    const response = await fetch(
      `${process.env.NEWS_API_BASE_URL.replace(/\/$/, '')}/search?topic=${encodeURIComponent(topic)}`
    );

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.articles)) {
        return dedupeArticles(data.articles.map((article: ArticleSource) => article));
      }
    }
  }

  const results: ArticleSource[] = [];

  for (const feedUrl of FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items
        .map((item) => ({
          title: item.title || 'Untitled',
          link: item.link || '',
          source: feed.title || 'News Source',
          publishedAt: item.pubDate || '',
          summary: item.contentSnippet || item.content || '',
          imageUrl: undefined,
          category: undefined
        }))
        .filter((item) => {
          if (!normalizedTopic) {
            return true;
          }
          return (
            item.title.toLowerCase().includes(normalizedTopic) ||
            item.summary.toLowerCase().includes(normalizedTopic)
          );
        });

      results.push(...items);
    } catch {
      continue;
    }
  }

  const deduped = dedupeArticles(results).slice(0, 12);

  if (deduped.length > 0) {
    return deduped;
  }

  return getFallbackArticles(topic);
}
