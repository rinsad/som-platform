import { describe, expect, test } from 'vitest';
import { fileIdentity, mergeSelectedFiles } from './capexV2Files';

describe('CAPEX v2 staged documents', () => {
  test('appends new files while removing exact duplicates', () => {
    const first = { name: 'scope.pdf', size: 100, lastModified: 1 };
    const duplicate = { name: 'scope.pdf', size: 100, lastModified: 1 };
    const second = { name: 'project.pptx', size: 200, lastModified: 2 };

    expect(mergeSelectedFiles([first], [duplicate, second])).toEqual([first, second]);
    expect(fileIdentity(second)).toBe('project.pptx-200-2');
  });
});

