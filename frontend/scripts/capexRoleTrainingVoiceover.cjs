const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { roleTraining } = require('../e2e/capexRoleTrainingManifest.cjs');

const root = path.resolve(__dirname, '..');
const trainingRoot = path.join(root, 'test-results', 'capex-role-training');

function writeNarration(audioPath, text) {
  const textPath = audioPath.replace(/\.wav$/i, '.txt');
  const scriptPath = audioPath.replace(/\.wav$/i, '.ps1');
  fs.writeFileSync(textPath, text, 'utf8');

  const script = [
    'param($OutputPath, $TextPath)',
    'Add-Type -AssemblyName System.Speech',
    '$Text = Get-Content -LiteralPath $TextPath -Raw',
    '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    '$synth.Rate = -1',
    '$synth.Volume = 100',
    '$synth.SetOutputToWaveFile($OutputPath)',
    '$synth.Speak($Text)',
    '$synth.Dispose()',
  ].join('\n');

  fs.writeFileSync(scriptPath, script, 'utf8');

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

function requestedRoles() {
  const roleArg = process.argv.find((arg) => arg.startsWith('--role='));
  if (!roleArg) return roleTraining;
  const role = roleArg.replace('--role=', '').trim().toLowerCase();
  return roleTraining.filter((item) => item.role.toLowerCase() === role || item.slug === role);
}

function main() {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static did not provide an ffmpeg binary.');
  }

  const roles = requestedRoles();
  if (!roles.length) {
    throw new Error('No matching role training manifest found.');
  }

  const outputs = [];
  for (const role of roles) {
    const roleDir = path.join(trainingRoot, role.role);
    const rawDir = path.join(roleDir, 'raw');
    const audioDir = path.join(roleDir, 'audio');
    fs.mkdirSync(audioDir, { recursive: true });

    for (const useCase of role.useCases) {
      const videoPath = path.join(rawDir, `${useCase.id}.webm`);
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Missing raw training video: ${videoPath}. Run npm run video:capex:training first.`);
      }

      const audioPath = path.join(audioDir, `${useCase.id}.wav`);
      const outputPath = path.join(roleDir, `${useCase.id}.mp4`);
      writeNarration(audioPath, useCase.narration);
      muxVideo(videoPath, audioPath, outputPath);
      outputs.push(outputPath);
    }
  }

  console.log(`Created ${outputs.length} narrated CAPEX role training videos:`);
  for (const output of outputs) console.log(output);
}

main();
