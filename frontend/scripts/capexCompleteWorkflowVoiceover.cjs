const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { getRoleTraining } = require('../e2e/capexRoleTrainingManifest.cjs');

const root = path.resolve(__dirname, '..');
const selectedRole = process.env.CAPEX_TRAINING_ROLE || process.argv.find((arg) => arg.startsWith('--role='))?.replace('--role=', '') || 'Project Owner';
const training = getRoleTraining(selectedRole);

if (!training?.completeWorkflows?.length) {
  throw new Error(`No complete workflow configured for ${selectedRole}.`);
}

const roleDir = path.join(root, 'test-results', 'capex-role-training', training.role);
const audioDir = path.join(roleDir, 'audio');

function writeNarration(audioPath, text) {
  const textPath = audioPath.replace(/\.wav$/i, '.txt');
  const scriptPath = audioPath.replace(/\.wav$/i, '.ps1');
  fs.mkdirSync(path.dirname(audioPath), { recursive: true });
  fs.writeFileSync(textPath, text, 'utf8');
  fs.writeFileSync(scriptPath, [
    'param($OutputPath, $TextPath)',
    'Add-Type -AssemblyName System.Speech',
    '$Text = Get-Content -LiteralPath $TextPath -Raw',
    '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    '$synth.Rate = -1',
    '$synth.Volume = 100',
    '$synth.SetOutputToWaveFile($OutputPath)',
    '$synth.Speak($Text)',
    '$synth.Dispose()',
  ].join('\n'), 'utf8');

  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, audioPath, textPath], {
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
  if (!ffmpegPath) throw new Error('ffmpeg-static did not provide an ffmpeg binary.');

  const outputs = [];
  for (const workflow of training.completeWorkflows) {
    const rawPath = path.join(roleDir, 'raw', `${workflow.id}.webm`);
    if (!fs.existsSync(rawPath)) {
      throw new Error(`Missing raw complete workflow video: ${rawPath}`);
    }

    const audioPath = path.join(audioDir, `${workflow.id}.wav`);
    const outputPath = path.join(roleDir, `${workflow.id}.mp4`);
    writeNarration(audioPath, workflow.narration);
    muxVideo(rawPath, audioPath, outputPath);
    outputs.push(outputPath);
  }

  console.log(`Created ${outputs.length} complete CAPEX workflow video(s):`);
  for (const output of outputs) console.log(output);
}

main();
