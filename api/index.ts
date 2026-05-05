import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();

app.use(cors());

// 1. Get Latest Releases
app.get('/api/latest', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const response = await axios.get(`https://animekhor.org/page/${page}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
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
    const response = await axios.get(`https://animekhor.org/page/${page}/`, {
      params: { s: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
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
    let response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    let $ = cheerio.load(response.data);
    
    // If it's an episode page, find the anime link from breadcrumbs and fetch that instead
    const breadcrumbs = $('.ts-breadcrumb a').map((i, el) => $(el).attr('href')).get();
    if (breadcrumbs.length >= 2 && breadcrumbs[1] && breadcrumbs[1].includes('/anime/')) {
       url = breadcrumbs[1];
       response = await axios.get(url, {
         headers: {
           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
         }
       });
       $ = cheerio.load(response.data);
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
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
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
