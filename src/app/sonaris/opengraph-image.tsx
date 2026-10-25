import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const alt = 'SONARIS — camera-free rover with a tilting S2 30 m 2D LiDAR';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function SocialPreview() {
  const asset = async (name: string) => `data:image/png;base64,${(await readFile(path.join(process.cwd(), 'public/sonaris/brand', name))).toString('base64')}`;
  const [rover, wordmark] = await Promise.all([asset('rover.png'), asset('wordmark.png')]);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#000000', color: '#f3e9dd', padding: 48, alignItems: 'center', borderBottom: '14px solid #991f1f' }}>
      {/* ImageResponse requires native image elements. */}
      <img src={rover} width={480} height={480} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column', width: 570, paddingLeft: 32 }}>
        <img src={wordmark} width={540} height={180} style={{ objectFit: 'contain' }} alt="SONARIS" />
        <div style={{ display: 'flex', fontSize: 28, marginTop: 28 }}>Camera-free indoor spatial capture</div>
        <div style={{ display: 'flex', fontSize: 22, color: '#dacabd', marginTop: 18 }}>Tilting S2 30 m 2D LiDAR</div>
      </div>
    </div>, size,
  );
}
