import assert from 'assert';

const classesList = [
  { id: 'cls_1a', name: 'Class 1-A', code: 'C1A' },
  { id: 'cls_9a', name: 'Class 9-A', code: 'C9A' },
  { id: 'cls_10a', name: 'Class 10-A', code: 'C10A' },
  { id: 'cls_11a', name: 'Class 11-A', code: 'C11A' },
  { id: 'cls_12a', name: 'Class 12-A', code: 'C12A' }
];

function resolveClass(inputName) {
  const normC = (str) => String(str || '').toLowerCase().replace(/section/g, '').replace(/[^a-z0-9]/g, '');
  const targetNorm = normC(inputName);
  const matched = classesList.find(c => {
    const cNameNorm = normC(c.name);
    const cCodeNorm = normC(c.code);
    return cNameNorm === targetNorm ||
      cCodeNorm === targetNorm ||
      (targetNorm.length >= 2 && (cNameNorm.endsWith(targetNorm) || targetNorm.endsWith(cNameNorm))) ||
      c.name?.toLowerCase().trim() === inputName.toLowerCase().trim() ||
      c.code?.toLowerCase().trim() === inputName.toLowerCase().trim();
  });
  return matched ? matched.id : null;
}

// Test cases
assert.strictEqual(resolveClass('Class 10-A'), 'cls_10a');
assert.strictEqual(resolveClass('Class 10 - Section A'), 'cls_10a');
assert.strictEqual(resolveClass('10-A'), 'cls_10a');
assert.strictEqual(resolveClass('10A'), 'cls_10a');
assert.strictEqual(resolveClass('Class 9 - Section A'), 'cls_9a');
assert.strictEqual(resolveClass('Class 1-A'), 'cls_1a');

console.log('PASS: Fuzzy class resolution matches Class 10 - Section A to cls_10a cleanly!');

