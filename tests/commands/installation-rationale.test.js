import { describe, it, expect } from 'vitest';
import { buildInstallationRationale } from '../../src/commands/init.js';

describe('buildInstallationRationale', () => {
  it('reports a clean auto-selection when the user accepted all recommendations and added nothing', () => {
    const result = buildInstallationRationale({
      projectTypes: ['CLI tool'],
      preSelectedCategories: ['quality', 'documentation'],
      selectedCategories: ['quality', 'documentation'],
      additionalCategories: [],
    });
    expect(result.rationale).toBe("Auto-selected from project type(s) 'CLI tool'.");
    expect(result.selectedCategories).toEqual(['quality', 'documentation']);
    expect(result.userDecisions).toEqual([
      'Accepted auto-recommended categories from project type(s) CLI tool: quality, documentation.',
    ]);
  });

  it('explains removals when the user rejected an auto-recommendation', () => {
    const result = buildInstallationRationale({
      projectTypes: ['CLI tool'],
      preSelectedCategories: ['quality', 'documentation'],
      selectedCategories: ['quality'],
      additionalCategories: [],
    });
    expect(result.rationale).toContain('Accepted auto-recommended');
    expect(result.rationale).toContain('Removed auto-recommended categories: documentation.');
  });

  it('explains additions when the user picked categories beyond the recommendations', () => {
    const result = buildInstallationRationale({
      projectTypes: ['CLI tool'],
      preSelectedCategories: ['quality'],
      selectedCategories: ['quality', 'frontend'],
      additionalCategories: [],
    });
    expect(result.rationale).toContain(
      'Added categories beyond the project-type recommendations: frontend.'
    );
  });

  it('records the second-prompt opt-ins separately', () => {
    const result = buildInstallationRationale({
      projectTypes: ['Backend / API'],
      preSelectedCategories: ['backend'],
      selectedCategories: ['backend'],
      additionalCategories: ['data'],
    });
    expect(result.rationale).toContain('Opted into extra categories at the second prompt: data.');
    expect(result.selectedCategories).toEqual(['backend', 'data']);
  });

  it('reports "no optional categories selected" when the user declined every prompt', () => {
    const result = buildInstallationRationale({
      projectTypes: ['Other / None'],
      preSelectedCategories: [],
      selectedCategories: [],
      additionalCategories: [],
    });
    expect(result.rationale).toBe('No optional categories selected.');
    expect(result.userDecisions).toEqual([]);
  });

  it('handles missing fields gracefully (no projectTypes, no categories)', () => {
    const result = buildInstallationRationale({});
    expect(result.projectTypes).toEqual([]);
    expect(result.selectedCategories).toEqual([]);
    expect(result.rationale).toBe('No optional categories selected.');
  });
});
