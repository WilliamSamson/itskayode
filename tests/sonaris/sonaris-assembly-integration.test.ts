import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const page=readFileSync('src/sonaris/components/workspace/integrated-workspace.tsx','utf8');
describe('rover-first architecture',()=>{
 it('keeps the user instrument shell and replaces the architecture charts with the workbench',()=>{expect(page).toContain('bg-[#E5E1D8]');expect(page).toContain('rounded-[44px]');expect(page).toContain('<AssemblyWorkbench');expect(page).not.toContain('Motor load verification');});
});
