export const KNOWN_COMPONENTS: string[];

export interface MdxLintError {
  kind: 'frontmatter' | 'syntax' | 'unknown-component';
  message: string;
  line?: number;
  column?: number;
  raw?: string;
}

export interface MdxLintResult {
  ok: boolean;
  errors: MdxLintError[];
  frontmatterLines: number;
}

export function lintMdx(fullContent: string): Promise<MdxLintResult>;
