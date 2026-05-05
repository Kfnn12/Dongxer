import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://animekhor.org/?s=a').then(r => {
  const $ = cheerio.load(r.data);
  console.log('Results', $('.bsx').length);
  console.log('Pagination HTML', $('.pagination').html() || 'None');
}).catch(e => console.log('Error', e.message))
