import sharp from 'sharp';
await sharp('public/media/v3/story/01-rivals-hero.webp')
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 85, mozjpeg: true }).toFile('public/og-image.jpg');
console.log('Prepared 1200x630 social preview.');
