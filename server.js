import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const SCREEN_ROUTES = {
  '/': 'screen 1- New Home page/code.html',
  '/home': 'screen 1- New Home page/code.html',
  '/upload-resume': 'Screen 2- Resume upload/code.html',
  '/my-skills': 'Screen 3 - My Skills/code.html',
  '/explore-careers': 'Screen 4- Career Discovery/code.html',
  '/skill-gap-analysis': 'Screen 5 - Skill Gap Analysis/code.html',
  '/my-roadmap': 'Scerrn 6 - My RoadMap/code.html',
  '/dashboard': 'Screen 7 - Student Dashboard/code.html',
};

// Lightweight client-side navigation bridge so wireframe links/buttons route cleanly across all 7 screens
const NAV_BRIDGE_SCRIPT = `
<script>
(function () {
  var hashMap = {
    '#upload-resume': '/upload-resume',
    '#my-skills': '/my-skills',
    '#explore-careers': '/explore-careers',
    '#skill-gap': '/skill-gap-analysis',
    '#my-roadmap': '/my-roadmap'
  };

  var labelMap = {
    'home': '/',
    'upload resume': '/upload-resume',
    'upload my resume': '/upload-resume',
    'upload resume now': '/upload-resume',
    'my skills': '/my-skills',
    'explore careers': '/explore-careers',
    'explore my career matches': '/explore-careers',
    'explore other careers': '/explore-careers',
    'explore all 40+ catalog roles': '/explore-careers',
    'return to explore careers': '/explore-careers',
    'skill gap analysis': '/skill-gap-analysis',
    'view skill gap analysis': '/skill-gap-analysis',
    'view skill gaps': '/skill-gap-analysis',
    'view gap': '/skill-gap-analysis',
    'my roadmap': '/my-roadmap',
    'build my roadmap': '/my-roadmap',
    'student dashboard': '/dashboard',
    'student profile': '/dashboard'
  };

  function normalizeText(el) {
    var clone = el.cloneNode(true);
    clone.querySelectorAll('.material-symbols-outlined').forEach(function (icon) {
      icon.remove();
    });
    return clone.textContent.replace(/[→←↗]/g, '').replace(/\\s+/g, ' ').trim().toLowerCase();
  }

  document.addEventListener('click', function (e) {
    var target = e.target.closest('a, button');
    if (!target) return;

    if (target.id === 'profile-avatar-btn' || target.closest('#student-profile-trigger > button')) {
      e.preventDefault();
      window.location.href = '/dashboard';
      return;
    }

    if (target.tagName === 'A') {
      var href = target.getAttribute('href') || '';
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return;
      }
      if (hashMap[href]) {
        e.preventDefault();
        window.location.href = hashMap[href];
        return;
      }
      if (href.startsWith('#stage')) {
        return;
      }
      var text = normalizeText(target);
      if (text.indexOf('continue with existing coursework profile') !== -1) {
        e.preventDefault();
        window.location.href = '/dashboard';
        return;
      }
      if (labelMap[text]) {
        e.preventDefault();
        window.location.href = labelMap[text];
        return;
      }
      if (href === '#' && target.closest('header')) {
        e.preventDefault();
        window.location.href = '/';
      }
    } else if (target.tagName === 'BUTTON') {
      var btnText = normalizeText(target);
      if (btnText === 'view skill gaps') {
        e.preventDefault();
        window.location.href = '/skill-gap-analysis';
      } else if (btnText === 'select target career') {
        e.preventDefault();
        window.location.href = '/skill-gap-analysis';
      }
    }
  });
})();
</script>
`;

async function serveScreen(res, relativeFilePath) {
  const fullPath = path.join(__dirname, relativeFilePath);
  let html = await fs.readFile(fullPath, 'utf-8');
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${NAV_BRIDGE_SCRIPT}\n</body>`);
  } else {
    html += NAV_BRIDGE_SCRIPT;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

for (const [routePath, filePath] of Object.entries(SCREEN_ROUTES)) {
  app.get(routePath, async (req, res, next) => {
    try {
      await serveScreen(res, filePath);
    } catch (err) {
      next(err);
    }
  });
}

app.use(express.static(__dirname));

app.use((req, res) => {
  res.redirect('/');
});

app.listen(PORT, HOST, () => {
  console.log(`SkillBridge AI wireframes server running at http://${HOST}:${PORT}`);
});
