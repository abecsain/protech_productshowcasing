const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

const candidates = [
  'protechenterprices',
  'protech-enterprises',
  'protechenterprises',
  'abecsain',
  'protech',
  'dprotech',
];

async function check(name: string) {
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${name}/ping`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const text = await res.text();
    console.log(`Cloud "${name}": status=${res.status}, body=${text}`);
    return res.status === 200;
  } catch (e: any) {
    console.log(`Cloud "${name}" error:`, e.message);
    return false;
  }
}

async function run() {
  for (const c of candidates) {
    if (await check(c)) {
      console.log('FOUND VALID CLOUD NAME:', c);
      break;
    }
  }
}

run();
