import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://animekhor.org/page/1/?s=a').then(r => {
  const $ = cheerio.load(r.data);
  console.log('Results from page/1/?s=a:', $('.bsx').length);
}).catch(e => console.log('Error page/1:', e.message))

axios.get('https://animekhor.org/?s=a').then(r => {
  const $ = cheerio.load(r.data);
  console.log('Results from ?s=a:', $('.bsx').length);
}).catch(e => console.log('Error base:', e.message))
