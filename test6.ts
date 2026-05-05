import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://animekhor.org/').then(r => {
  const $ = cheerio.load(r.data);
  console.log('search action:', $('form').attr('action'));
  console.log('search input name:', $('form input[type="text"]').attr('name'));
}).catch(e => console.log('Error base:', e.message))
