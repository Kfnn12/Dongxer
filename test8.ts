import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://animekhor.org/page/1/?s=a').then(r => { 
  const $ = cheerio.load(r.data); 
  console.log($('.pagination .next').length); 
})
