const { replaceInFileSync } = require('replace-in-file');

const options = {
  files: 'src/**/*.{jsx,js}',
  from: /blue-(50|100|200|300|400|500|600|700|800|900|950)/g,
  to: 'primary-$1',
};

try {
  const results = replaceInFileSync(options);
  console.log('Replacement results:', results.filter(r => r.hasChanged).length, 'files changed');
}
catch (error) {
  console.error('Error occurred:', error);
}
