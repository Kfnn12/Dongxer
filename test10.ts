import axios from 'axios';
import * as cheerio from 'cheerio';

async function test(query: string) {
  try {
    const res = await axios.get('https://animekhor.org/page/1/', { params: { s: query } });
    const $ = cheerio.load(res.data);
    console.log(`Query "${query}": Found ${$('.bsx').length} results`);
  } catch(e: any) {
    console.log(`Error`, e.message);
  }
}

async function testEncoded(query: string) {
  try {
    const res = await axios.get(`https://animekhor.org/page/1/?s=${encodeURIComponent(query)}`);
    const $ = cheerio.load(res.data);
    console.log(`Query Encoded "${query}": Found ${$('.bsx').length} results`);
  } catch(e: any) {
    console.log(`Error Encoded`, e.message);
  }
}

test('demon slayer');
testEncoded('demon slayer');
