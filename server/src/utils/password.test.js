import assert from 'node:assert/strict';
import test from 'node:test';
import { generateTemporaryPassword } from './password.js';

test('temporary passwords are random, strong and safe to copy', () => {
  const passwords = Array.from({ length: 100 }, () => generateTemporaryPassword());

  assert.equal(new Set(passwords).size, passwords.length);
  passwords.forEach((password) => {
    assert.equal(password.length, 20);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[2-9]/);
    assert.match(password, /[!@#$%&*+\-=?]/);
    assert.doesNotMatch(password, /[\s"'`\\/]/);
  });
});

test('temporary password length is constrained to a secure range', () => {
  assert.equal(generateTemporaryPassword(4).length, 16);
  assert.equal(generateTemporaryPassword(100).length, 64);
});
