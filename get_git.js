const fs = require('fs');
const { execSync } = require('child_process');

try {
  const output = execSync('git log -p -n 3 scraper-service/index.js', { encoding: 'utf-8' });
  fs.writeFileSync('git_output.txt', output);
  console.log('Successfully wrote git_output.txt');
} catch (error) {
  fs.writeFileSync('git_output.txt', 'Error: ' + error.message);
}
