import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const baseURL = 'http://localhost:3000';

async function testPractice() {
  // Login with existing user
  const loginRes = await axios.post(`${baseURL}/api/auth/login`, {
    email: 'jatingautam2205@gmail.com',
    password: 'Jatingautam1409' // Try this common password
  }, { validateStatus: () => true });
  
  console.log('Login attempt status:', loginRes.status, loginRes.data?.success ? 'OK' : loginRes.data?.error);
  
  const setCookie = loginRes.headers['set-cookie'];
  const tokenCookie = setCookie ? setCookie.find(c => c.startsWith('token=')) : null;
  
  if (!tokenCookie) {
    console.log('No cookie - trying with existing kit ID directly (no auth)');
  }
  
  const authHeaders = tokenCookie ? { headers: { Cookie: tokenCookie } } : {};
  
  // Fetch kits to find an existing one  
  const kitsRes = await axios.get(`${baseURL}/api/kits`, { ...authHeaders, validateStatus: () => true });
  console.log('Kits:', kitsRes.status, 'Count:', kitsRes.data.kits?.length);
  
  const kit = kitsRes.data.kits?.[0];
  if (!kit) {
    console.log('No kits found, cannot test practice');
    return;
  }
  
  const kitId = kit.id || kit._id;
  const cardId = kit.flashcards?.[0]?.id;
  
  console.log('Testing Practice with Kit ID:', kitId, 'Card ID:', cardId);
  
  // GET practice deck
  const getRes = await axios.get(`${baseURL}/api/practice/${kitId}`, { ...authHeaders, validateStatus: () => true });
  console.log('GET practice deck status:', getRes.status, 'Cards:', getRes.data.flashcards?.length);
  
  // POST confidence rating
  const postRes = await axios.post(`${baseURL}/api/practice/${kitId}`, {
    cardId: cardId || getRes.data.flashcards?.[0]?.id,
    confidenceRating: 4
  }, { ...authHeaders, validateStatus: () => true });
  
  console.log('POST practice confidence status:', postRes.status);
  if (postRes.status !== 200) {
    console.log('Error:', JSON.stringify(postRes.data, null, 2));
  } else {
    console.log('Practice progress saved:', postRes.data.success);
  }
}

testPractice().catch(err => {
  if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
    console.error('Server connection error:', err.code);
  } else {
    console.error(err.message);
  }
});
