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

  it('header prints bold text with underline', () => {
    display.header('Test Header');
    expect(logSpy).toHaveBeenCalledTimes(3); // newline + text + underline
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
});
