import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();

app.use(cors());

async function fetchHtml(url: string, params?: any): Promise<string> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  try {
    const response = await axios.get(url, { params, headers });
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && (error.response?.status === 503 || error.response?.status === 403 || error.response?.status === 502 || error.response?.status === 522)) {
      let finalUrl = url;
      if (params) {
        const urlObj = new URL(url);
        Object.keys(params).forEach(key => urlObj.searchParams.append(key, params[key]));
        finalUrl = urlObj.toString();
      }
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${finalUrl}`;
      const proxyResponse = await axios.get(proxyUrl);
      return proxyResponse.data;
    }
    throw error;
  }
}

// 1. Get Latest Releases
app.get('/api/latest', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const html = await fetchHtml(`https://animekhor.org/page/${page}/`);
    const $ = cheerio.load(html);
    
    const items: any[] = [];
    $('.bsx').each((i, el) => {
      const a = $(el).find('a');
      const title = a.attr('title') || $(el).find('h2').text();
      const link = a.attr('href');
      const img = $(el).find('img').attr('src');
      const ep = $(el).find('.epx').text();
      
      if (title && link) {
        items.push({ title, link, img, ep });
      }
    });
    
    res.json({ success: true, results: items });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({ success: false, message: `Failed to fetch latest anime: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: `An unexpected error occurred: ${error.message}` });
    }
  }
});

// 2. Search
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    const page = req.query.page || 1;
    if (!query) {
      res.status(400).json({ success: false, message: 'Missing query parameter q' });
      return;
    }
    const html = await fetchHtml(`https://animekhor.org/page/${page}/`, { s: query });
    const $ = cheerio.load(html);
    
    const items: any[] = [];
    $('.bsx').each((i, el) => {
      const a = $(el).find('a');
      const title = a.attr('title') || $(el).find('h2').text() || $(el).find('.tt').text().trim();
      const link = a.attr('href');
      const img = $(el).find('img').attr('src');
      const type = $(el).find('.typez').text();
      
      if (title && link) {
        items.push({ title, link, img, type });
      }
    });

    const hasNextPage = $('.pagination .next').length > 0;
    
    res.json({ success: true, results: items, hasNextPage });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // 404 usually means no results or page out of bounds
        res.json({ success: true, results: [], hasNextPage: false });
      } else {
        res.status(error.response?.status || 500).json({ success: false, message: `Failed to search anime: ${error.message}` });
      }
    } else {
      res.status(500).json({ success: false, message: `An unexpected error occurred: ${error.message}` });
    }
  }
});

// 3. Info / Episode List
app.get('/api/info', async (req, res) => {
  try {
    let url = req.query.url as string;
    if (!url) {
      res.status(400).json({ success: false, message: 'Missing url parameter' });
      return;
    }
    let html = await fetchHtml(url);
    let $ = cheerio.load(html);
    
    // If it's an episode page, find the anime link from breadcrumbs and fetch that instead
    const breadcrumbs = $('.ts-breadcrumb a').map((i, el) => $(el).attr('href')).get();
    if (breadcrumbs.length >= 2 && breadcrumbs[1] && breadcrumbs[1].includes('/anime/')) {
       url = breadcrumbs[1];
       html = await fetchHtml(url);
       $ = cheerio.load(html);
    }
    
    const title = $('.entry-title').text() || $('h1[itemprop="name"]').text();
    const poster = $('.thumb img').attr('src');
    const description = $('.entry-content').text().trim() || $('div[itemprop="description"]').text().trim();
    
    const genres = $('.genxed a').map((i, el) => $(el).text()).get();
    
    const episodes: any[] = [];
    $('.eplister ul li').each((i, el) => {
      episodes.push({
        num: $(el).find('.epl-num').text(),
        title: $(el).find('.epl-title').text(),
        date: $(el).find('.epl-date').text(),
        link: $(el).find('a').attr('href')
      });
    });
    
    // Reverse episodes so they default to Oldest -> Newest order (natural left-to-right progression)
    episodes.reverse();
    
    let requestedIndex = -1;
    if (req.query.url !== url) { // It means we redirected from an episode to anime page
      requestedIndex = episodes.findIndex((e: any) => e.link === req.query.url);
    }
    
    res.json({ success: true, info: { title, poster, description, genres, episodes, requestedIndex } });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({ success: false, message: `Failed to fetch anime details: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: `An unexpected error occurred: ${error.message}` });
    }
  }
});

// 4. Watch / Get Stream Iframe
app.get('/api/watch', async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ success: false, message: 'Missing url parameter' });
      return;
    }
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    let servers: { name: string, iframe: string }[] = [];
    
    // Parse the multiple servers from option values
    $('.mobius option').each((i, el) => {
      const val = $(el).attr('value');
      const text = $(el).text().trim();
      if (val && text && text !== 'Select Video Server') {
        try {
          const decoded = Buffer.from(val, 'base64').toString('utf-8');
          const iframeMatch = decoded.match(/src=['"]([^'"]+)['"]/i);
          if (iframeMatch && iframeMatch[1]) {
            let src = iframeMatch[1];
            if (src.startsWith('//')) {
              src = 'https:' + src;
            }
            servers.push({ name: text, iframe: src });
          }
        } catch (e) {
          // ignore parsing error for this option
        }
      }
    });
    
    // Fallback if no base64 options found
    if (servers.length === 0) {
      $('iframe').each((i, el) => {
        let src = $(el).attr('src');
        if (src && !src.includes('a-ads.com') && !src.includes('ads')) {
          if (src.startsWith('//')) {
            src = 'https:' + src;
          }
          servers.push({ name: `Server ${i + 1}`, iframe: src });
        }
      });
    }
    
    // Sort "Ads Free" servers higher
    servers.sort((a, b) => {
      const aFree = a.name.toLowerCase().includes('ads free');
      const bFree = b.name.toLowerCase().includes('ads free');
      if (aFree && !bFree) return -1;
      if (!aFree && bFree) return 1;
      return 0;
    });
    
    let iframeUrl = servers.length > 0 ? servers[0].iframe : '';
    
    res.json({ success: true, stream: { iframe: iframeUrl }, servers });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({ success: false, message: `Failed to fetch episode stream: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: `An unexpected error occurred: ${error.message}` });
    }
  }
});

export default app;
