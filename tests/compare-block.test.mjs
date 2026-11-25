import test from 'node:test';
import assert from 'node:assert/strict';
import { findBlockProblems } from '../dist/markdown-check/find-block-problems.js';
import { FALLBACK_GUIDE } from '../dist/guide/fallback-guide.js';

test('findBlockProblems accepts a valid :::compare block with 2 images', () => {
  const md = [
    ':::compare',
    '![Before](./images/before.png)',
    '![After](./images/after.png)',
    ':::',
  ].join('\n');

  assert.deepEqual(findBlockProblems(md, 1), []);
});

test('findBlockProblems rejects :::compare blocks without exactly 2 images', () => {
  const oneImage = [':::compare', '![Only](./a.png)', ':::'].join('\n');
  const threeImages = [':::compare', '![A](./a.png)', '![B](./b.png)', '![C](./c.png)', ':::'].join('\n');

  const res1 = findBlockProblems(oneImage, 5);
  assert.equal(res1.length, 1);
  assert.equal(res1[0].code, 'invalid-compare-block');
  assert.equal(res1[0].line, 5);

  const res3 = findBlockProblems(threeImages, 10);
  assert.equal(res3.length, 1);
  assert.equal(res3[0].code, 'invalid-compare-block');
  assert.equal(res3[0].line, 10);
});

test('findBlockProblems rejects unclosed :::compare blocks and ignores fenced examples', () => {
  const unclosed = [':::compare', '![A](./a.png)', '![B](./b.png)'].join('\n');
  const res = findBlockProblems(unclosed, 3);
  assert.equal(res.length, 1);
  assert.equal(res[0].code, 'unclosed-compare-block');
  assert.equal(res[0].line, 3);

  const fenced = ['```markdown', ':::compare', '![Only](./a.png)', ':::', '```'].join('\n');
  assert.deepEqual(findBlockProblems(fenced, 1), []);
});

test('fallback guide documents :::compare syntax', () => {
  assert.match(FALLBACK_GUIDE, /:::compare/);
  assert.match(FALLBACK_GUIDE, /Before \/ After/);
});
