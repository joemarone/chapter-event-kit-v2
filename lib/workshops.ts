import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

export type Workshop = {
  slug: string;
  title: string;
  oneLiner: string;
  category: string;
  ages: string;
  duration: number;
  groupSize: string;
  skills: string[];
  popular: boolean;
  audioMood?: 'workshop' | 'build' | 'showtime';
  bodyHtml: string;
  bodyMarkdown: string;
};

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'workshops');

function readMarkdown(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function toHtmlSync(md: string): string {
  // synchronous enough for build time — remark is ESM but processSync works here
  return remark().use(html).processSync(md).toString();
}

export function getAllWorkshopSlugs(): string[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function getWorkshopBySlug(slug: string): Workshop | null {
  const filePath = path.join(CONTENT_ROOT, slug, 'workshop.md');
  if (!fs.existsSync(filePath)) return null;

  const raw = readMarkdown(filePath);
  const { data, content } = matter(raw);

  return {
    slug: data.slug || slug,
    title: data.title || slug,
    oneLiner: data.oneLiner || '',
    category: data.category || '',
    ages: data.ages || '',
    duration: data.duration || 90,
    groupSize: data.groupSize || '8-12',
    skills: data.skills || [],
    popular: !!data.popular,
    audioMood: data.audioMood,
    bodyMarkdown: content,
    bodyHtml: toHtmlSync(content)
  };
}

export function getAllWorkshops(): Workshop[] {
  return getAllWorkshopSlugs()
    .map((slug) => getWorkshopBySlug(slug))
    .filter((w): w is Workshop => w !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getRunOfShow(slug: string): string {
  return readMarkdown(path.join(CONTENT_ROOT, slug, 'run-of-show.md'));
}

export function getMaterials(slug: string): string {
  return readMarkdown(path.join(CONTENT_ROOT, slug, 'materials.md'));
}
