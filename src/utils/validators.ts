export interface ValidationResult {
  valid: boolean;
  value: string;
  charCount: number;
  error?: string;
  warning?: string;
}

export interface BatchValidationResult {
  valid: boolean;
  headlines: ValidationResult[];
  descriptions: ValidationResult[];
  error?: string;
  errors: string[];
}

export const HEADLINE_MAX = 30;
export const DESCRIPTION_MAX = 90;
const WARN_THRESHOLD = 2;

function validateLength(text: string, maxChars: number, fieldName: string): ValidationResult {
  const charCount = [...text].length;

  if (charCount === 0) {
    return { valid: false, value: text, charCount: 0, error: `${fieldName} cannot be empty` };
  }

  if (charCount > maxChars) {
    return {
      valid: false,
      value: text,
      charCount,
      error: `${fieldName} exceeds ${maxChars} character limit (${charCount} chars)`,
    };
  }

  const result: ValidationResult = { valid: true, value: text, charCount };

  if (charCount >= maxChars - WARN_THRESHOLD) {
    result.warning = `${charCount}/${maxChars} chars — close to limit`;
  }

  return result;
}

export function validateHeadline(text: string): ValidationResult {
  return validateLength(text, HEADLINE_MAX, 'Headline');
}

export function validateDescription(text: string): ValidationResult {
  return validateLength(text, DESCRIPTION_MAX, 'Description');
}

export function validateRsaBatch(
  headlines: string[],
  descriptions: string[],
): BatchValidationResult {
  const errors: string[] = [];

  if (headlines.length !== 15) {
    errors.push(`Expected 15 headlines, got ${headlines.length}`);
  }
  if (descriptions.length !== 4) {
    errors.push(`Expected 4 descriptions, got ${descriptions.length}`);
  }

  const headlineResults = headlines.map(validateHeadline);
  const descriptionResults = descriptions.map(validateDescription);

  const itemErrors = [
    ...headlineResults.filter((r) => !r.valid).map((r, i) => `Headline ${i + 1}: ${r.error}`),
    ...descriptionResults.filter((r) => !r.valid).map((r, i) => `Description ${i + 1}: ${r.error}`),
  ];

  errors.push(...itemErrors);

  return {
    valid: errors.length === 0,
    headlines: headlineResults,
    descriptions: descriptionResults,
    error: errors.length > 0 ? errors[0] : undefined,
    errors,
  };
}
