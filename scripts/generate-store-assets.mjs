import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'store-assets');
mkdirSync(outDir, { recursive: true });

/* ── Icon 512×512 ───────────────────────────────────────────── */
const ICON_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D0B1E"/>
      <stop offset="100%" stop-color="#1A0538"/>
    </linearGradient>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1B6FA8"/>
      <stop offset="100%" stop-color="#0A2E5E"/>
    </linearGradient>
    <linearGradient id="rg" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B6FA8"/>
      <stop offset="100%" stop-color="#0A2E5E"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="55%">
      <stop offset="0%" stop-color="#00BFFF" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#00BFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- Glow halo -->
  <ellipse cx="256" cy="300" rx="220" ry="200" fill="url(#glow)"/>

  <!-- Trachea -->
  <line x1="256" y1="82" x2="256" y2="192" stroke="#7AACC8" stroke-width="13" stroke-linecap="round"/>
  <!-- Left bronchus -->
  <path d="M 256 190 Q 210 207 168 220" stroke="#7AACC8" stroke-width="10" stroke-linecap="round" fill="none"/>
  <!-- Right bronchus -->
  <path d="M 256 190 Q 302 207 344 220" stroke="#7AACC8" stroke-width="10" stroke-linecap="round" fill="none"/>

  <!-- Animated airflow dashes left -->
  <path d="M 256 82 L 256 190 Q 210 207 168 220" stroke="#00E5FF" stroke-width="3"
    stroke-linecap="round" fill="none" stroke-dasharray="7 15" opacity="0.7"/>
  <!-- Animated airflow dashes right -->
  <path d="M 256 82 L 256 190 Q 302 207 344 220" stroke="#00E5FF" stroke-width="3"
    stroke-linecap="round" fill="none" stroke-dasharray="7 15" opacity="0.7"/>

  <!-- Left lung -->
  <path d="M 168 220 C 138 212,92 230,76 272 C 60 314,66 364,88 400 C 105 430,136 442,167 438
           C 195 434,212 410,214 383 C 218 344,216 298,214 256 C 212 232,200 210,168 220 Z"
    fill="url(#lg)" stroke="#2468AE" stroke-width="2.5" opacity="0.95"/>
  <!-- Left lung cyan air overlay -->
  <path d="M 168 220 C 138 212,92 230,76 272 C 60 314,66 364,88 400 C 105 430,136 442,167 438
           C 195 434,212 410,214 383 C 218 344,216 298,214 256 C 212 232,200 210,168 220 Z"
    fill="#0A9060" opacity="0.28"/>

  <!-- Right lung -->
  <path d="M 344 220 C 374 212,420 230,436 272 C 452 314,446 364,424 400 C 407 430,376 442,345 438
           C 317 434,300 410,298 383 C 294 344,296 298,298 256 C 300 232,312 210,344 220 Z"
    fill="url(#rg)" stroke="#2468AE" stroke-width="2.5" opacity="0.95"/>
  <!-- Right lung cyan air overlay -->
  <path d="M 344 220 C 374 212,420 230,436 272 C 452 314,446 364,424 400 C 407 430,376 442,345 438
           C 317 434,300 410,298 383 C 294 344,296 298,298 256 C 300 232,312 210,344 220 Z"
    fill="#0A9060" opacity="0.28"/>

  <!-- Left internal airways -->
  <path d="M 168 220 Q 158 252 150 285" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.55"/>
  <path d="M 168 220 Q 182 242 186 272" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.55"/>
  <!-- Right internal airways -->
  <path d="M 344 220 Q 354 252 362 285" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.55"/>
  <path d="M 344 220 Q 330 242 326 272" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.55"/>

  <!-- Trachea top glow dot -->
  <circle cx="256" cy="82" r="9" fill="#00E5FF" opacity="0.7"/>
  <circle cx="256" cy="82" r="18" fill="#00E5FF" opacity="0.12"/>
</svg>`;

/* ── Feature Graphic 1024×500 ───────────────────────────────── */
const FEATURE_SVG = `
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0D0B1E"/>
      <stop offset="55%" stop-color="#0D0B2A"/>
      <stop offset="100%" stop-color="#1A0538"/>
    </linearGradient>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1B6FA8"/>
      <stop offset="100%" stop-color="#0A2E5E"/>
    </linearGradient>
    <linearGradient id="rg" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B6FA8"/>
      <stop offset="100%" stop-color="#0A2E5E"/>
    </linearGradient>
    <radialGradient id="glow" cx="35%" cy="52%">
      <stop offset="0%" stop-color="#00BFFF" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#00BFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#EEEEFF"/>
      <stop offset="100%" stop-color="#AAAADD"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="500" fill="url(#bg)"/>
  <!-- Glow -->
  <ellipse cx="310" cy="260" rx="260" ry="230" fill="url(#glow)"/>
  <!-- Subtle grid lines -->
  <line x1="520" y1="0" x2="520" y2="500" stroke="#FFFFFF" stroke-width="0.5" opacity="0.04"/>
  <line x1="0" y1="250" x2="520" y2="250" stroke="#FFFFFF" stroke-width="0.5" opacity="0.04"/>

  <!-- ── LUNG ILLUSTRATION (left panel) ── -->
  <g transform="translate(60, 20) scale(0.9)">
    <!-- Trachea -->
    <line x1="256" y1="82" x2="256" y2="192" stroke="#7AACC8" stroke-width="12" stroke-linecap="round"/>
    <!-- Left bronchus -->
    <path d="M 256 190 Q 210 207 168 220" stroke="#7AACC8" stroke-width="9" stroke-linecap="round" fill="none"/>
    <!-- Right bronchus -->
    <path d="M 256 190 Q 302 207 344 220" stroke="#7AACC8" stroke-width="9" stroke-linecap="round" fill="none"/>
    <!-- Airflow left -->
    <path d="M 256 82 L 256 190 Q 210 207 168 220" stroke="#00E5FF" stroke-width="2.5"
      stroke-linecap="round" fill="none" stroke-dasharray="6 14" opacity="0.65"/>
    <!-- Airflow right -->
    <path d="M 256 82 L 256 190 Q 302 207 344 220" stroke="#00E5FF" stroke-width="2.5"
      stroke-linecap="round" fill="none" stroke-dasharray="6 14" opacity="0.65"/>
    <!-- Left lung -->
    <path d="M 168 220 C 138 212,92 230,76 272 C 60 314,66 364,88 400 C 105 430,136 442,167 438
             C 195 434,212 410,214 383 C 218 344,216 298,214 256 C 212 232,200 210,168 220 Z"
      fill="url(#lg)" stroke="#2468AE" stroke-width="2" opacity="0.95"/>
    <path d="M 168 220 C 138 212,92 230,76 272 C 60 314,66 364,88 400 C 105 430,136 442,167 438
             C 195 434,212 410,214 383 C 218 344,216 298,214 256 C 212 232,200 210,168 220 Z"
      fill="#0A9060" opacity="0.3"/>
    <!-- Right lung -->
    <path d="M 344 220 C 374 212,420 230,436 272 C 452 314,446 364,424 400 C 407 430,376 442,345 438
             C 317 434,300 410,298 383 C 294 344,296 298,298 256 C 300 232,312 210,344 220 Z"
      fill="url(#rg)" stroke="#2468AE" stroke-width="2" opacity="0.95"/>
    <path d="M 344 220 C 374 212,420 230,436 272 C 452 314,446 364,424 400 C 407 430,376 442,345 438
             C 317 434,300 410,298 383 C 294 344,296 298,298 256 C 300 232,312 210,344 220 Z"
      fill="#0A9060" opacity="0.3"/>
    <!-- Airways -->
    <path d="M 168 220 Q 158 252 150 285" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.5"/>
    <path d="M 168 220 Q 182 242 186 272" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.5"/>
    <path d="M 344 220 Q 354 252 362 285" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.5"/>
    <path d="M 344 220 Q 330 242 326 272" stroke="#2A7FCE" stroke-width="2" fill="none" opacity="0.5"/>
    <!-- Top glow -->
    <circle cx="256" cy="82" r="8" fill="#00E5FF" opacity="0.7"/>
    <circle cx="256" cy="82" r="16" fill="#00E5FF" opacity="0.12"/>
  </g>

  <!-- Vertical divider -->
  <line x1="530" y1="60" x2="530" y2="440" stroke="#2A2A5A" stroke-width="1"/>

  <!-- ── RIGHT PANEL: Text ── -->
  <!-- App name -->
  <text x="572" y="168" font-family="Arial Black, Arial, sans-serif"
    font-size="72" font-weight="900" fill="url(#titleGrad)" letter-spacing="-1">Breathe</text>
  <text x="572" y="252" font-family="Arial Black, Arial, sans-serif"
    font-size="72" font-weight="900" fill="#00E5FF" letter-spacing="-1">Easy</text>

  <!-- Divider -->
  <line x1="572" y1="276" x2="970" y2="276" stroke="#2A2A5A" stroke-width="1.5"/>

  <!-- Tagline -->
  <text x="572" y="314" font-family="Arial, sans-serif" font-size="21" fill="#8888BB">Guided breathing with animated</text>
  <text x="572" y="342" font-family="Arial, sans-serif" font-size="21" fill="#8888BB">lung anatomy · 4-phase box breathing</text>

  <!-- Phase pills -->
  <rect x="572" y="374" width="80" height="28" rx="14" fill="#00E5FF" fill-opacity="0.12" stroke="#00E5FF" stroke-width="1"/>
  <text x="612" y="393" font-family="Arial, sans-serif" font-size="14" fill="#00E5FF" text-anchor="middle">Inhale</text>

  <rect x="664" y="374" width="70" height="28" rx="14" fill="#FFD700" fill-opacity="0.12" stroke="#FFD700" stroke-width="1"/>
  <text x="699" y="393" font-family="Arial, sans-serif" font-size="14" fill="#FFD700" text-anchor="middle">Hold</text>

  <rect x="746" y="374" width="80" height="28" rx="14" fill="#B040FF" fill-opacity="0.12" stroke="#B040FF" stroke-width="1"/>
  <text x="786" y="393" font-family="Arial, sans-serif" font-size="14" fill="#B040FF" text-anchor="middle">Exhale</text>

  <rect x="838" y="374" width="65" height="28" rx="14" fill="#9E9E9E" fill-opacity="0.12" stroke="#9E9E9E" stroke-width="1"/>
  <text x="870" y="393" font-family="Arial, sans-serif" font-size="14" fill="#9E9E9E" text-anchor="middle">Rest</text>

  <!-- Bottom tagline -->
  <text x="572" y="452" font-family="Arial, sans-serif" font-size="15" fill="#444466" letter-spacing="2">FREE  ·  OFFLINE  ·  NO ADS  ·  NO ACCOUNT</text>
</svg>`;

/* ── Generate files ─────────────────────────────────────────── */
console.log('Generating icon-512.png ...');
await sharp(Buffer.from(ICON_SVG))
  .resize(512, 512)
  .flatten({ background: '#0D0B1E' })
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, 'icon-512.png'));
console.log('  ✓ store-assets/icon-512.png');

console.log('Generating feature-1024x500.png ...');
await sharp(Buffer.from(FEATURE_SVG))
  .resize(1024, 500)
  .flatten({ background: '#0D0B1E' })
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, 'feature-1024x500.png'));
console.log('  ✓ store-assets/feature-1024x500.png');

console.log('\nDone. Upload these to Play Console → Store listing.');
