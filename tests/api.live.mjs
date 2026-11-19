import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';

const DEV_BASE = 'http://127.0.0.1:8080';

function buildTextPdf(pagesText) {
  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = addObj('');
  const pagesId = addObj('');
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];

  for (const lines of pagesText) {
    const ops = ['BT', '/F1 11 Tf', '50 750 Td'];
    for (const line of lines) {
      const safe = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      ops.push(`(${safe}) Tj`);
      ops.push('0 -16 Td');
    }
    ops.push('ET');
    const stream = ops.join('\n');
    const contentId = addObj(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

function buildZip(entries) {
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c >>> 0;
  }
  const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };

  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const compressed = zlib.deflateRawSync(dataBuf);
    const crc = crc32(dataBuf);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(dataBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    locals.push(local, compressed);
    centrals.push(central);
    offset += local.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

function buildDocx(paragraphs) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = paragraphs.map((p) => `<w:p><w:r><w:t>${esc(p)}</w:t></w:r></w:p>`).join('');
  return buildZip([
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      name: 'word/document.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
    },
  ]);
}

async function uploadFile(baseUrl, filename, buffer, mimeType) {
  const form = new FormData();
  form.append('resume', new Blob([buffer], { type: mimeType }), filename);
  const res = await fetch(`${baseUrl}/api/resume/parse`, { method: 'POST', body: form });
  const json = await res.json();
  return { status: res.status, json };
}

async function run() {
  console.log('1) Checking live dev proxy /api/health...');
  const healthRes = await fetch(`${DEV_BASE}/api/health`);
  assert.equal(healthRes.status, 200);
  assert.match(healthRes.headers.get('cache-control') || '', /no-store/i);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.ok, true);
  console.log('   OK:', healthJson);

  console.log('2) Running 8 consecutive resume uploads against live server (PDF #1..#3, DOCX, TXT)...');
  const uploads = [
    {
      name: 'upload1_qa.pdf',
      mime: 'application/pdf',
      buf: buildTextPdf([[
        'Aarav Sharma - QA Automation Candidate',
        'Education: B.Tech Computer Science, Apex Institute (2022-2026)',
        'Skills: Python, Playwright, Selenium, PyTest, Docker, Git',
        'Projects: Automated E2E Checkout Suite using Playwright and PyTest',
      ]]),
      expectSkill: 'Python',
    },
    {
      name: 'upload2_cloud.pdf',
      mime: 'application/pdf',
      buf: buildTextPdf([[
        'Devika Iyer - Cloud & DevOps Engineer',
        'Education: B.Tech Electronics & CS',
        'Skills: AWS, Kubernetes, Terraform, Linux, CI/CD',
        'Projects: Multi-Region Kubernetes Terraform Infrastructure',
      ]]),
      expectSkill: 'Kubernetes',
    },
    {
      name: 'upload3_backend.pdf',
      mime: 'application/pdf',
      buf: buildTextPdf([[
        'Kabir Mehta - Backend Platform Engineer',
        'Education: M.Tech Distributed Systems',
        'Skills: FastAPI, PostgreSQL, Redis, Docker, Python',
        'Projects: Event-driven FastAPI Ledger Service',
      ]]),
      expectSkill: 'FastAPI',
    },
    {
      name: 'upload4_fullstack.docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buf: buildDocx([
        'Priya Nair — Full Stack Engineer',
        'Education: B.E. Information Science',
        'Skills: TypeScript, React, Node.js, PostgreSQL, Redis, Docker',
        'Experience: Software Engineering Intern at FinStack',
      ]),
      expectSkill: 'TypeScript',
    },
    {
      name: 'upload5_data.txt',
      mime: 'text/plain',
      buf: Buffer.from(
        'Rohan Verma\nEducation: B.Sc Data Analytics\nSkills: SQL, Python, Pandas, Power BI, Tableau\nProjects: Retail Cohort Retention Dashboard\nCertifications: Google Data Analytics Certificate',
        'utf8'
      ),
      expectSkill: 'Pandas',
    },
    {
      name: 'upload6_cloud_multipage.pdf',
      mime: 'application/pdf',
      buf: buildTextPdf([
        ['Ananya Roy - Site Reliability Engineer', 'Education: B.Tech CS', 'Skills: Terraform, Kubernetes, Linux, Bash'],
        ['Projects: Automated Incident Runbooks', 'Certifications: CKA Kubernetes Administrator'],
      ]),
      expectSkill: 'Terraform',
    },
    {
      name: 'upload7_ai.docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buf: buildDocx([
        'Vikram Rao — Applied AI Engineer',
        'Education: M.Tech Artificial Intelligence',
        'Skills: Python, PyTorch, LangChain, LLM, RAG, FastAPI',
        'Projects: Citation-Grounded Academic RAG Assistant with pgvector',
      ]),
      expectSkill: 'PyTorch',
    },
    {
      name: 'upload8_swe.txt',
      mime: 'text/plain',
      buf: Buffer.from(
        'Sneha Rao\nEducation: B.Tech Software Engineering\nSkills: Java, Spring Boot, Microservices, Docker, PostgreSQL, Git\nExperience: Backend Developer Intern',
        'utf8'
      ),
      expectSkill: 'Java',
    },
  ];

  for (let i = 0; i < uploads.length; i++) {
    const u = uploads[i];
    const { status, json } = await uploadFile(DEV_BASE, u.name, u.buf, u.mime);
    assert.equal(status, 200, `Upload ${i + 1} (${u.name}) failed with ${status}: ${JSON.stringify(json)}`);
    assert.ok(json.extractedCharacters > 0);
    assert.ok(json.analysis && Array.isArray(json.analysis.skillCandidates));
    assert.equal(json.fileName, u.name);
    const names = json.analysis.skillCandidates.map((s) => s.name);
    assert.ok(
      names.some((n) => n.toLowerCase().includes(u.expectSkill.toLowerCase())),
      `Upload ${i + 1} (${u.name}) missing expected skill ${u.expectSkill}. Got: ${names.join(', ')}`
    );
    console.log(`   [${i + 1}/${uploads.length}] ${u.name} -> HTTP 200 (${names.length} skills extracted, mode=${json.mode})`);
  }

  console.log('3) Verifying error handling (400 unsupported, 422 blank PDF, 422 0-byte, 400 missing field, 404 JSON)...');
  const badImg = await uploadFile(DEV_BASE, 'photo.png', Buffer.from('not-a-resume'), 'image/png');
  assert.equal(badImg.status, 400);
  assert.equal(badImg.json.code, 'UNSUPPORTED_FILE');

  const blankMultiPdf = await uploadFile(DEV_BASE, 'scanned_blank.pdf', buildTextPdf([[''], [''], ['']]), 'application/pdf');
  assert.equal(blankMultiPdf.status, 422);
  assert.equal(blankMultiPdf.json.code, 'EMPTY_DOCUMENT');

  const zeroByte = await uploadFile(DEV_BASE, 'empty.pdf', Buffer.alloc(0), 'application/pdf');
  assert.equal(zeroByte.status, 422);
  assert.equal(zeroByte.json.code, 'EMPTY_DOCUMENT');

  const missingFieldRes = await fetch(`${DEV_BASE}/api/resume/parse`, { method: 'POST', body: new FormData() });
  assert.equal(missingFieldRes.status, 400);
  const missingJson = await missingFieldRes.json();
  assert.equal(missingJson.code, 'NO_FILE');

  const api404Res = await fetch(`${DEV_BASE}/api/nonexistent-endpoint`);
  assert.equal(api404Res.status, 404);
  const api404Json = await api404Res.json();
  assert.equal(api404Json.code, 'SERVER_ERROR');
  assert.match(api404Json.error, /not found/i);
  console.log('   All error status codes verified.');

  console.log('4) Testing production server (NODE_ENV=production node server.ts) across all 7 SPA routes...');
  const prodPort = 3008;
  const prodProc = spawn('./node_modules/.bin/tsx', ['server.ts'], {
    env: { ...process.env, NODE_ENV: 'production', PORT: String(prodPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Prod server start timeout')), 10000);
      prodProc.stdout.on('data', (chunk) => {
        if (String(chunk).includes(`:${prodPort}`)) {
          clearTimeout(timeout);
          resolve();
        }
      });
      prodProc.stderr.on('data', (chunk) => {
        const msg = String(chunk);
        if (msg.toLowerCase().includes('error')) {
          console.error('[prod stderr]', msg);
        }
      });
    });

    const prodBase = `http://127.0.0.1:${prodPort}`;
    const routes = [
      '/',
      '/upload-resume',
      '/my-skills',
      '/explore-careers',
      '/skill-gap-analysis',
      '/my-roadmap',
      '/dashboard',
    ];
    for (const r of routes) {
      const res = await fetch(`${prodBase}${r}`);
      assert.equal(res.status, 200, `Route ${r} returned ${res.status}`);
      const html = await res.text();
      assert.ok(html.includes('<div id="root"></div>'), `Route ${r} missing root mount`);
      console.log(`   SPA Route ${r} -> HTTP 200`);
    }

    const prodHealth = await fetch(`${prodBase}/api/health`);
    assert.equal(prodHealth.status, 200);
    const prodUpload = await uploadFile(
      prodBase,
      'prod_check.txt',
      Buffer.from('Skills: Python, FastAPI, Docker, PostgreSQL'),
      'text/plain'
    );
    assert.equal(prodUpload.status, 200);
    assert.ok(prodUpload.json.extractedCharacters > 0);
    assert.ok(prodUpload.json.analysis.skillCandidates.length > 0);
    console.log('   Production /api/resume/parse -> HTTP 200 OK');
  } finally {
    if (prodProc.pid) {
      try {
        process.kill(-prodProc.pid, 'SIGKILL');
      } catch {
        prodProc.kill('SIGKILL');
      }
    }
    prodProc.stdout?.destroy();
    prodProc.stderr?.destroy();
  }

  console.log('\nALL LIVE API & PRODUCTION SPA CHECKS PASSED!');
}

run().catch((err) => {
  console.error('LIVE TEST FAILED:', err);
  process.exit(1);
});
