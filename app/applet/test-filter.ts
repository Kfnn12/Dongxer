import axios from 'axios';
import * as cheerio from 'cheerio';

axios.get('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent('https://animekhor.org/')).then(r => {
  const $ = cheerio.load(r.data);
  console.log("Found Form");
  console.log($('form[action*="anime"]').html());
  console.log('Filters: ', $('.quickfilter').html() || $('.filter').html());
}).catch(e=>console.log(e.message));
