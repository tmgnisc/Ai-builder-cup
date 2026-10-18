/* eslint-disable @typescript-eslint/no-require-imports -- one-off CommonJS Node script */
const fs = require('fs');
const path = require('path');
const https = require('https');

const productsPath = path.resolve(__dirname, '../backend/app/data/products.json');
const fixturesPath = path.resolve(__dirname, '../backend/tests/fixtures/catalog.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const images = {
  "lenovo-ideapad-slim-5-14": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
  "acer-swift-go-14": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
  "lenovo-thinkpad-e14-g6": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80",
  "hp-pavilion-plus-14": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
  "msi-modern-14": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80",
  "hp-victus-15": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80",
  "asus-vivobook-15": "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80",
  "asus-tuf-a15": "https://images.unsplash.com/photo-1595327656903-2f54e37ce09b?auto=format&fit=crop&w=800&q=80",
  "lenovo-loq-15": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80",
  "apple-macbook-air-m3-13": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80",
  "apple-macbook-pro-14-m4-pro": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",

  "apple-iphone-16": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80",
  "apple-iphone-16-pro": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
  "google-pixel-9": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
  "samsung-galaxy-s24-fe": "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=80",
  "oneplus-13r": "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80",
  "samsung-galaxy-a55": "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80",
  "xiaomi-redmi-note-14-pro-plus": "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80",
  "nothing-phone-3a": "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80",

  "sony-wh-1000xm5": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
  "bose-qc-ultra-headphones": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
  "sennheiser-momentum-4": "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80",
  "apple-airpods-pro-2": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80",
  "samsung-galaxy-buds3-pro": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80",
  "jbl-tune-770nc": "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80",
  "soundcore-liberty-4-nc": "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=800&q=80",

  "logitech-mx-master-3s": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80",
  "keychron-k2-v2": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
  "anker-737-power-bank": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80",
  "samsung-t7-1tb": "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80",
  "dell-s2722qc": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
  "ugreen-nexode-100w": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",

  "persona-basics-crew-tee": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
  "persona-basics-pique-polo": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80",
  "himal-threads-linen-shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80",
  "himal-threads-flannel-overshirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80",
  "persona-basics-zip-hoodie": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
  "kathmandu-loom-denim-jacket": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80",
  "himal-threads-down-puffer": "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=800&q=80",
  "kathmandu-loom-cotton-kurta": "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=800&q=80",
  "kathmandu-loom-dhaka-topi": "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80",
  "persona-basics-baseball-cap": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80",
  "persona-basics-aviator-sunglasses": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80",
  "himal-threads-pashmina-shawl": "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80"
};

for (const product of products) {
  if (images[product.id]) {
    product.image = images[product.id];
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');
console.log('Updated products.json with real images.');

if (fs.existsSync(fixturesPath)) {
  fs.writeFileSync(fixturesPath, JSON.stringify(products, null, 2), 'utf8');
  console.log('Updated catalog.json fixture.');
}

const downloadImage = (url, dest) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      return resolve();
    }
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => file.close(resolve));
        }).on('error', reject);
      } else if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      } else {
        reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
      }
    }).on('error', reject);
  });
};

async function downloadAll() {
  const publicDir = path.resolve(__dirname, '../public/images/products');
  fs.mkdirSync(publicDir, { recursive: true });
  for (const [id, url] of Object.entries(images)) {
    const dest = path.join(publicDir, `${id}.jpg`);
    try {
      await downloadImage(url, dest);
      console.log(`Saved ${id}.jpg`);
    } catch (err) {
      console.warn(`Could not download ${id}:`, err.message);
    }
  }
}

downloadAll();
