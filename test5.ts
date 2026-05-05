import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://animekhor.org/?s=naruto').then(r => {
  const $ = cheerio.load(r.data);
  console.log('listupd html:', $('.listupd').html()?.substring(0, 500));
}).catch(e => console.log('Error base:', e.message))
