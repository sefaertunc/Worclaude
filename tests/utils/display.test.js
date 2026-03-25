import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as display from '../../src/utils/display.js';

describe('display', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('banner prints version with brand name', () => {
    display.banner('1.2.0');
    expect(logSpy).toHaveBeenCalledTimes(3); // blank + styled line + blank
    const styled = logSpy.mock.calls[1][0];
    expect(styled).toContain('WORCLAUDE');
    expect(styled).toContain('1.2.0');
  });

  it('sectionHeader prints title with bar', () => {
    display.sectionHeader('TEST TITLE');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('TEST TITLE');
  });

  it('divider prints labeled separator', () => {
    display.divider('REVIEW');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('REVIEW');
    expect(output).toContain('───');
  });

  it('success prints with checkmark', () => {
    display.success('done');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('✓');
    expect(output).toContain('done');
  });

  it('error prints with cross', () => {
    display.error('failed');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('✗');
    expect(output).toContain('failed');
  });

  it('info prints with info icon', () => {
    display.info('note');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('ℹ');
    expect(output).toContain('note');
  });

  it('warn prints with warning icon', () => {
    display.warn('caution');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('⚠');
    expect(output).toContain('caution');
  });

  it('newline prints empty line', () => {
    display.newline();
    expect(logSpy).toHaveBeenCalledWith();
  });

  it('barLine prints with vertical bar', () => {
    display.barLine('content');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('content');
  });

  it('badge wraps text with style', () => {
    const result = display.badge('Test', display.badges.opus);
    expect(result).toContain('Test');
  });

  it('renderAgentWithBadges includes agent name', () => {
    const result = display.renderAgentWithBadges('plan-reviewer');
    expect(result).toContain('plan-reviewer');
  });
});
