/**
 * Update client photos with realistic, ethnicity-appropriate Unsplash portraits.
 * Uses Unsplash CDN URLs with face-crop parameters for consistent avatar sizing.
 *
 * Usage: cd backend && npx ts-node scripts/update-client-photos.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'safenest',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'safenest_db',
  },
});

// Unsplash base URL → append ?w=400&h=400&fit=crop&crop=face for square avatar
const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=400&h=400&fit=crop&crop=face`;

// ── Photo mapping: client full name → Unsplash photo ID ──────────────────────
const CLIENT_PHOTOS: Record<string, string> = {
  // Burmese / Karen refugees
  'Naw Htoo':          u('photo-1768017092992-4c2045cd668b'),   // SE Asian woman
  'Saw Ler':           u('photo-1543892693-f9782c2426d0'),      // East Asian man
  'Mu Paw':            u('photo-1742090284922-51107375d526'),    // SE Asian woman
  'Eh Soe':            u('photo-1768017093006-6a67c794d512'),    // SE Asian woman

  // Congolese refugees
  'Amani Bahati':      u('photo-1624395213081-608f51284ddd'),    // Black man
  'Esperance Mugisha': u('photo-1613588144367-8e6852b5425b'),    // Black woman
  'Jean-Pierre Kabeya':u('photo-1722328438141-08996254c3cd'),    // Black man

  // Afghan refugees
  'Fatima Ahmadi':     u('photo-1617942798594-3da7aafc372c'),    // Hijab woman
  'Mohammad Noori':    u('photo-1770096951056-c94a812e9fd4'),    // Middle Eastern man
  'Zahra Rahimi':      u('photo-1648779008391-2ce21253bb31'),    // Hijab woman
  'Ahmad Safi':        u('photo-1758874574397-e56dfcfc116d'),    // Middle Eastern man

  // Somali refugees
  'Halima Hassan':     u('photo-1729355796906-10a9809e0864'),    // Hijab woman
  'Abdi Mohamed':      u('photo-1632874768602-912642a25a4e'),    // Black man
  'Aisha Ibrahim':     u('photo-1667498235530-a34f91b76f33'),    // Hijab woman

  // African American single parents
  'Tamika Williams':   u('photo-1589403285392-5672147c4a69'),    // Black woman
  'DeAndre Jackson':   u('photo-1746519425654-9dd965ad1c17'),    // Black man
  'Crystal Davis':     u('photo-1573497019418-b400bb3ab074'),    // Black woman
  'Marcus Brown':      u('photo-1769636929354-59165ba73c7e'),    // Black man
  'Keisha Robinson':   u('photo-1552413538-097cbb5ab68a'),       // Black woman
  'Lakisha Carter':    u('photo-1573497491207-618cc224f243'),     // Black woman
  'Tanya Washington':  u('photo-1602177282000-235ad226ca4a'),     // Black woman
  'Angela Thompson':   u('photo-1548207775-a7676e36f20a'),       // Black woman

  // White / Caucasian single parents & veterans
  'Jessica Turner':    u('photo-1542974382-fb1a86417afb'),       // White woman
  'Brittany Moore':    u('photo-1774011211544-dfd53584118b'),    // White woman
  'James Patterson':   u('photo-1615862915913-b93d20d742a3'),    // White man
  'Robert Mitchell':   u('photo-1678649878435-fec3df591a01'),    // White man
  'Patricia Evans':    u('photo-1617791291756-582b2dce0b3e'),    // White woman
  'Diane Foster':      u('photo-1762522928601-862bf2a04902'),    // White woman

  // Hispanic / Latino single parents
  'Maria Garcia':      u('photo-1519965501869-1954ff18db96'),    // Latina woman
  'Carlos Hernandez':  u('photo-1633625763717-045645e9e739'),    // Latino man
  'Rosa Martinez':     u('photo-1692893164767-d6683dc47dd7'),    // Latina woman
  'Sofia Lopez':       u('photo-1548661211-e559d8c17537'),       // Latina woman
  'Miguel Santos':     u('photo-1542909168-6296a31d7689'),       // Latino man

  // South Asian
  'Priya Patel':       u('photo-1766031194778-4bc447bf6454'),    // Indian woman

  // East Asian
  'Yuki Tanaka':       u('photo-1554226755-b903fbf23de0'),       // Japanese woman
  'David Kim':         u('photo-1641573548584-ffb1c512e932'),    // Korean man

  // Vietnamese
  'Thanh Nguyen':      u('photo-1768017111274-050c79a1bc76'),    // Vietnamese woman
  'Linh Tran':         u('photo-1617187703472-9508e9d3d198'),    // Vietnamese woman

  // Eastern European
  'Olga Petrov':       u('photo-1542850016-81415d0c7b05'),       // Eastern Euro woman

  // Nigerian
  'Blessing Okonkwo':  u('photo-1612983133700-739c8f358334'),    // Nigerian woman
};

async function main() {
  console.log(`Connecting to: ${process.env.DB_NAME || 'safenest_db'}`);

  let updated = 0;
  let notFound = 0;

  for (const [fullName, photoUrl] of Object.entries(CLIENT_PHOTOS)) {
    const [firstName, ...lastParts] = fullName.split(' ');
    const lastName = lastParts.join(' ');

    const count = await db('clients')
      .where({ first_name: firstName, last_name: lastName })
      .update({ photo_url: photoUrl, updated_at: db.fn.now() });

    if (count > 0) {
      updated++;
      console.log(`  ✅ ${fullName}`);
    } else {
      notFound++;
      console.log(`  ⚠️  ${fullName} — not found in DB`);
    }
  }

  console.log(`\nDone: ${updated} updated, ${notFound} not found`);
  await db.destroy();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
