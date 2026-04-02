export type SignInErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export type SignUpErrors = {
  email?: string;
  password?: string;
  displayName?: string;
  form?: string;
};

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validateSignIn(email: string, password: string): SignInErrors | null {
  if (!email && !password) return { form: 'Please fill in all fields.' };
  if (!email) return { form: 'Please fill in all fields.' };
  if (!password) return { form: 'Please fill in all fields.' };
  return null;
}

export function validateSignUp(
  email: string,
  password: string,
  displayName: string,
): SignUpErrors | null {
  if (!email || !password || !displayName) {
    return { form: 'Please fill in all fields.' };
  }

  if (!isValidEmail(email)) {
    return { email: 'Please enter a valid email address.' };
  }

  if (password.length < 8) {
    return { password: 'Password must be at least 8 characters.' };
  }

  return null;
}

export function validatePasswordReset(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Please enter your email address.';
  if (!isValidEmail(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export function validateProjectDetails(title: string): string | null {
  if (!title.trim()) return 'Title is required';
  return null;
}

export type MaterialType = 'yarn' | 'thread/floss' | 'needle' | 'fabric' | 'polymer clay' | 'other';

export function getDefaultStashUnit(type: MaterialType | null): string | null {
  switch (type) {
    case 'yarn': return 'skeins';
    case 'thread/floss': return 'skeins';
    case 'fabric': return 'yards';
    case 'polymer clay': return 'pieces';
    case 'other': return 'pieces';
    case 'needle': return null;
    default: return null;
  }
}

export function isNeedleType(type: MaterialType | null): boolean {
  return type === 'needle';
}

/** Fields that should be visible for each material type */
export function getVisibleFields(type: MaterialType | null): string[] {
  switch (type) {
    case 'yarn':
      return ['brand', 'name', 'color_name', 'color_code', 'dye_lot', 'fiber_content', 'yarn_weight', 'yardage_per_skein', 'weight_per_skein_grams'];
    case 'thread/floss':
      return ['brand', 'color_name', 'color_code', 'fiber_content', 'notes'];
    case 'needle':
      return ['needle_type', 'needle_size_mm', 'needle_size_us', 'needle_material', 'cable_length_inches'];
    case 'fabric':
      return ['brand', 'color_name', 'fiber_content', 'notes'];
    case 'polymer clay':
      return ['brand', 'color_name', 'notes'];
    case 'other':
      return ['brand', 'color_name', 'notes'];
    default:
      return [];
  }
}
