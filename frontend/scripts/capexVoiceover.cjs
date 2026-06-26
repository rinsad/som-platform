const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const root = path.resolve(__dirname, '..');
const testResultsDir = path.join(root, 'test-results');
const outputDir = path.join(root, 'test-results', 'capex-narrated');
const audioDir = path.join(outputDir, 'audio');

const roles = [
  {
    role: 'Admin',
    tokens: ['Admin-CAPEX'],
    narration: 'Admin walkthrough. This user opens CAPEX planning, reviews all visible tabs, enters Admin Config, and confirms governance thresholds can be saved.',
  },
  {
    role: 'Project Owner',
    tokens: ['Project-O'],
    narration: 'Project Owner walkthrough. This user opens CAPEX requests, starts a new request, enters the business case, budget holder, estimated value, supplier quote, and submits the request for approval.',
  },
  {
    role: 'Project Engineer',
    tokens: ['Project-E'],
    narration: 'Project Engineer walkthrough. This user opens CAPEX planning, reviews available project tabs, and opens the shared CAPEX request to validate engineering access.',
  },
  {
    role: 'Finance in Business',
    tokens: ['Finance-i'],
    narration: 'Finance in Business walkthrough. This user reviews the CAPEX request and confirms approval or variation actions are available for finance business review.',
  },
  {
    role: 'Finance Manager',
    tokens: ['Finance-M'],
    narration: 'Finance Manager walkthrough. This user opens the CAPEX request and confirms AUC and capitalization controls are available for financial closure.',
  },
  {
    role: 'CFO',
    tokens: ['CFO-CAPEX'],
    narration: 'CFO walkthrough. This user reviews CAPEX request details and confirms financial closure controls for AUC and capitalization are available.',
  },
  {
    role: 'CP Manager',
    tokens: ['CP-Manager'],
    narration: 'CP Manager walkthrough. This user opens the CAPEX request and confirms procurement controls can be reviewed and saved.',
  },
  {
    role: 'CP Lead',
    tokens: ['CP-Lead'],
    narration: 'CP Lead walkthrough. This user opens the CAPEX request and confirms procurement execution controls are available for the purchasing workflow.',
  },
  {
    role: 'Business GM',
    tokens: ['Business--'],
    narration: 'Business GM walkthrough. This user opens the CAPEX request and confirms approval or budget variation actions are available for business governance.',
  },
  {
    role: 'HSSE Focal',
    tokens: ['HSSE-Focal'],
    narration: 'HSSE Focal walkthrough. This user reviews the CAPEX request and confirms HSSE participation in the governance workflow.',
  },
  {
    role: 'Asset Team',
    tokens: ['Asset-Team'],
    narration: 'Asset Team walkthrough. This user opens the CAPEX request and confirms asset capitalization controls are visible for closure.',
  },
  {
    role: 'Internal Audit',
    tokens: ['Internal--'],
    narration: 'Internal Audit walkthrough. This user reviews CAPEX information with read-focused access and confirms restricted creation and procurement actions are not available.',
  },
  {
    role: 'CEO/Board',
    tokens: ['CEO-Board'],
    narration: 'CEO and Board walkthrough. This user opens the Governance tab and reviews the executive control summary for oversight.',
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    if (entry.isFile() && entry.name === 'video.webm') files.push(fullPath);
  }
  return files;
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function newestMatchingVideo(videos, tokens) {
  const matches = videos
    .filter((video) => {
      const dirName = path.basename(path.dirname(video));
      return tokens.every((token) => dirName.includes(token));
    })
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  return matches[0];
}

function writeNarration(audioPath, text) {
  const textPath = audioPath.replace(/\.wav$/i, '.txt');
  fs.writeFileSync(textPath, text, 'utf8');

  const script = `& { ${[
    'param($OutputPath, $TextPath)',
    'Add-Type -AssemblyName System.Speech',
    '$Text = Get-Content -LiteralPath $TextPath -Raw',
    '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    '$synth.Rate = -1',
    '$synth.Volume = 100',
    '$synth.SetOutputToWaveFile($OutputPath)',
    '$synth.Speak($Text)',
    '$synth.Dispose()',
  ].join('; ')} }`;

  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script, audioPath, textPath], {
    stdio: 'pipe',
  });
}

function muxVideo(videoPath, audioPath, outputPath) {
  execFileSync(ffmpegPath, [
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-filter:a', 'apad',
    '-shortest',
    outputPath,
  ], { stdio: 'pipe' });
}

function main() {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static did not provide an ffmpeg binary.');
  }

  fs.mkdirSync(audioDir, { recursive: true });

  const videos = walk(testResultsDir).filter((video) => !video.includes(`${path.sep}capex-narrated${path.sep}`));
  if (!videos.length) {
    throw new Error(`No Playwright videos found under ${testResultsDir}. Run npm run video:capex first.`);
  }

  const outputs = [];
  for (const item of roles) {
    const videoPath = newestMatchingVideo(videos, item.tokens);
    if (!videoPath) {
      throw new Error(`Could not find a video for ${item.role}. Run the full CAPEX video suite first.`);
    }

    const baseName = `${safeName(item.role)}-capex-walkthrough`;
    const audioPath = path.join(audioDir, `${baseName}.wav`);
    const outputPath = path.join(outputDir, `${baseName}.mp4`);

    writeNarration(audioPath, item.narration);
    muxVideo(videoPath, audioPath, outputPath);
    outputs.push(outputPath);
  }

  console.log(`Created ${outputs.length} narrated CAPEX walkthrough videos:`);
  for (const output of outputs) console.log(output);
}

main();
