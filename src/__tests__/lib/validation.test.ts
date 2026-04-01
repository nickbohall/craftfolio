import {
  isValidEmail,
  validateSignIn,
  validateSignUp,
  validatePasswordReset,
  validateProjectDetails,
  getDefaultStashUnit,
  isNeedleType,
  getVisibleFields,
} from '../../lib/validation';

describe('isValidEmail', () => {
  it('accepts standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('accepts email with plus addressing', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('trims whitespace before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects missing TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('rejects spaces in middle', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects double @', () => {
    expect(isValidEmail('user@@example.com')).toBe(false);
  });
});

describe('validateSignIn', () => {
  it('returns null for valid input', () => {
    expect(validateSignIn('user@example.com', 'password123')).toBeNull();
  });

  it('returns error when both fields empty', () => {
    const result = validateSignIn('', '');
    expect(result).not.toBeNull();
    expect(result!.form).toBe('Please fill in all fields.');
  });

  it('returns error when email is empty', () => {
    const result = validateSignIn('', 'password123');
    expect(result).not.toBeNull();
    expect(result!.form).toBe('Please fill in all fields.');
  });

  it('returns error when password is empty', () => {
    const result = validateSignIn('user@example.com', '');
    expect(result).not.toBeNull();
    expect(result!.form).toBe('Please fill in all fields.');
  });

  // Note: sign-in does NOT validate email format — only that fields are non-empty.
  // Email format validation happens server-side for sign-in.
  it('does not validate email format (server-side concern)', () => {
    expect(validateSignIn('not-an-email', 'password123')).toBeNull();
  });
});

describe('validateSignUp', () => {
  it('returns null for valid input', () => {
    expect(validateSignUp('user@example.com', 'password123', 'Hannah')).toBeNull();
  });

  it('returns error when all fields empty', () => {
    const result = validateSignUp('', '', '');
    expect(result!.form).toBe('Please fill in all fields.');
  });

  it('returns error when email is empty', () => {
    const result = validateSignUp('', 'password123', 'Hannah');
    expect(result!.form).toBe('Please fill in all fields.');
  });

  it('returns error when password is empty', () => {
    const result = validateSignUp('user@example.com', '', 'Hannah');
    expect(result!.form).toBe('Please fill in all fields.');
  });

  it('returns error when display name is empty', () => {
    const result = validateSignUp('user@example.com', 'password123', '');
    expect(result!.form).toBe('Please fill in all fields.');
  });

  it('returns email error for invalid email format', () => {
    const result = validateSignUp('not-an-email', 'password123', 'Hannah');
    expect(result!.email).toBe('Please enter a valid email address.');
    expect(result!.form).toBeUndefined();
  });

  it('returns password error for short password', () => {
    const result = validateSignUp('user@example.com', 'short', 'Hannah');
    expect(result!.password).toBe('Password must be at least 8 characters.');
  });

  it('accepts exactly 8 character password', () => {
    expect(validateSignUp('user@example.com', '12345678', 'Hannah')).toBeNull();
  });

  it('rejects 7 character password', () => {
    const result = validateSignUp('user@example.com', '1234567', 'Hannah');
    expect(result!.password).toBeDefined();
  });

  // Validation order: empty check → email format → password length
  it('checks empty fields before email format', () => {
    const result = validateSignUp('bad-email', 'pw', '');
    // Display name empty → should get form error, not email error
    expect(result!.form).toBe('Please fill in all fields.');
  });

  it('checks email format before password length', () => {
    const result = validateSignUp('bad-email', 'short', 'Hannah');
    // Email invalid → should get email error, not password error
    expect(result!.email).toBeDefined();
    expect(result!.password).toBeUndefined();
  });
});

describe('validatePasswordReset', () => {
  it('returns null for valid email', () => {
    expect(validatePasswordReset('user@example.com')).toBeNull();
  });

  it('returns error for empty input', () => {
    expect(validatePasswordReset('')).toBe('Please enter your email address.');
  });

  it('returns error for whitespace-only input', () => {
    expect(validatePasswordReset('   ')).toBe('Please enter your email address.');
  });

  it('returns error for invalid email', () => {
    expect(validatePasswordReset('not-an-email')).toBe('Please enter a valid email address.');
  });

  it('trims whitespace before validating', () => {
    expect(validatePasswordReset('  user@example.com  ')).toBeNull();
  });
});

describe('validateProjectDetails', () => {
  it('returns null for valid title', () => {
    expect(validateProjectDetails('My Scarf')).toBeNull();
  });

  it('returns error for empty title', () => {
    expect(validateProjectDetails('')).toBe('Title is required');
  });

  it('returns error for whitespace-only title', () => {
    expect(validateProjectDetails('   ')).toBe('Title is required');
  });

  it('accepts title with leading/trailing whitespace', () => {
    expect(validateProjectDetails('  My Scarf  ')).toBeNull();
  });
});

describe('getDefaultStashUnit', () => {
  it('returns skeins for yarn', () => {
    expect(getDefaultStashUnit('yarn')).toBe('skeins');
  });

  it('returns skeins for thread/floss', () => {
    expect(getDefaultStashUnit('thread/floss')).toBe('skeins');
  });

  it('returns yards for fabric', () => {
    expect(getDefaultStashUnit('fabric')).toBe('yards');
  });

  it('returns pieces for other', () => {
    expect(getDefaultStashUnit('other')).toBe('pieces');
  });

  it('returns null for needle (needles have no quantity)', () => {
    expect(getDefaultStashUnit('needle')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getDefaultStashUnit(null)).toBeNull();
  });
});

describe('isNeedleType', () => {
  it('returns true for needle', () => {
    expect(isNeedleType('needle')).toBe(true);
  });

  it('returns false for yarn', () => {
    expect(isNeedleType('yarn')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNeedleType(null)).toBe(false);
  });
});

describe('getVisibleFields', () => {
  it('returns yarn-specific fields', () => {
    const fields = getVisibleFields('yarn');
    expect(fields).toContain('brand');
    expect(fields).toContain('yarn_weight');
    expect(fields).toContain('dye_lot');
    expect(fields).toContain('fiber_content');
    expect(fields).toContain('yardage_per_skein');
    expect(fields).not.toContain('needle_type');
    expect(fields).not.toContain('notes');
  });

  it('returns thread/floss fields', () => {
    const fields = getVisibleFields('thread/floss');
    expect(fields).toContain('brand');
    expect(fields).toContain('color_code');
    expect(fields).toContain('notes');
    expect(fields).not.toContain('yarn_weight');
    expect(fields).not.toContain('dye_lot');
  });

  it('returns needle fields', () => {
    const fields = getVisibleFields('needle');
    expect(fields).toContain('needle_type');
    expect(fields).toContain('needle_size_mm');
    expect(fields).toContain('needle_material');
    expect(fields).toContain('cable_length_inches');
    expect(fields).not.toContain('brand');
    expect(fields).not.toContain('yarn_weight');
  });

  it('returns fabric fields', () => {
    const fields = getVisibleFields('fabric');
    expect(fields).toContain('brand');
    expect(fields).toContain('fiber_content');
    expect(fields).toContain('notes');
    expect(fields).not.toContain('needle_type');
    expect(fields).not.toContain('yarn_weight');
  });

  it('returns minimal fields for other', () => {
    const fields = getVisibleFields('other');
    expect(fields).toContain('brand');
    expect(fields).toContain('color_name');
    expect(fields).toContain('notes');
    expect(fields).toHaveLength(3);
  });

  it('returns empty array for null', () => {
    expect(getVisibleFields(null)).toEqual([]);
  });
});
