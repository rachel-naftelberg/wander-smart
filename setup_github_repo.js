const { execSync } = require('child_process');
const https = require('https');

function getCreds() {
  const input = "protocol=https\nhost=github.com\n\n";
  const output = execSync('git credential fill', { input: input, encoding: 'utf8' });
  const lines = output.split('\n');
  const user = lines.find(l => l.startsWith('username='))?.replace('username=', '').trim();
  const pass = lines.find(l => l.startsWith('password='))?.replace('password=', '').trim();
  return { user, pass };
}

async function request(method, path, data = null, token) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = https.request(`https://api.github.com${path}`, {
      method: method,
      headers: {
        'User-Agent': 'Node-WanderSmart',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('1. Retrieving credentials...');
  const { user, pass } = getCreds();
  console.log('Authenticated as:', user);

  console.log('2. Checking if repository wander-smart already exists on GitHub...');
  const checkRes = await request('GET', `/repos/${user}/wander-smart`, null, pass);

  let repoUrl = '';
  if (checkRes.status === 200) {
    console.log('Repository wander-smart already exists!');
    repoUrl = checkRes.data.clone_url;
  } else {
    console.log('3. Creating new repository on GitHub...');
    const createRes = await request('POST', '/user/repos', {
      name: 'wander-smart',
      description: 'WanderSmart - אפליקציית תכנון טיול וליווי חכם בשטח לוינה בהשראת Wanderlog',
      private: false,
      auto_init: false
    }, pass);

    if (createRes.status !== 201 && createRes.status !== 200) {
      console.error('Failed to create repo:', createRes.status, createRes.data);
      process.exit(1);
    }
    console.log('Repository created successfully:', createRes.data.html_url);
    repoUrl = createRes.data.clone_url;
  }

  console.log('4. Initializing local git repository...');
  execSync('git init', { stdio: 'inherit' });
  execSync('git config user.name "Rachel Naftelberg"', { stdio: 'inherit' });
  execSync('git config user.email "rachel-naftelberg@users.noreply.github.com"', { stdio: 'inherit' });
  execSync('git branch -M main', { stdio: 'inherit' });

  console.log('5. Staging files...');
  execSync('git add .', { stdio: 'inherit' });

  console.log('6. Committing files...');
  try {
    execSync('git commit -m "Initial commit: WanderSmart Vienna travel companion app"', { stdio: 'inherit' });
  } catch (e) {
    console.log('Nothing to commit or already committed.');
  }

  console.log('7. Configuring remote origin...');
  try {
    execSync('git remote remove origin', { stdio: 'pipe' });
  } catch {}
  execSync(`git remote add origin https://github.com/${user}/wander-smart.git`, { stdio: 'inherit' });

  console.log('8. Pushing to GitHub...');
  // Use credential helper automatically
  execSync('git push -u origin main', { stdio: 'inherit' });

  console.log('=======================================================');
  console.log('🎉 SUCCESS! Project uploaded to GitHub:');
  console.log(`🔗 https://github.com/${user}/wander-smart`);
  console.log('=======================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
