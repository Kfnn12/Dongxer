import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://animekhor.org/page/1/?s=one%20piece').then(r => { 
  console.log('Success:', r.status);
}).catch(e => {
  console.log('Error:', e.response?.status);
})
