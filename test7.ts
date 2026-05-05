import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://animekhor.org/').then(r => {
  const $ = cheerio.load(r.data);
  const titles: string[] = [];
  $('.bsx h2').each((i, el) => titles.push($(el).text()));
  console.log('titles:', titles.slice(0, 5));
}).catch(e => console.log('Error base:', e.message))
